function getDefaultApiUrl() {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost && window.location.port !== '3000') {
    return 'http://127.0.0.1:3000';
  }
  return window.location.origin;
}

const STAGE_ID_ALIASES = {
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

const ARTIFACT_TYPE_DEFS = {
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
    this.artifactTypeDefs = ARTIFACT_TYPE_DEFS;
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
    } catch (error) {}
  }

  normalizeIdeaId(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const strValue = String(value).trim();
    if (strValue === '') {
      return null;
    }
    const numValue = Number(strValue);
    if (!isNaN(numValue)) {
      return numValue;
    }
    return strValue;
  }

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
    return STAGE_ID_ALIASES[normalized] || normalized;
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
    return (
      (await window.projectManagerSetup?.hydrateProjectStageOutputs?.(this, project)) || project
    );
  }

  async init() {
    return window.projectManagerSetup?.init?.(this);
  }

  async loadProjects(options = {}) {
    return (await window.projectManagerSetup?.loadProjects?.(this, options)) || this.projects;
  }

  buildKnowledgeFromArtifacts(projectId, artifacts) {
    return (
      window.projectManagerSetup?.buildKnowledgeFromArtifacts?.(this, projectId, artifacts) || []
    );
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

  async createProject(ideaId, name) {
    return window.projectManagerData?.createProject?.(this, ideaId, name);
  }

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

  async getProjectByIdeaId(ideaId) {
    return window.projectManagerData?.getProjectByIdeaId?.(this, ideaId);
  }

  async updateProject(projectId, updates, options = {}) {
    return window.projectManagerData?.updateProject?.(this, projectId, updates, options);
  }

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

  renderProjectList(containerId) {
    return window.projectManagerProjectList?.renderProjectList?.(this, containerId);
  }

  renderProjectCard(project) {
    return window.projectManagerProjectList?.renderProjectCard?.(this, project) || '';
  }

  calculateWorkflowProgress(workflow) {
    return window.projectManagerUiUtils?.calculateWorkflowProgress?.(this, workflow) || 0;
  }

  formatTimeAgo(timestamp) {
    return window.projectManagerCoreUtils?.formatTimeAgo?.(this, timestamp) || '刚刚';
  }

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

  refreshProjectPanel(project) {
    return window.projectManagerPanelLifecycle?.refreshProjectPanel?.(this, project);
  }

  updateProjectSelection(projectId) {
    return window.projectManagerPanelLifecycle?.updateProjectSelection?.(this, projectId);
  }

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

  calculateStageProgress(stage) {
    return window.projectManagerStageUtils?.calculateStageProgress?.(this, stage) || 0;
  }

  getAgentDefinition(agentType) {
    return window.projectManagerStageUtils?.getAgentDefinition?.(this, agentType) || null;
  }

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

  getArtifactIcon(artifactType) {
    const def = this.getArtifactTypeDefinition(artifactType);
    return def.icon;
  }

  renderWorkflowSteps(stages, selectedStageId) {
    return (
      window.projectManagerPanelRenderer?.renderWorkflowSteps?.call(
        this,
        stages,
        selectedStageId
      ) || ''
    );
  }

  renderStageDetailSection(project, stage) {
    return (
      window.projectManagerPanelRenderer?.renderStageDetailSection?.call(this, project, stage) || ''
    );
  }

  selectStage(stageId) {
    return window.projectManagerUiUtils?.selectStage?.(this, stageId);
  }

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
    return (
      (await window.projectManagerPanelLifecycle?.buildPreviewArtifact?.(this, project)) || null
    );
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

  closeProjectPanel() {
    return window.projectManagerPanelLifecycle?.closeProjectPanel?.(this);
  }

  async renderProjectMembersPanel(project) {
    return window.projectManagerPanelContent?.renderProjectMembersPanel?.(this, project);
  }

  async renderProjectIdeasPanel(project) {
    return window.projectManagerPanelContent?.renderProjectIdeasPanel?.(this, project);
  }

  async renderProjectKnowledgePanel(project) {
    return window.projectManagerPanelContent?.renderProjectKnowledgePanel?.(this, project);
  }

  async getReportsByChatId(chatId) {
    return (await window.projectManagerPanelContent?.getReportsByChatId?.(this, chatId)) || {};
  }

  async viewIdeaReport(chatId, type) {
    return window.projectManagerReportPreview?.viewIdeaReport?.(this, chatId, type);
  }

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

  async showReplaceIdeaDialog(projectId) {
    return window.projectManagerIdeaFlow?.showReplaceIdeaDialog?.(this, projectId);
  }

  async confirmReplaceIdea(projectId) {
    return window.projectManagerIdeaFlow?.confirmReplaceIdea?.(this, projectId);
  }

  async saveIdeaKnowledge(projectId, ideaId) {
    return window.projectManagerIdeaFlow?.saveIdeaKnowledge?.(this, projectId, ideaId);
  }

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

  sortStagesByDependencies(stages) {
    return window.projectManagerCollaboration?.sortStagesByDependencies?.(this, stages) || [];
  }

  async buildWorkflowStages(category) {
    return (
      (await window.projectManagerCollaboration?.buildWorkflowStages?.(this, category)) || null
    );
  }

  normalizeSuggestedStages(suggestedStages = []) {
    return (
      window.projectManagerCollaboration?.normalizeSuggestedStages?.(this, suggestedStages) || []
    );
  }

  async confirmCreateProject() {
    return window.projectManagerIdeaFlow?.confirmCreateProject?.(this);
  }

  async createProjectWithWorkflow(ideaId, name, selectedStages) {
    return window.projectManagerIdeaFlow?.createProjectWithWorkflow?.(
      this,
      ideaId,
      name,
      selectedStages
    );
  }

  async createProjectFromIdea(ideaId, name) {
    return window.projectManagerIdeaFlow?.createProjectFromIdea?.(this, ideaId, name);
  }

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

  renderWorkflowDetails(project) {
    return window.projectManagerWorkflowRunner?.renderWorkflowDetails?.(this, project);
  }

  async executeAllStages(projectId) {
    const options = arguments.length > 1 && typeof arguments[1] === 'object' ? arguments[1] : {};
    return window.projectManagerWorkflowRunner?.executeAllStages?.(this, projectId, options);
  }

  createNewProject() {
    return window.projectManagerLegacyCompat?.createNewProject?.(this);
  }

  openProjectLegacy(projectId) {
    return window.projectManagerLegacyCompat?.openProjectLegacy?.(this, projectId);
  }

  renderProjectDetail(project) {
    return window.projectManagerLegacyCompat?.renderProjectDetail?.(this, project);
  }

  removeAgentFromProject(projectId, agentId) {
    return window.projectManagerLegacyCompat?.removeAgentFromProject?.(this, projectId, agentId);
  }

  linkIdeaToProject(projectId) {
    return window.projectManagerLegacyCompat?.linkIdeaToProject?.(this, projectId);
  }

  editProjectInfo(projectId) {
    return window.projectManagerLegacyCompat?.editProjectInfo?.(this, projectId);
  }

  deleteProjectLegacy(projectId) {
    return window.projectManagerLegacyCompat?.deleteProjectLegacy?.(this, projectId);
  }

  loadChatFromProject(chatId) {
    return window.projectManagerUiUtils?.loadChatFromProject?.(this, chatId);
  }

  async startWorkflowExecution(projectId) {
    return window.projectManagerWorkflowRunner?.startWorkflowExecution?.(this, projectId);
  }

  async openArtifactPreviewPanel(projectId, stageId, artifactId) {
    return window.projectManagerArtifactPreview?.openArtifactPreviewPanel?.(
      this,
      projectId,
      stageId,
      artifactId
    );
  }

  closeArtifactPreviewPanel() {
    return window.projectManagerArtifactPreview?.closeArtifactPreviewPanel?.(this);
  }

  async renderArtifactPreviewPanel(project, stage, artifact) {
    return window.projectManagerArtifactPreview?.renderArtifactPreviewPanel?.(
      this,
      project,
      stage,
      artifact
    );
  }

  async copyArtifactContent(artifactId) {
    return window.projectManagerArtifactPreview?.copyArtifactContent?.(this, artifactId);
  }

  async downloadArtifact(artifactId) {
    return window.projectManagerArtifactPreview?.downloadArtifact?.(this, artifactId);
  }

  formatFileSize(bytes) {
    return window.projectManagerArtifactPreview?.formatFileSize?.(bytes) || '0 B';
  }
}

const deliverableDelegateDefs = [
  ['getExpectedDeliverables', 'getExpectedDeliverables', args => [], false],
  ['resolveSelectedArtifactTypes', 'resolveSelectedArtifactTypes', args => [], false],
  ['normalizeDeliverableKey', 'normalizeDeliverableKey', args => '', true],
  ['findArtifactForDeliverable', 'findArtifactForDeliverable', args => null, false],
  ['getDeliverableStatusItems', 'getDeliverableStatusItems', args => [], false],
  [
    'getDeliverableProgressSummary',
    'getDeliverableProgressSummary',
    () => ({
      items: [],
      selectedItems: [],
      selectedCount: 0,
      generatedCount: 0,
      generatingCount: 0,
      totalCount: 0
    }),
    false
  ],
  ['renderDeliverableStatusPanel', 'renderDeliverableStatusPanel', args => '', false],
  ['generateAdditionalDeliverables', 'generateAdditionalDeliverables', () => undefined, false],
  ['regenerateStageDeliverable', 'regenerateStageDeliverable', () => undefined, false],
  ['retryStageDeliverable', 'retryStageDeliverable', () => undefined, false],
  ['getMissingDeliverables', 'getMissingDeliverables', args => [], false],
  ['getMissingSelectedDeliverables', 'getMissingSelectedDeliverables', args => [], false],
  ['getMissingDeliverablesFromExpected', 'getMissingDeliverablesFromExpected', args => [], false],
  ['getMissingDeliverablesWithReason', 'getMissingDeliverablesWithReason', args => [], false],
  ['hasGeneratedPrd', 'hasGeneratedPrd', args => false, false],
  ['validateStrategyDocDependency', 'validateStrategyDocDependency', args => false, false],
  ['getStageSelectedDeliverables', 'getStageSelectedDeliverables', args => [], false],
  ['toggleStageDeliverable', 'toggleStageDeliverable', () => undefined, false],
  ['startStageWithSelection', 'startStageWithSelection', () => undefined, false]
];

for (const [methodName, delegateName, fallback, plainArgs] of deliverableDelegateDefs) {
  ProjectManager.prototype[methodName] = async function (...args) {
    const result = plainArgs
      ? await window.projectManagerDeliverables?.[delegateName]?.(...args)
      : await window.projectManagerDeliverables?.[delegateName]?.(this, ...args);
    return result ?? fallback(args);
  };
}

if (typeof window !== 'undefined') {
  window.ProjectManager = ProjectManager;
  window.projectManager = new ProjectManager();

  window.addEventListener('DOMContentLoaded', () => {
    if (window.projectManager) {
      window.projectManager.init();
    }
  });
}
