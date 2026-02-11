/**
 * 项目管理器（前端）
 * 负责项目创建、查询、展示
 */

function getDefaultApiUrl() {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost && window.location.port !== '3000') {
    return 'http://127.0.0.1:3000';
  }
  return window.location.origin;
}

// 创建日志实例
var logger = window.createLogger ? window.createLogger('ProjectManager') : console;

class ProjectManager {
  constructor() {
    this.projects = [];
    this.projectsLoaded = false;
    this.projectsLoadPromise = null;
    this.currentProject = null;
    this.currentProjectId = null;
    this.memberModalProjectId = null;
    this.currentStageId = null;
    this.stageTabState = {};
    this.stageArtifactState = {};
    this.stageDeliverableSelection = {};
    this.stageDeliverableSelectionByProject = this.loadStageDeliverableSelectionStore();
    this.artifactPollingTimer = null;
    this.artifactPollingProjectId = null;
    this.artifactPollingInFlight = false;
    this.stageProgressTracker = {};
    this.agentMarket = [];
    this.agentMarketCategory = null;
    this.cachedHiredAgents = [];
    this.hiredAgentsFetchedAt = 0;
    this.hiredAgentsPromise = null;
    this.apiUrl = window.appState?.settings?.apiUrl || getDefaultApiUrl();
    this.storageManager = window.storageManager;
    this.stageDetailPanel = null; // 阶段详情面板
    this.stageDetailOverlay = null; // 遮罩层
    this.artifactTypeDefs = {
      prd: { name: '产品需求文档', icon: '📋' },
      'user-story': { name: '用户故事', icon: '👤' },
      'feature-list': { name: '功能清单', icon: '📝' },
      design: { name: '设计稿', icon: '🎨' },
      'design-spec': { name: '设计规范', icon: '📐' },
      prototype: { name: '交互原型', icon: '🖼️' },
      code: { name: '代码', icon: '💻' },
      'frontend-code': { name: '前端源代码', icon: '💻' },
      'backend-code': { name: '后端源代码', icon: '🖥️' },
      'component-lib': { name: '组件库', icon: '🧩' },
      'api-doc': { name: 'API文档', icon: '📡' },
      'test-report': { name: '测试报告', icon: '📊' },
      'deployment-guide': { name: '部署指南', icon: '🚀' },
      document: { name: '文档', icon: '📄' },
      report: { name: '报告', icon: '📈' },
      plan: { name: '计划', icon: '📝' },
      'frontend-doc': { name: '前端开发文档', icon: '🧩' },
      'backend-doc': { name: '后端开发文档', icon: '🧱' },
      'strategy-doc': { name: '战略设计文档', icon: '🎯' },
      'research-analysis-doc': { name: '产品研究分析报告', icon: '🔎' },
      'ui-design': { name: 'UI设计方案', icon: '🎨' },
      'architecture-doc': { name: '系统架构设计', icon: '🏗️' },
      'marketing-plan': { name: '运营推广方案', icon: '📈' },
      'deploy-doc': { name: '部署文档', icon: '🚀' },
      'api-spec': { name: 'API接口规范', icon: '📡' },
      'tech-stack': { name: '技术栈选型', icon: '🧩' },
      'core-prompt-design': { name: '核心引导逻辑Prompt设计', icon: '🧠' },
      'growth-strategy': { name: '增长策略', icon: '📈' },
      'analytics-report': { name: '数据分析报告', icon: '📊' },
      'env-config': { name: '环境配置', icon: '🧩' },
      'release-notes': { name: '发布说明', icon: '📝' },
      'bug-list': { name: '缺陷清单', icon: '🐞' },
      'performance-report': { name: '性能报告', icon: '📊' },
      preview: { name: '可交互预览', icon: '🖥️' },
      'ui-preview': { name: 'UI预览', icon: '🖼️' },
      image: { name: '图片', icon: '🖼️' }
    };
  }

  getAuthToken() {
    return window.getAuthToken ? window.getAuthToken() : null;
  }

  buildAuthHeaders(extra = {}) {
    const token = this.getAuthToken();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra
    };
  }

  async fetchWithAuth(url, options = {}, retry = true) {
    if (window.requireAuth) {
      const ok = await window.requireAuth({ redirect: false, prompt: false });
      if (!ok) {
        throw new Error('未提供访问令牌');
      }
    }
    if (window.apiClient?.ensureFreshToken) {
      await window.apiClient.ensureFreshToken();
    }
    const headers = this.buildAuthHeaders(options.headers || {});
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 && retry && window.apiClient?.refreshAccessToken) {
      const refreshed = await window.apiClient.refreshAccessToken();
      if (refreshed) {
        return this.fetchWithAuth(url, options, false);
      }
    }
    return response;
  }

  loadStageDeliverableSelectionStore() {
    try {
      const raw = localStorage.getItem('tc_stage_deliverables_v1');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  persistStageDeliverableSelectionStore() {
    try {
      localStorage.setItem(
        'tc_stage_deliverables_v1',
        JSON.stringify(this.stageDeliverableSelectionByProject || {})
      );
    } catch (error) {
      // ignore storage errors
    }
  }

  /**
   * 规范化 ideaId：尝试转换为数字，如果失败则保持字符串
   * @param {*} value - 原始值
   * @returns {Number|String|null} 规范化后的ID（优先数字）
   */
  normalizeIdeaId(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    // 尝试转换为数字（因为 generateChatId 生成的是数字）
    const strValue = String(value).trim();
    if (strValue === '') {
      return null;
    }
    const numValue = Number(strValue);
    // 如果是有效数字且不是 NaN，返回数字类型
    if (!isNaN(numValue)) {
      return numValue;
    }
    // 否则返回字符串
    return strValue;
  }

  /**
   * 规范化 ideaId 用于比较：统一转换为字符串
   * @param {*} value - 原始值
   * @returns {String} 规范化后的字符串ID
   */
  normalizeIdeaIdForCompare(value) {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  normalizeStageIdForWorkflow(stageId) {
    if (!stageId) return stageId;
    if (window.workflowExecutor?.normalizeStageId) {
      return window.workflowExecutor.normalizeStageId(stageId);
    }
    const normalized = String(stageId).trim();
    const aliases = {
      'strategy-validation': 'strategy',
      'strategy-review': 'strategy',
      'strategy-plan': 'strategy',
      'product-definition': 'requirement',
      'product-requirement': 'requirement',
      requirements: 'requirement',
      'ux-design': 'design',
      'ui-design': 'design',
      'product-design': 'design',
      'experience-design': 'design',
      'user-experience-design': 'design',
      'prototype-design': 'design',
      'architecture-design': 'architecture',
      'tech-architecture': 'architecture',
      'system-architecture': 'architecture',
      implementation: 'development',
      dev: 'development',
      qa: 'testing',
      test: 'testing',
      launch: 'deployment',
      release: 'deployment',
      operation: 'operation',
      ops: 'operation'
    };
    return aliases[normalized] || normalized;
  }

  resolveCatalogStageIdByAgents(agentIds = []) {
    const agents = Array.isArray(agentIds) ? agentIds : [];
    if (agents.includes('ui-ux-designer')) return 'design';
    if (agents.includes('tech-lead')) return 'architecture';
    if (agents.includes('frontend-developer') || agents.includes('backend-developer'))
      return 'development';
    if (agents.includes('qa-engineer')) return 'testing';
    if (agents.includes('devops')) return 'deployment';
    if (agents.includes('marketing') || agents.includes('operations')) return 'operation';
    if (agents.includes('strategy-design')) return 'strategy';
    if (agents.includes('product-manager')) return 'requirement';
    return null;
  }

  async hydrateProjectStageOutputs(project) {
    return (await window.projectManagerSetup?.hydrateProjectStageOutputs?.(this, project)) || project;
  }

  /**
   * 初始化：加载所有项目
   */
  async init() {
    return window.projectManagerSetup?.init?.(this);
  }

  /**
   * 加载所有项目（从本地存储）
   */
  async loadProjects(options = {}) {
    return (await window.projectManagerSetup?.loadProjects?.(this, options)) || this.projects;
  }

  buildKnowledgeFromArtifacts(projectId, artifacts) {
    return window.projectManagerSetup?.buildKnowledgeFromArtifacts?.(this, projectId, artifacts) || [];
  }

  getValidAgentIds() {
    return (
      window.projectManagerSetup?.getValidAgentIds?.(this) ||
      new Set(['agent_001', 'agent_002', 'agent_003', 'agent_004', 'agent_005', 'agent_006'])
    );
  }

  getUserId() {
    return window.projectManagerSetup?.getUserId?.(this) || `guest_${Date.now()}`;
  }

  async getWorkflowCatalog(category = 'product-development') {
    return window.projectManagerSetup?.getWorkflowCatalog?.(this, category);
  }

  getWorkflowCategoryLabel() {
    return window.projectManagerSetup?.getWorkflowCategoryLabel?.(this) || '统一产品开发';
  }

  patchWorkflowArtifacts(workflow, templateWorkflow) {
    return (
      window.projectManagerSync?.patchWorkflowArtifacts?.(this, workflow, templateWorkflow) ||
      workflow
    );
  }

  /**
   * 创建项目（从创意）
   * @param {String} ideaId - 创意ID（对话ID）
   * @param {String} name - 项目名称
   * @returns {Promise<Object>} 项目对象
   */
  async createProject(ideaId, name) {
    return window.projectManagerData?.createProject?.(this, ideaId, name);
  }

  /**
   * 获取项目详情
   * @param {String} projectId - 项目ID
   * @returns {Promise<Object>} 项目对象
   */
  async getProject(projectId, options = {}) {
    return window.projectManagerData?.getProject?.(this, projectId, options);
  }

  mergeExecutionState(remoteProject, localProject) {
    return (
      window.projectManagerSync?.mergeExecutionState?.(this, remoteProject, localProject) ||
      remoteProject
    );
  }

  async ensureProjectWorkflow(project) {
    return (await window.projectManagerSync?.ensureProjectWorkflow?.(this, project)) || project;
  }

  /**
   * 根据创意ID获取项目
   * @param {String} ideaId - 创意ID
   * @returns {Promise<Object|null>} 项目对象
   */
  async getProjectByIdeaId(ideaId) {
    return window.projectManagerData?.getProjectByIdeaId?.(this, ideaId);
  }

  /**
   * 更新项目
   * @param {String} projectId - 项目ID
   * @param {Object} updates - 更新内容
   */
  async updateProject(projectId, updates, options = {}) {
    return window.projectManagerData?.updateProject?.(this, projectId, updates, options);
  }

  /**
   * 删除项目
   * @param {String} projectId - 项目ID
   */
  async deleteProject(projectId) {
    return window.projectManagerProjectActions?.deleteProject?.(this, projectId);
  }

  confirmDeleteCurrentProject() {
    return window.projectManagerProjectActions?.confirmDeleteCurrentProject?.(this);
  }

  editCurrentProjectName() {
    return window.projectManagerProjectActions?.editCurrentProjectName?.(this);
  }

  openIdeaChat(chatId) {
    return window.projectManagerProjectActions?.openIdeaChat?.(this, chatId);
  }

  /**
   * 渲染项目列表
   * @param {String} containerId - 容器元素ID
   */
  renderProjectList(containerId) {
    return window.projectManagerProjectList?.renderProjectList?.(this, containerId);
  }

  /**
   * 渲染单个项目卡片
   * @param {Object} project - 项目对象
   * @returns {String} HTML字符串
   */
  renderProjectCard(project) {
    return window.projectManagerProjectList?.renderProjectCard?.(this, project) || '';
  }

  /**
   * 计算工作流进度
   * @param {Object} workflow - 工作流对象
   * @returns {Number} 进度百分比
   */
  calculateWorkflowProgress(workflow) {
    return window.projectManagerUiUtils?.calculateWorkflowProgress?.(this, workflow) || 0;
  }

  /**
   * 格式化时间
   * @param {Number} timestamp - 时间戳
   * @returns {String} 相对时间
   */
  formatTimeAgo(timestamp) {
    return window.projectManagerCoreUtils?.formatTimeAgo?.(this, timestamp) || '刚刚';
  }

  /**
   * HTML转义
   * @param {String} text - 文本
   * @returns {String} 转义后的文本
   */
  escapeHtml(text) {
    return window.projectManagerCoreUtils?.escapeHtml?.(this, text) || '';
  }

  mergeArtifacts(existing = [], incoming = []) {
    return window.projectManagerCoreUtils?.mergeArtifacts?.(this, existing, incoming) || [];
  }

  startArtifactPolling(projectId) {
    return window.projectManagerSync?.startArtifactPolling?.(this, projectId);
  }

  stopArtifactPolling() {
    return window.projectManagerSync?.stopArtifactPolling?.(this);
  }

  async pollProjectArtifacts() {
    return window.projectManagerSync?.pollProjectArtifacts?.(this);
  }

  /**
   * 刷新项目面板
   * @param {Object} project - 项目对象
   */
  refreshProjectPanel(project) {
    return window.projectManagerPanelLifecycle?.refreshProjectPanel?.(this, project);
  }

  /**
   * 更新项目选中状态
   * @param {String|null} projectId - 项目ID
   */
  updateProjectSelection(projectId) {
    return window.projectManagerPanelLifecycle?.updateProjectSelection?.(this, projectId);
  }

  /**
   * 显示项目右侧面板
   * @param {Object} project - 项目对象
   */
  renderProjectPanel(project) {
    return window.projectManagerPanelRenderer?.renderProjectPanel?.call(this, project);
  }

  normalizeExecutionState(project) {
    return window.projectManagerSync?.normalizeExecutionState?.(this, project) || project;
  }

  async openCollaborationMode(projectId) {
    return window.projectManagerEntrypoints?.openCollaborationMode?.(this, projectId);
  }

  openProjectKnowledgePanel(projectId = null) {
    return window.projectManagerEntrypoints?.openProjectKnowledgePanel?.(this, projectId);
  }

  switchStage(stageId) {
    return window.projectManagerUiUtils?.switchStage?.(this, stageId);
  }

  renderStageContent(project, stageId) {
    return window.projectManagerPanelRenderer?.renderStageContent?.call(this, project, stageId);
  }

  renderStageAction(project, stage) {
    return window.projectManagerPanelRenderer?.renderStageAction?.call(this, project, stage) || '';
  }

  renderHumanInLoopPanel(stage) {
    return '';
  }

  getStageStatusLabel(status) {
    return window.projectManagerStageUtils?.getStageStatusLabel?.(this, status) || status;
  }

  /**
   * 计算阶段进度
   * @param {Object} stage - 阶段对象
   * @returns {number} 进度百分比 (0-100)
   */
  calculateStageProgress(stage) {
    return window.projectManagerStageUtils?.calculateStageProgress?.(this, stage) || 0;
  }

  /**
   * 获取Agent定义
   * @param {string} agentType - Agent类型ID
   * @returns {Object|null} Agent定义对象
   */
  getAgentDefinition(agentType) {
    return window.projectManagerStageUtils?.getAgentDefinition?.(this, agentType) || null;
  }

  /**
   * 获取交付物类型定义
   * @param {string} artifactType - 交付物类型
   * @returns {Object|null} 交付物类型定义
   */
  getArtifactTypeDefinition(artifactType) {
    return (
      window.projectManagerStageUtils?.getArtifactTypeDefinition?.(this, artifactType) || {
        name: artifactType,
        icon: '📄'
      }
    );
  }

  normalizeArtifactTypeId(value) {
    return window.projectManagerStageUtils?.normalizeArtifactTypeId?.(this, value) || '';
  }

  getExpectedDeliverables(stage, definition) {
    return window.projectManagerDeliverables?.getExpectedDeliverables?.(this, stage, definition) || [];
  }

  resolveSelectedArtifactTypes(stage, expectedDeliverables = [], selectedIds = []) {
    return (
      window.projectManagerDeliverables?.resolveSelectedArtifactTypes?.(
        this,
        stage,
        expectedDeliverables,
        selectedIds
      ) || []
    );
  }

  normalizeDeliverableKey(value) {
    return window.projectManagerDeliverables?.normalizeDeliverableKey?.(value) || '';
  }

  findArtifactForDeliverable(artifacts = [], deliverable = {}) {
    return (
      window.projectManagerDeliverables?.findArtifactForDeliverable?.(this, artifacts, deliverable) ||
      null
    );
  }

  getDeliverableStatusItems(stage, expectedDeliverables = [], selectedDeliverables = []) {
    return (
      window.projectManagerDeliverables?.getDeliverableStatusItems?.(
        this,
        stage,
        expectedDeliverables,
        selectedDeliverables
      ) || []
    );
  }

  getDeliverableProgressSummary(stage, expectedDeliverables = [], selectedDeliverables = []) {
    return (
      window.projectManagerDeliverables?.getDeliverableProgressSummary?.(
        this,
        stage,
        expectedDeliverables,
        selectedDeliverables
      ) || {
        items: [],
        selectedItems: [],
        selectedCount: 0,
        generatedCount: 0,
        generatingCount: 0,
        totalCount: 0
      }
    );
  }

  renderDeliverableStatusPanel(stage, expectedDeliverables, selectedDeliverables, projectId) {
    return (
      window.projectManagerDeliverables?.renderDeliverableStatusPanel?.(
        this,
        stage,
        expectedDeliverables,
        selectedDeliverables,
        projectId
      ) || ''
    );
  }

  async generateAdditionalDeliverables(projectId, stageId) {
    return window.projectManagerDeliverables?.generateAdditionalDeliverables?.(this, projectId, stageId);
  }

  async regenerateStageDeliverable(projectId, stageId, artifactId) {
    return window.projectManagerDeliverables?.regenerateStageDeliverable?.(
      this,
      projectId,
      stageId,
      artifactId
    );
  }

  async retryStageDeliverable(projectId, stageId, deliverableType) {
    return window.projectManagerDeliverables?.retryStageDeliverable?.(
      this,
      projectId,
      stageId,
      deliverableType
    );
  }

  getMissingDeliverables(stage, definition) {
    return window.projectManagerDeliverables?.getMissingDeliverables?.(this, stage, definition) || [];
  }

  getMissingSelectedDeliverables(stage, definition, selectedIds = []) {
    return (
      window.projectManagerDeliverables?.getMissingSelectedDeliverables?.(
        this,
        stage,
        definition,
        selectedIds
      ) || []
    );
  }

  getMissingDeliverablesFromExpected(stage, expected = []) {
    return (
      window.projectManagerDeliverables?.getMissingDeliverablesFromExpected?.(this, stage, expected) ||
      []
    );
  }

  getMissingDeliverablesWithReason(stage, expected = [], selectedIds = []) {
    return (
      window.projectManagerDeliverables?.getMissingDeliverablesWithReason?.(
        this,
        stage,
        expected,
        selectedIds
      ) || []
    );
  }

  hasGeneratedPrd(project) {
    return Boolean(window.projectManagerDeliverables?.hasGeneratedPrd?.(this, project));
  }

  validateStrategyDocDependency(project, selectedArtifactTypes = []) {
    return Boolean(
      window.projectManagerDeliverables?.validateStrategyDocDependency?.(
        this,
        project,
        selectedArtifactTypes
      )
    );
  }

  getStageSelectedDeliverables(stageId, expectedDeliverables) {
    return (
      window.projectManagerDeliverables?.getStageSelectedDeliverables?.(
        this,
        stageId,
        expectedDeliverables
      ) || []
    );
  }

  toggleStageDeliverable(stageId, encodedId, checked) {
    return window.projectManagerDeliverables?.toggleStageDeliverable?.(this, stageId, encodedId, checked);
  }

  async startStageWithSelection(projectId, stageId, reopen = false) {
    return window.projectManagerDeliverables?.startStageWithSelection?.(
      this,
      projectId,
      stageId,
      reopen
    );
  }

  /**
   * 获取交付物图标
   * @param {String} artifactType - 交付物类型
   * @returns {String} 图标emoji
   */
  getArtifactIcon(artifactType) {
    const def = this.getArtifactTypeDefinition(artifactType);
    return def.icon;
  }

  /**
   * 渲染横向步骤条
   * @param {Array} stages - 阶段数组
   * @param {String} selectedStageId - 当前选中的阶段ID
   * @returns {String} HTML字符串
   */
  renderWorkflowSteps(stages, selectedStageId) {
    return window.projectManagerPanelRenderer?.renderWorkflowSteps?.call(this, stages, selectedStageId) || '';
  }

  /**
   * 渲染阶段详情展开区域
   * @param {Object} project - 项目对象
   * @param {Object} stage - 阶段对象
   * @returns {String} HTML字符串
   */
  renderStageDetailSection(project, stage) {
    return window.projectManagerPanelRenderer?.renderStageDetailSection?.call(this, project, stage) || '';
  }

  /**
   * 选择阶段（切换展开的阶段详情）
   * @param {String} stageId - 阶段ID
   */
  selectStage(stageId) {
    return window.projectManagerUiUtils?.selectStage?.(this, stageId);
  }

  /**
   * 查看所有交付物（占位方法）
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   */
  viewAllArtifacts(projectId, stageId) {
    return window.projectManagerUiUtils?.viewAllArtifacts?.(this, projectId, stageId);
  }

  switchDeliverableTab(stageId, tab) {
    return window.projectManagerArtifactsView?.switchDeliverableTab?.(this, stageId, tab);
  }

  selectArtifact(stageId, artifactId) {
    return window.projectManagerArtifactsView?.selectArtifact?.(this, stageId, artifactId);
  }

  renderDeliverableContent(stageId, artifact, tab) {
    return window.projectManagerArtifactsView?.renderDeliverableContent?.(
      this,
      stageId,
      artifact,
      tab
    );
  }

  getArtifactTypeLabel(artifact) {
    return window.projectManagerArtifactsView?.getArtifactTypeLabel?.(this, artifact) || '文档';
  }

  renderStageArtifacts(stage, projectId, displayArtifacts) {
    return (
      window.projectManagerArtifactsView?.renderStageArtifacts?.(
        this,
        stage,
        projectId,
        displayArtifacts
      ) || ''
    );
  }

  getDocArtifacts(stage) {
    return window.projectManagerArtifactsView?.getDocArtifacts?.(this, stage) || [];
  }

  getDisplayArtifacts(stage) {
    return window.projectManagerArtifactsView?.getDisplayArtifacts?.(this, stage) || [];
  }

  async openKnowledgeFromArtifact(projectId, artifactId) {
    return window.projectManagerArtifactsView?.openKnowledgeFromArtifact?.(
      this,
      projectId,
      artifactId
    );
  }

  confirmStage(stageId) {
    return window.projectManagerUiUtils?.confirmStage?.(this, stageId);
  }

  requestStageRevision(stageId) {
    return window.projectManagerUiUtils?.requestStageRevision?.(this, stageId);
  }

  addStageNote(stageId) {
    return window.projectManagerUiUtils?.addStageNote?.(this, stageId);
  }

  extractHtmlFromContent(content = '') {
    return window.projectManagerPanelLifecycle?.extractHtmlFromContent?.(this, content) || '';
  }

  findPreviewArtifact(project) {
    return window.projectManagerPanelLifecycle?.findPreviewArtifact?.(this, project) || null;
  }

  async buildPreviewArtifact(project) {
    return (await window.projectManagerPanelLifecycle?.buildPreviewArtifact?.(this, project)) || null;
  }

  async openPreviewEntry(projectId) {
    return window.projectManagerPanelLifecycle?.openPreviewEntry?.(this, projectId);
  }

  async openPreviewPanel(projectId, artifactId = null) {
    return window.projectManagerPanelLifecycle?.openPreviewPanel?.(this, projectId, artifactId);
  }

  showStageArtifactsModal(projectId, stageId) {
    return window.projectManagerPanelLifecycle?.showStageArtifactsModal?.(this, projectId, stageId);
  }

  /**
   * 关闭项目右侧面板
   */
  closeProjectPanel() {
    return window.projectManagerPanelLifecycle?.closeProjectPanel?.(this);
  }

  /**
   * 渲染项目成员（右侧面板）
   * @param {Object} project - 项目对象
   */
  async renderProjectMembersPanel(project) {
    return window.projectManagerPanelContent?.renderProjectMembersPanel?.(this, project);
  }

  /**
   * 渲染创意列表（右侧面板）
   * @param {Object} project - 项目对象
   */
  async renderProjectIdeasPanel(project) {
    return window.projectManagerPanelContent?.renderProjectIdeasPanel?.(this, project);
  }

  /**
   * 渲染知识库摘要（右侧面板）
   * @param {Object} project - 项目对象
   */
  async renderProjectKnowledgePanel(project) {
    return window.projectManagerPanelContent?.renderProjectKnowledgePanel?.(this, project);
  }

  async getReportsByChatId(chatId) {
    return (await window.projectManagerPanelContent?.getReportsByChatId?.(this, chatId)) || {};
  }

  async viewIdeaReport(chatId, type) {
    return window.projectManagerReportPreview?.viewIdeaReport?.(this, chatId, type);
  }

  /**
   * 显示成员管理弹窗
   * @param {String} projectId - 项目ID
   */
  async showMemberModal(projectId) {
    return window.projectManagerMembers?.showMemberModal?.(this, projectId);
  }

  switchMemberModalTab(tab) {
    return window.projectManagerMembers?.switchMemberModalTab?.(this, tab);
  }

  async renderMemberMarket() {
    return window.projectManagerMembers?.renderMemberMarket?.(this);
  }

  buildFallbackAgentFromCatalog(catalog, agentId, project = null) {
    return window.projectManagerMembers?.buildFallbackAgentFromCatalog?.(
      this,
      catalog,
      agentId,
      project
    );
  }

  getRecommendedAgentsFromProjectWorkflow(project, stageId) {
    return window.projectManagerMembers?.getRecommendedAgentsFromProjectWorkflow?.(
      this,
      project,
      stageId
    );
  }

  async renderMemberHired() {
    return window.projectManagerMembers?.renderMemberHired?.(this);
  }

  async hireAgentToProject(projectId, agentId) {
    return window.projectManagerMembers?.hireAgentToProject?.(this, projectId, agentId);
  }

  async fireAgentFromProject(projectId, agentId) {
    return window.projectManagerMembers?.fireAgentFromProject?.(this, projectId, agentId);
  }

  async handleFireAgent(project, agentId) {
    return window.projectManagerMembers?.handleFireAgent?.(this, project, agentId);
  }

  getMissingRolesAfterRemoval(project, agent) {
    return window.projectManagerMembers?.getMissingRolesAfterRemoval?.(this, project, agent) || [];
  }

  async getAgentMarketList(workflowCategory) {
    return (await window.projectManagerMembers?.getAgentMarketList?.(this, workflowCategory)) || [];
  }

  async getUserHiredAgents() {
    return (await window.projectManagerMembers?.getUserHiredAgents?.(this)) || [];
  }

  getRecommendedAgentsForStage(project, stageId) {
    return (
      window.projectManagerMembers?.getRecommendedAgentsForStage?.(this, project, stageId) || []
    );
  }

  getRecommendedAgentsForStageFromCatalog(workflow, stageId) {
    return (
      window.projectManagerMembers?.getRecommendedAgentsForStageFromCatalog?.(
        this,
        workflow,
        stageId
      ) || []
    );
  }

  /**
   * 引入创意弹窗
   * @param {String} projectId - 项目ID
   */
  async showReplaceIdeaDialog(projectId) {
    return window.projectManagerIdeaFlow?.showReplaceIdeaDialog?.(this, projectId);
  }

  async confirmReplaceIdea(projectId) {
    return window.projectManagerIdeaFlow?.confirmReplaceIdea?.(this, projectId);
  }

  async saveIdeaKnowledge(projectId, ideaId) {
    return window.projectManagerIdeaFlow?.saveIdeaKnowledge?.(this, projectId, ideaId);
  }

  /**
   * 显示创建项目对话框
   */
  async showCreateProjectDialog() {
    return window.projectManagerIdeaFlow?.showCreateProjectDialog?.(this);
  }

  hasCompletedAnalysisReport(report) {
    return window.projectManagerIdeaFlow?.hasCompletedAnalysisReport?.(this, report) || false;
  }

  async getChatsWithCompletedAnalysis() {
    return (await window.projectManagerIdeaFlow?.getChatsWithCompletedAnalysis?.(this)) || [];
  }

  async filterCompletedIdeas(chats = []) {
    return (await window.projectManagerIdeaFlow?.filterCompletedIdeas?.(this, chats)) || [];
  }

  async promptWorkflowRecommendation(project) {
    return;
  }

  async applyWorkflowCategory(projectId, workflowCategory) {
    return window.projectManagerCollaboration?.applyWorkflowCategory?.(
      this,
      projectId,
      workflowCategory
    );
  }

  async customizeWorkflow(projectId, stages) {
    return (
      (await window.projectManagerCollaboration?.customizeWorkflow?.(this, projectId, stages)) ||
      null
    );
  }

  async applyCollaborationSuggestion(projectId, suggestion) {
    return window.projectManagerCollaboration?.applyCollaborationSuggestion?.(
      this,
      projectId,
      suggestion
    );
  }

  /**
   * 根据依赖关系对阶段进行拓扑排序
   * @param {Array} stages - 阶段列表
   * @returns {Array} 排序后的阶段列表
   */
  sortStagesByDependencies(stages) {
    return window.projectManagerCollaboration?.sortStagesByDependencies?.(this, stages) || [];
  }

  async buildWorkflowStages(category) {
    return (await window.projectManagerCollaboration?.buildWorkflowStages?.(this, category)) || null;
  }

  normalizeSuggestedStages(suggestedStages = []) {
    return (
      window.projectManagerCollaboration?.normalizeSuggestedStages?.(this, suggestedStages) || []
    );
  }

  /**
   * 确认创建项目
   */
  async confirmCreateProject() {
    return window.projectManagerIdeaFlow?.confirmCreateProject?.(this);
  }

  /**
   * 创建项目并设置自定义工作流
   * @param {String} ideaId - 创意ID
   * @param {String} name - 项目名称
   * @param {Array<String>} selectedStages - 选中的阶段ID
   */
  async createProjectWithWorkflow(ideaId, name, selectedStages) {
    return window.projectManagerIdeaFlow?.createProjectWithWorkflow?.(
      this,
      ideaId,
      name,
      selectedStages
    );
  }

  /**
   * 从创意创建项目
   * @param {String} ideaId - 创意ID
   * @param {String} name - 项目名称
   */
  async createProjectFromIdea(ideaId, name) {
    return window.projectManagerIdeaFlow?.createProjectFromIdea?.(this, ideaId, name);
  }

  /**
   * 打开项目详情
   * @param {String} projectId - 项目ID
   */
  async openProject(projectId) {
    return window.projectManagerEntrypoints?.openProject?.(this, projectId);
  }

  ensureProjectPanelStyles() {
    return window.projectManagerWorkflowRunner?.ensureProjectPanelStyles?.(this);
  }

  async checkBackendHealth() {
    return (await window.projectManagerWorkflowRunner?.checkBackendHealth?.(this)) || false;
  }

  async syncWorkflowArtifactsFromServer(project) {
    return window.projectManagerWorkflowRunner?.syncWorkflowArtifactsFromServer?.(this, project);
  }

  /**
   * 渲染工作流详情页
   * @param {Object} project - 项目对象
   */
  renderWorkflowDetails(project) {
    return window.projectManagerWorkflowRunner?.renderWorkflowDetails?.(this, project);
  }

  /**
   * 执行所有阶段
   * @param {String} projectId - 项目ID
   */
  async executeAllStages(projectId) {
    const options = arguments.length > 1 && typeof arguments[1] === 'object' ? arguments[1] : {};
    return window.projectManagerWorkflowRunner?.executeAllStages?.(this, projectId, options);
  }

  // ==================== Legacy Project Management Functions ====================
  // 这些函数用于向后兼容，支持旧的项目管理UI

  /**
   * 创建新项目（简化版）
   */
  createNewProject() {
    return window.projectManagerLegacyCompat?.createNewProject?.(this);
  }

  /**
   * 打开项目（旧版UI）
   * @param {String} projectId - 项目ID
   */
  openProjectLegacy(projectId) {
    return window.projectManagerLegacyCompat?.openProjectLegacy?.(this, projectId);
  }

  /**
   * 渲染项目详情（旧版UI）
   * @param {Object} project - 项目对象
   */
  renderProjectDetail(project) {
    return window.projectManagerLegacyCompat?.renderProjectDetail?.(this, project);
  }

  /**
   * 从项目中移除Agent
   * @param {String} projectId - 项目ID
   * @param {String} agentId - Agent ID
   */
  removeAgentFromProject(projectId, agentId) {
    return window.projectManagerLegacyCompat?.removeAgentFromProject?.(this, projectId, agentId);
  }

  /**
   * 关联创意到项目
   * @param {String} projectId - 项目ID
   */
  linkIdeaToProject(projectId) {
    return window.projectManagerLegacyCompat?.linkIdeaToProject?.(this, projectId);
  }

  /**
   * 编辑项目信息
   * @param {String} projectId - 项目ID
   */
  editProjectInfo(projectId) {
    return window.projectManagerLegacyCompat?.editProjectInfo?.(this, projectId);
  }

  /**
   * 删除项目（旧版）
   * @param {String} projectId - 项目ID
   */
  deleteProjectLegacy(projectId) {
    return window.projectManagerLegacyCompat?.deleteProjectLegacy?.(this, projectId);
  }

  /**
   * 从项目加载聊天
   * @param {String} chatId - 聊天ID
   */
  loadChatFromProject(chatId) {
    return window.projectManagerUiUtils?.loadChatFromProject?.(this, chatId);
  }

  /**
   * 开始工作流执行
   * @param {String} projectId - 项目ID
   */
  async startWorkflowExecution(projectId) {
    return window.projectManagerWorkflowRunner?.startWorkflowExecution?.(this, projectId);
  }

  /**
   * 打开交付物预览面板
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   * @param {String} artifactId - 交付物ID
   */
  async openArtifactPreviewPanel(projectId, stageId, artifactId) {
    return window.projectManagerArtifactPreview?.openArtifactPreviewPanel?.(
      this,
      projectId,
      stageId,
      artifactId
    );
  }

  /**
   * 关闭交付物预览面板
   */
  closeArtifactPreviewPanel() {
    return window.projectManagerArtifactPreview?.closeArtifactPreviewPanel?.(this);
  }

  /**
   * 渲染交付物预览面板
   * @param {Object} project - 项目对象
   * @param {Object} stage - 阶段对象
   * @param {Object} artifact - 交付物对象
   */
  async renderArtifactPreviewPanel(project, stage, artifact) {
    return window.projectManagerArtifactPreview?.renderArtifactPreviewPanel?.(
      this,
      project,
      stage,
      artifact
    );
  }

  /**
   * 复制交付物内容
   * @param {String} artifactId - 交付物ID
   */
  async copyArtifactContent(artifactId) {
    return window.projectManagerArtifactPreview?.copyArtifactContent?.(this, artifactId);
  }

  /**
   * 下载交付物
   * @param {String} artifactId - 交付物ID
   */
  async downloadArtifact(artifactId) {
    return window.projectManagerArtifactPreview?.downloadArtifact?.(this, artifactId);
  }

  /**
   * 格式化文件大小
   * @param {Number} bytes - 字节数
   * @returns {String} 格式化后的大小
   */
  formatFileSize(bytes) {
    return window.projectManagerArtifactPreview?.formatFileSize?.(bytes) || '0 B';
  }

  // 协同升级评估逻辑已移除（统一产品流程）
}

// 导出（浏览器环境）
if (typeof window !== 'undefined') {
  window.ProjectManager = ProjectManager;
  window.projectManager = new ProjectManager();

  // 自动初始化
  window.addEventListener('DOMContentLoaded', () => {
    if (window.projectManager) {
      window.projectManager.init();
    }
  });
}
