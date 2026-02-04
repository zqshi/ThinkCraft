/**
 * 项目管理器（前端）
 * 负责项目创建、查询、展示
 */

function getDefaultApiUrl() {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost && window.location.port !== '3000') {
    return 'http://localhost:3000';
  }
  return window.location.origin;
}

// 创建日志实例
var logger = window.createLogger ? window.createLogger('ProjectManager') : console;

class ProjectManager {
  constructor() {
    this.projects = [];
    this.currentProject = null;
    this.currentProjectId = null;
    this.memberModalProjectId = null;
    this.currentStageId = null;
    this.stageTabState = {};
    this.stageArtifactState = {};
    this.stageDeliverableSelection = {};
    this.stageDeliverableSelectionByProject = this.loadStageDeliverableSelectionStore();
    this.agentMarket = [];
    this.agentMarketCategory = null;
    this.cachedHiredAgents = [];
    this.hiredAgentsFetchedAt = 0;
    this.hiredAgentsPromise = null;
    this.apiUrl = window.appState?.settings?.apiUrl || getDefaultApiUrl();
    this.storageManager = window.storageManager;
    this.stageDetailPanel = null; // 阶段详情面板
    this.stageDetailOverlay = null; // 遮罩层
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

  /**
   * 初始化：加载所有项目
   */
  async init() {
    try {
      await this.loadProjects();
    } catch (error) {}
  }

  /**
   * 加载所有项目（从本地存储）
   */
  async loadProjects() {
    try {
      const allProjects = await this.storageManager.getAllProjects();

      // 过滤掉已删除的项目
      this.projects = allProjects.filter(project => project.status !== 'deleted');

      // 更新全局状态
      if (window.setProjects) {
        window.setProjects(this.projects);
      }

      return this.projects;
    } catch (error) {
      return [];
    }
  }

  buildKnowledgeFromArtifacts(projectId, artifacts) {
    const docTypeMap = {
      prd: 'prd',
      'ui-design': 'design',
      'architecture-doc': 'tech',
      'test-report': 'analysis',
      'deploy-doc': 'tech',
      'marketing-plan': 'analysis'
    };

    return artifacts
      .filter(artifact => docTypeMap[artifact.type])
      .map(artifact => ({
        id: `knowledge-${artifact.id}`,
        title: artifact.name || '未命名文档',
        type: docTypeMap[artifact.type],
        scope: 'project',
        projectId,
        content: artifact.content || '',
        tags: [artifact.type, artifact.stageId].filter(Boolean),
        createdAt: artifact.createdAt || Date.now()
      }));
  }

  getValidAgentIds() {
    const agentMarket = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];
    const ids = agentMarket.map(agent => agent.id);
    if (ids.length > 0) {
      return new Set(ids);
    }
    return new Set(['agent_001', 'agent_002', 'agent_003', 'agent_004', 'agent_005', 'agent_006']);
  }

  getUserId() {
    try {
      const raw = sessionStorage.getItem('thinkcraft_user');
      if (raw) {
        const user = JSON.parse(raw);
        const id = user?.userId || user?.id || user?.phone;
        if (id) {
          return String(id);
        }
      }
    } catch (error) {}

    const cached = localStorage.getItem('thinkcraft_user_id');
    if (cached) {
      return cached;
    }
    const fallback = `guest_${Date.now()}`;
    localStorage.setItem('thinkcraft_user_id', fallback);
    return fallback;
  }

  async getWorkflowCatalog(category = 'product-development') {
    // 检查缓存
    if (this.workflowCatalogCache && this.workflowCatalogCache[category]) {
      return this.workflowCatalogCache[category];
    }

    try {
      const response = await this.fetchWithAuth(
        `${this.apiUrl}/api/projects/workflow-config/${category}`
      );
      const result = await response.json();

      if (result.code === 0) {
        const catalog = {
          id: result.data.workflowId,
          name: result.data.workflowName,
          description: result.data.description,
          stages: result.data.stages.map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            dependencies: s.dependencies,
            outputs: s.outputs,
            outputsDetailed: s.outputsDetailed
          })),
          agents: result.data.stages.reduce((acc, stage) => {
            acc[stage.id] = stage.agents;
            return acc;
          }, {}),
          agentRoles: result.data.stages.reduce((acc, stage) => {
            acc[stage.id] = stage.agentRoles;
            return acc;
          }, {})
        };

        // 缓存结果
        if (!this.workflowCatalogCache) {
          this.workflowCatalogCache = {};
        }
        this.workflowCatalogCache[category] = catalog;

        return catalog;
      } else {
        throw new Error(result.message || '加载工作流配置失败');
      }
    } catch (error) {
      console.error('加载工作流配置失败:', error);
      throw error;
    }
  }

  getWorkflowCategoryLabel() {
    return '统一产品开发';
  }

  patchWorkflowArtifacts(workflow, templateWorkflow) {
    if (!workflow || !Array.isArray(workflow.stages)) {
      return templateWorkflow;
    }
    if (!templateWorkflow || !Array.isArray(templateWorkflow.stages)) {
      return workflow;
    }

    const templateMap = new Map(templateWorkflow.stages.map(stage => [stage.id, stage]));
    const patchedStages = workflow.stages.map(stage => {
      const templateStage = templateMap.get(stage.id);
      if (!templateStage || !Array.isArray(stage.artifacts)) {
        return stage;
      }
      const patchedArtifacts = stage.artifacts.map(artifact => {
        if (artifact.type) {
          return artifact;
        }
        const templateArtifact = templateStage.artifacts?.find(item => item.id === artifact.id);
        return templateArtifact
          ? { ...artifact, type: templateArtifact.type }
          : { ...artifact, type: 'document' };
      });
      return { ...stage, artifacts: patchedArtifacts };
    });

    return { ...workflow, stages: patchedStages };
  }

  /**
   * 创建项目（从创意）
   * @param {String} ideaId - 创意ID（对话ID）
   * @param {String} name - 项目名称
   * @returns {Promise<Object>} 项目对象
   */
  async createProject(ideaId, name) {
    try {
      console.log('[createProject] 输入参数:', { ideaId, name, ideaIdType: typeof ideaId });

      // 统一转换为字符串，避免类型混淆
      const normalizedIdeaId = this.normalizeIdeaId(ideaId);
      console.log('[createProject] 规范化后:', { normalizedIdeaId, type: typeof normalizedIdeaId });

      if (window.requireAuth) {
        const ok = await window.requireAuth({ redirect: true, prompt: true });
        if (!ok) {
          throw new Error('未提供访问令牌');
        }
      } else if (!this.getAuthToken()) {
        const message = '请先登录后再创建项目';
        if (window.modalManager) {
          window.modalManager.alert(message, 'warning');
        } else {
          alert(message);
        }
        window.location.href = 'login.html';
        throw new Error('未提供访问令牌');
      }

      // 验证 ideaId 有效性
      if (!normalizedIdeaId && normalizedIdeaId !== 0) {
        throw new Error('创意ID无效');
      }

      // 确保转换为字符串传给后端
      const ideaIdString = String(normalizedIdeaId);
      console.log('[createProject] 发送给后端:', { ideaIdString });

      // 检查该创意是否已创建项目
      const existing = await this.storageManager.getProjectByIdeaId(normalizedIdeaId);
      if (existing) {
        throw new Error('该创意已创建项目');
      }

      // 后端去重：如果已存在项目，直接返回
      try {
        const byIdeaResp = await this.fetchWithAuth(
          `${this.apiUrl}/api/projects/by-idea/${encodeURIComponent(ideaIdString)}`
        );
        if (byIdeaResp.ok) {
          const byIdeaResult = await byIdeaResp.json();
          const existingProject = byIdeaResult?.data?.project || byIdeaResult?.data || null;
          if (existingProject?.id) {
            existingProject.ideaId = String(existingProject.ideaId).trim();
            await this.storageManager.saveProject(existingProject);
            if (!this.projects.find(p => p.id === existingProject.id)) {
              this.projects.unshift(existingProject);
            }
            if (window.addProject) {
              window.addProject(existingProject);
            }
            return existingProject;
          }
        }
      } catch (error) {
        // 忽略查询失败，继续创建
      }

      // 调用后端API创建项目（使用字符串ID）
      const response = await this.fetchWithAuth(`${this.apiUrl}/api/projects`, {
        method: 'POST',
        headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ideaId: ideaIdString, name })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (error?.error === '该创意已创建项目') {
          try {
            const byIdeaResp = await this.fetchWithAuth(
              `${this.apiUrl}/api/projects/by-idea/${encodeURIComponent(ideaIdString)}`
            );
            if (byIdeaResp.ok) {
              const byIdeaResult = await byIdeaResp.json();
              const existingProject = byIdeaResult?.data?.project || byIdeaResult?.data || null;
              if (existingProject?.id) {
                existingProject.ideaId = String(existingProject.ideaId).trim();
                await this.storageManager.saveProject(existingProject);
                if (!this.projects.find(p => p.id === existingProject.id)) {
                  this.projects.unshift(existingProject);
                }
                if (window.addProject) {
                  window.addProject(existingProject);
                }
                return existingProject;
              }
            }
          } catch (fetchError) {}
        }
        throw new Error(error.error || '创建项目失败');
      }

      const result = await response.json();
      const project = result.data.project;

      // 确保项目的 ideaId 是字符串
      project.ideaId = String(project.ideaId).trim();

      // 保存到本地存储
      await this.storageManager.saveProject(project);

      // 更新内存
      this.projects.unshift(project);

      // 更新全局状态
      if (window.addProject) {
        window.addProject(project);
      }

      return project;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取项目详情
   * @param {String} projectId - 项目ID
   * @returns {Promise<Object>} 项目对象
   */
  async getProject(projectId) {
    try {
      // 先从本地获取
      const project = await this.storageManager.getProject(projectId);
      if (project) {
        const patched = await this.ensureProjectWorkflow(project);
        if (patched !== project) {
          await this.storageManager.saveProject(patched);
        }
        return patched;
      }

      // 如果本地没有，从后端获取
      const response = await this.fetchWithAuth(`${this.apiUrl}/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('项目不存在');
      }

      const result = await response.json();
      const remoteProject = result.data.project;
      const patchedRemote = await this.ensureProjectWorkflow(remoteProject);
      if (patchedRemote !== remoteProject) {
        await this.storageManager.saveProject(patchedRemote);
      }
      return patchedRemote;
    } catch (error) {
      throw error;
    }
  }

  async ensureProjectWorkflow(project) {
    if (!project) {
      return project;
    }
    if (project.workflow && Array.isArray(project.workflow.stages)) {
      return project;
    }
    const suggestedStages = project.collaborationSuggestion?.stages;
    if (Array.isArray(suggestedStages) && suggestedStages.length > 0) {
      const stages = this.normalizeSuggestedStages(suggestedStages);
      if (stages.length > 0) {
        return {
          ...project,
          workflow: {
            stages,
            currentStage: stages[0]?.id || null
          }
        };
      }
    }
    return project;
  }

  /**
   * 根据创意ID获取项目
   * @param {String} ideaId - 创意ID
   * @returns {Promise<Object|null>} 项目对象
   */
  async getProjectByIdeaId(ideaId) {
    return await this.storageManager.getProjectByIdeaId(ideaId);
  }

  /**
   * 更新项目
   * @param {String} projectId - 项目ID
   * @param {Object} updates - 更新内容
   */
  async updateProject(projectId, updates, options = {}) {
    try {
      if (
        !options.forceRemote &&
        options.allowFallback &&
        !options.localOnly &&
        this.storageManager?.getProject
      ) {
        const localProject = await this.storageManager.getProject(projectId).catch(() => null);
        if (localProject) {
          return await this.updateProject(projectId, updates, { ...options, localOnly: true });
        }
      }

      const normalizedIdeaUpdate =
        updates && Object.prototype.hasOwnProperty.call(updates, 'ideaId')
          ? { ...updates, ideaId: String(this.normalizeIdeaId(updates.ideaId)).trim() }
          : updates;

      const normalizedUpdates =
        normalizedIdeaUpdate &&
        Object.prototype.hasOwnProperty.call(normalizedIdeaUpdate, 'assignedAgents')
          ? {
              ...normalizedIdeaUpdate,
              assignedAgents: Array.isArray(normalizedIdeaUpdate.assignedAgents)
                ? normalizedIdeaUpdate.assignedAgents.filter(Boolean).map(String)
                : []
            }
          : normalizedIdeaUpdate;

      if (options.localOnly) {
        const existing = await this.storageManager.getProject(projectId);
        const project = {
          ...(existing || { id: projectId }),
          ...(normalizedUpdates || {}),
          updatedAt: Date.now()
        };
        await this.storageManager.saveProject(project);
        const index = this.projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
          this.projects[index] = project;
        }
        if (window.updateProject) {
          window.updateProject(projectId, normalizedUpdates);
        }
        this.refreshProjectPanel(project);
        return project;
      }

      // 调用后端API
      const response = await this.fetchWithAuth(`${this.apiUrl}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(normalizedUpdates)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const err = new Error(error.error || '更新项目失败');
        if (options.allowFallback) {
          throw err;
        }
        throw err;
      }

      const result = await response.json();
      const project = result.data.project;

      // 更新本地存储
      await this.storageManager.saveProject(project);

      // 更新内存
      const index = this.projects.findIndex(p => p.id === projectId);
      if (index !== -1) {
        this.projects[index] = project;
      }

      // 更新全局状态
      if (window.updateProject) {
        window.updateProject(projectId, normalizedUpdates);
      }

      this.refreshProjectPanel(project);

      return project;
    } catch (error) {
      if (options.allowFallback) {
        const existing = await this.storageManager.getProject(projectId);
        if (existing) {
          const project = { ...existing, ...(normalizedUpdates || {}), updatedAt: Date.now() };
          await this.storageManager.saveProject(project);
          const index = this.projects.findIndex(p => p.id === projectId);
          if (index !== -1) {
            this.projects[index] = project;
          }
          if (window.updateProject) {
            window.updateProject(projectId, normalizedUpdates);
          }
          this.refreshProjectPanel(project);
          return project;
        }
      }
      const existing = await this.storageManager.getProject(projectId);
      if (!existing) {
        throw error;
      }
      const project = { ...existing, ...(normalizedUpdates || {}), updatedAt: Date.now() };
      await this.storageManager.saveProject(project);

      const index = this.projects.findIndex(p => p.id === projectId);
      if (index !== -1) {
        this.projects[index] = project;
      }
      if (window.updateProject) {
        window.updateProject(projectId, normalizedUpdates);
      }
      this.refreshProjectPanel(project);
      return project;
    }
  }

  /**
   * 删除项目
   * @param {String} projectId - 项目ID
   */
  async deleteProject(projectId) {
    try {
      const projectIdText = String(projectId || '');
      const isServerId =
        projectIdText.startsWith('project_') || /^[a-f0-9]{24}$/i.test(projectIdText);
      logger.debug('[DEBUG] deleteProject - projectId:', projectId);
      logger.debug('[DEBUG] deleteProject - isServerId:', isServerId);

      if (isServerId) {
        let response;
        try {
          logger.debug('[DEBUG] deleteProject - calling DELETE API');
          response = await this.fetchWithAuth(`${this.apiUrl}/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: this.buildAuthHeaders()
          });
          logger.debug('[DEBUG] deleteProject - response.ok:', response.ok);
          logger.debug('[DEBUG] deleteProject - response.status:', response.status);
        } catch (error) {
          console.error('[DEBUG] deleteProject - fetch error:', error);
          window.modalManager?.alert(`删除项目失败: ${error.message}`, 'error');
          return;
        }

        if (!response.ok) {
          let message = '删除项目失败';
          try {
            const error = await response.json();
            message = error.error || message;
            logger.debug('[DEBUG] deleteProject - error response:', error);
          } catch (parseError) {}

          const localExisting = await this.storageManager.getProject(projectId);
          if (!localExisting) {
            window.modalManager?.alert(`删除项目失败: ${message}`, 'error');
            return;
          }
          logger.debug(
            '[DEBUG] deleteProject - continuing despite API error, local project exists'
          );
        }
      }

      // 软删除本地存储
      logger.debug('[DEBUG] deleteProject - deleting from local storage');
      await this.storageManager.deleteProject(projectId);

      // 更新内存（保留项目，标记为deleted）
      this.projects = this.projects.map(project =>
        project.id === projectId
          ? { ...project, status: 'deleted', updatedAt: Date.now() }
          : project
      );

      // 更新全局状态
      if (window.updateProject) {
        window.updateProject(projectId, { status: 'deleted', updatedAt: Date.now() });
      }

      if (this.currentProjectId === projectId) {
        this.closeProjectPanel();
      }

      this.renderProjectList('projectListContainer');
      logger.debug('[DEBUG] deleteProject - completed');
    } catch (error) {
      console.error('[DEBUG] deleteProject - error:', error);
      throw error;
    }
  }

  confirmDeleteCurrentProject() {
    if (!this.currentProjectId) {
      return;
    }
    const projectName = this.currentProject?.name || '该项目';
    const confirmed = window.confirm(`确定要删除 "${projectName}" 吗？\n\n此操作不可恢复。`);
    if (!confirmed) {
      return;
    }
    this.deleteProject(this.currentProjectId);
  }

  editCurrentProjectName() {
    if (!this.currentProjectId || !this.currentProject) {
      return;
    }
    const newName = window.prompt('修改项目名称：', this.currentProject.name || '');
    if (!newName || !newName.trim()) {
      return;
    }
    if (newName.trim() === this.currentProject.name) {
      return;
    }
    this.updateProject(this.currentProjectId, { name: newName.trim() })
      .then(updated => {
        const viewProject = updated || { ...this.currentProject, name: newName.trim() };
        this.currentProject = viewProject;
        this.renderProjectList('projectListContainer');
        this.refreshProjectPanel(viewProject);
      })
      .catch(error => {});
  }

  openProjectKnowledgePanel() {
    if (!this.currentProjectId) {
      return;
    }
    showKnowledgeBase('project', this.currentProjectId);
  }

  openIdeaChat(chatId) {
    if (!chatId) {
      return;
    }
    this.closeProjectPanel();

    // 切换到对话tab
    if (typeof switchSidebarTab === 'function') {
      switchSidebarTab('chats');
    }

    if (typeof window.loadChatFromProject === 'function') {
      window.loadChatFromProject(chatId);
      return;
    }
    if (typeof window.loadChat === 'function') {
      window.loadChat(chatId);
    }
  }

  /**
   * 渲染项目列表
   * @param {String} containerId - 容器元素ID
   */
  renderProjectList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    const visibleProjects = this.projects.filter(project => project.status !== 'deleted');
    const headerHTML = `
            <div class="project-list-header">
                <div class="project-list-title">
                    项目空间
                    <span class="project-list-count">${visibleProjects.length}</span>
                </div>
                <button class="btn-primary btn-compact" onclick="projectManager.showCreateProjectDialog()">
                    新建项目
                </button>
            </div>
        `;

    if (visibleProjects.length === 0) {
      container.innerHTML = `
                <div class="project-list">
                    ${headerHTML}
                    <div class="project-list-empty">
                        <div class="project-list-empty-title">还没有项目</div>
                        <div class="project-list-empty-sub">从创意对话或知识库引入内容，快速建立项目空间</div>
                        <button class="btn-primary btn-compact" onclick="projectManager.showCreateProjectDialog()">
                            新建项目
                        </button>
                    </div>
                </div>
            `;
      return;
    }

    const projectCardsHTML = visibleProjects
      .map(project => this.renderProjectCard(project))
      .join('');

    container.innerHTML = `
            <div class="project-list">
                ${headerHTML}
                <div class="project-list-grid">
                    ${projectCardsHTML}
                </div>
            </div>
        `;
  }

  /**
   * 渲染单个项目卡片
   * @param {Object} project - 项目对象
   * @returns {String} HTML字符串
   */
  renderProjectCard(project) {
    const statusText =
      {
        planning: '规划中',
        active: '进行中',
        in_progress: '进行中',
        testing: '测试中',
        completed: '已完成',
        archived: '已归档',
        on_hold: '已暂停',
        cancelled: '已取消'
      }[project.status] || project.status;

    const timeAgo = project.updatedAt ? this.formatTimeAgo(project.updatedAt) : '刚刚';
    const isActive = this.currentProjectId === project.id;
    const statusClass = `status-${project.status || 'planning'}`;
    const memberCount = (project.assignedAgents || []).length;
    const ideaCount = project.ideaId ? 1 : 0;
    const stageCount = project.workflow?.stages?.length || 0;
    const completedStages = (project.workflow?.stages || []).filter(
      stage => stage.status === 'completed'
    ).length;
    const pendingStages = Math.max(stageCount - completedStages, 0);
    const progress = this.calculateWorkflowProgress(project.workflow);
    const metaItems = [`更新 ${timeAgo}`, `阶段 ${stageCount}`, `待完成 ${pendingStages}`];

    const contentHTML = `
                <div class="project-card-progress-row">
                    <div class="project-card-progress-label">进度 ${progress}%</div>
                    <div class="project-card-progress">
                        <span style="width: ${progress}%;"></span>
                    </div>
                </div>
            `;

    return `
            <div class="project-card${isActive ? ' active' : ''}" data-project-id="${project.id}" onclick="projectManager.openProject('${project.id}')">
                <div class="project-card-head">
                    <div class="project-card-title-row">
                        <div class="project-card-title">${this.escapeHtml(project.name)}</div>
                    </div>
                    <div class="project-card-badges">
                        <span class="project-pill ${statusClass}">${statusText}</span>
                    </div>
                    <div class="project-card-meta">
                        ${metaItems
                          .map(
                            (item, index) => `
                            ${index ? '<span class="project-card-meta-dot"></span>' : ''}
                            <span>${item}</span>
                        `
                          )
                          .join('')}
                    </div>
                </div>
                <div class="project-card-kpis">
                    <div class="project-card-kpi">
                        <span>成员</span>
                        <strong>${memberCount}</strong>
                    </div>
                    <div class="project-card-kpi">
                        <span>创意</span>
                        <strong>${ideaCount}</strong>
                    </div>
                    <div class="project-card-kpi">
                        <span>进度</span>
                        <strong>${progress}%</strong>
                    </div>
                </div>
                ${contentHTML}
            </div>
        `;
  }

  /**
   * 计算工作流进度
   * @param {Object} workflow - 工作流对象
   * @returns {Number} 进度百分比
   */
  calculateWorkflowProgress(workflow) {
    if (!workflow || !workflow.stages || workflow.stages.length === 0) {
      return 0;
    }

    const completedStages = workflow.stages.filter(s => s.status === 'completed').length;
    return Math.round((completedStages / workflow.stages.length) * 100);
  }

  /**
   * 格式化时间
   * @param {Number} timestamp - 时间戳
   * @returns {String} 相对时间
   */
  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}天前`;
    }
    if (hours > 0) {
      return `${hours}小时前`;
    }
    if (minutes > 0) {
      return `${minutes}分钟前`;
    }
    return '刚刚';
  }

  /**
   * HTML转义
   * @param {String} text - 文本
   * @returns {String} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 刷新项目面板
   * @param {Object} project - 项目对象
   */
  refreshProjectPanel(project) {
    if (!project || !this.currentProjectId || project.id !== this.currentProjectId) {
      return;
    }

    this.currentProject = project;
    this.renderProjectPanel(project);
    this.updateProjectSelection(project.id);
  }

  /**
   * 更新项目选中状态
   * @param {String|null} projectId - 项目ID
   */
  updateProjectSelection(projectId) {
    document.querySelectorAll('[data-project-id]').forEach(card => {
      card.classList.toggle('active', card.dataset.projectId === projectId);
    });
  }

  /**
   * 显示项目右侧面板
   * @param {Object} project - 项目对象
   */
  renderProjectPanel(project) {
    const panel = document.getElementById('projectPanel');
    const title = document.getElementById('projectPanelTitle');
    const body = document.getElementById('projectPanelBody');
    const mainContent = document.querySelector('.main-content');
    const chatContainer = document.getElementById('chatContainer');

    if (!panel || !body || !title) {
      this.renderWorkflowDetails(project);
      return;
    }

    const statusText =
      {
        planning: '规划中',
        active: '进行中',
        in_progress: '进行中',
        testing: '测试中',
        completed: '已完成',
        archived: '已归档',
        on_hold: '已暂停',
        cancelled: '已取消'
      }[project.status] || project.status;

    const workflowReady = Boolean(window.workflowExecutor);
    const updatedAt = project.updatedAt ? this.formatTimeAgo(project.updatedAt) : '刚刚';

    const memberCount = (project.assignedAgents || []).length;
    const ideaCount = project.ideaId ? 1 : 0;
    const statusClass = `status-${project.status || 'planning'}`;

    const workflowCategory = project.workflowCategory || 'product-development';
    const workflowLabel = this.getWorkflowCategoryLabel(workflowCategory);

    const suggestedStages = project.collaborationSuggestion?.stages;
    const hasSuggestedStages = Array.isArray(suggestedStages) && suggestedStages.length > 0;
    const stages = hasSuggestedStages
      ? this.normalizeSuggestedStages(suggestedStages)
      : project.workflow?.stages || [];

    // 检查是否已执行协同模式
    const collaborationExecuted = project.collaborationExecuted || false;

    const shouldRenderWorkflow = hasSuggestedStages || (collaborationExecuted && stages.length > 0);
    const effectiveStages = shouldRenderWorkflow ? stages : [];
    const stageCount = effectiveStages.length;
    const completedStages = effectiveStages.filter(stage => stage.status === 'completed').length;
    const pendingStages = Math.max(stageCount - completedStages, 0);
    const progress = this.calculateWorkflowProgress({ stages: effectiveStages });

    const selectedStageId = this.currentStageId || effectiveStages[0]?.id || null;
    this.currentStageId = selectedStageId;

    // 根据依赖关系对阶段进行拓扑排序
    const sortedStages = collaborationExecuted
      ? this.sortStagesByDependencies(effectiveStages)
      : effectiveStages;

    title.textContent = project.name;

    body.innerHTML = `
                <div class="project-panel-hero">
                    <div class="project-panel-badges">
                        <span class="project-pill ${statusClass}">${statusText}</span>
                        <span class="project-pill">${workflowLabel}</span>
                        <span class="project-pill">进度 ${progress}%</span>
                    </div>
                    <div class="project-panel-meta">
                        <span>更新时间 ${updatedAt}</span>
                        <span>成员 ${memberCount}</span>
                        <span>创意 ${ideaCount}</span>
                        <span>待完成 ${pendingStages}</span>
                    </div>
                    <div class="project-panel-hero-actions">
                        <button class="btn-secondary" onclick="projectManager.showReplaceIdeaDialog('${project.id}')">更换创意</button>
                        ${shouldRenderWorkflow ? `<button class="btn-secondary" onclick="projectManager.openPreviewPanel('${project.id}')">预览入口</button>` : ''}
                    </div>
                </div>
            <div class="project-panel-layout">
                <div class="project-panel-section project-panel-card">
                    <div class="project-panel-section-title">项目概览</div>
                    <div class="project-panel-summary">
                        <div>
                            <div class="project-panel-summary-label">成员</div>
                            <div class="project-panel-summary-value">${memberCount}</div>
                        </div>
                        <div>
                            <div class="project-panel-summary-label">创意</div>
                            <div class="project-panel-summary-value">${ideaCount}</div>
                        </div>
                        <div>
                            <div class="project-panel-summary-label">阶段</div>
                            <div class="project-panel-summary-value">${stageCount}</div>
                        </div>
                        <div>
                            <div class="project-panel-summary-label">进度</div>
                            <div class="project-panel-summary-value">${progress}%</div>
                        </div>
                    </div>
                    <div class="project-panel-quick-actions">
                        <!-- <button class="btn-secondary" onclick="projectManager.showMemberModal('${project.id}')">添加项目成员</button> -->
                        <button class="btn-secondary" onclick="projectManager.openCollaborationMode('${project.id}')">协同模式</button>
                    </div>
                </div>
                <div class="project-panel-section project-panel-card project-panel-span-2">
                    <div class="project-panel-section-title">流程阶段</div>
                    ${
                      shouldRenderWorkflow
                        ? `
                          <!-- 横向步骤条 -->
                          <div class="project-workflow-steps">
                            ${this.renderWorkflowSteps(sortedStages, selectedStageId)}
                          </div>
                          <!-- 阶段详情展开区域 -->
                          ${sortedStages.map(stage => this.renderStageDetailSection(project, stage)).join('')}
                        `
                        : '<div class="project-panel-empty centered"><div><div style="margin-bottom: 16px;">' +
                          (typeof window.getDefaultIconSvg === 'function'
                            ? window.getDefaultIconSvg(64, 'empty-icon')
                            : '🤝') +
                          '</div><div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">尚未配置协同模式</div><div style="font-size: 14px;">请点击上方"协同模式"按钮，配置项目的协作方式和团队成员</div></div></div>'
                    }
                </div>
                <div class="project-panel-section project-panel-card project-panel-span-2">
                    <div class="project-panel-section-title">项目成员</div>
                    <div class="project-panel-list agent-market-grid" id="projectPanelMembers">加载中...</div>
                </div>
                <div class="project-panel-section project-panel-card project-panel-span-2">
                    <div class="project-panel-section-title">创意详情</div>
                    <div class="project-panel-list" id="projectPanelIdeas">加载中...</div>
                </div>
            </div>
        `;

    panel.style.display = 'flex';
    panel.classList.add('active');
    if (mainContent) {
      mainContent.classList.add('project-panel-open');
    }
    if (chatContainer) {
      chatContainer.style.display = 'none';
    }

    this.renderProjectMembersPanel(project);
    this.renderProjectIdeasPanel(project);
    // 不再需要 renderStageContent，因为阶段详情已经在 renderProjectPanel 中渲染
  }

  async openCollaborationMode(projectId) {
    if (!window.agentCollaboration) {
      window.modalManager?.alert('协同编辑模式暂不可用', 'info');
      return;
    }

    const project = await this.getProject(projectId);
    if (!project) {
      return;
    }

    const hiredAgents = await this.getUserHiredAgents().catch(() => []);
    const assignedIds = project.assignedAgents || [];
    const agents = hiredAgents.filter(agent => assignedIds.includes(agent.id));

    const rawIdeaId = project.ideaId ?? project.linkedIdeas?.[0];
    let chat = null;
    if (rawIdeaId !== undefined) {
      const normalizedIdeaId = this.normalizeIdeaId(rawIdeaId);
      chat =
        (await this.storageManager.getChat(normalizedIdeaId)) ||
        (await this.storageManager.getChat(rawIdeaId));
      if (!chat) {
        const chats = await this.storageManager.getAllChats().catch(() => []);
        const rawKey = this.normalizeIdeaIdForCompare(rawIdeaId);
        chat = chats.find(item => this.normalizeIdeaIdForCompare(item.id) === rawKey);
      }
    }

    const idea = chat?.title || project.name || '未命名创意';

    window.agentCollaboration.open({
      idea,
      agents,
      projectId,
      chat,
      workflowCategory: project.workflowCategory || 'product-development',
      collaborationExecuted: project.collaborationExecuted || false
    });
  }

  switchStage(stageId) {
    if (!this.currentProject || !stageId) {
      return;
    }
    this.currentStageId = stageId;
    this.renderStageContent(this.currentProject, stageId);

    const tabs = document.querySelectorAll('.project-stage-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.stageId === stageId);
    });
  }

  renderStageContent(project, stageId) {
    const container = document.getElementById('projectStageContent');
    if (!container) {
      return;
    }

    // 检查是否已执行协同模式
    if (!project.collaborationExecuted) {
      container.innerHTML = `
        <div class="project-panel-empty centered">
          <div>
            <div style="margin-bottom: 16px;">${typeof window.getDefaultIconSvg === 'function' ? window.getDefaultIconSvg(64, 'empty-icon') : '📋'}</div>
            <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">阶段内容待配置</div>
            <div style="font-size: 14px;">请先完成协同模式配置，确认后即可查看各阶段详情</div>
          </div>
        </div>
      `;
      return;
    }

    const stage = (project.workflow?.stages || []).find(s => s.id === stageId);
    if (!stage) {
      container.innerHTML = '<div class="project-panel-empty">暂无阶段内容</div>';
      return;
    }

    const definition = window.workflowExecutor?.getStageDefinition(stage.id, stage);
    const artifacts = this.getDisplayArtifacts(stage);
    const tab = this.stageTabState[stageId] || 'document';
    const selectedArtifactId = this.stageArtifactState[stageId] || artifacts[0]?.id || null;
    const selectedArtifact =
      artifacts.find(a => a.id === selectedArtifactId) || artifacts[0] || null;
    if (selectedArtifact?.id) {
      this.stageArtifactState[stageId] = selectedArtifact.id;
    }

    const leftArtifactsHTML = artifacts
      .map(artifact => {
        const typeLabel = this.getArtifactTypeLabel(artifact);
        const isActive = artifact.id === selectedArtifact?.id;
        return `
            <div class="project-deliverable-item ${isActive ? 'active' : ''}" onclick="projectManager.openArtifactPreviewPanel('${project.id}', '${stageId}', '${artifact.id}')">
                <div class="project-panel-item-title">${this.escapeHtml(artifact.name || '未命名交付物')}</div>
                <div class="project-panel-item-sub">${typeLabel}</div>
            </div>
        `;
      })
      .join('');

    const actionHTML = this.renderStageAction(project, stage);
    const humanPanelHTML = this.renderHumanInLoopPanel(stage);

    // 新增：显示阶段依赖
    const dependencies = stage.dependencies || [];
    const dependencyHTML =
      dependencies.length > 0
        ? `<div class="stage-dependencies">
           <div class="stage-info-label">
             <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
             </svg>
             依赖阶段
           </div>
           <div class="stage-dependency-list">
             ${dependencies
               .map(d => {
                 const depStage = project.workflow.stages.find(s => s.id === d);
                 if (!depStage) return '';
                 const depStatus = depStage.status || 'pending';
                 const depStatusIcon =
                   depStatus === 'completed' ? '✓' : depStatus === 'active' ? '⚡' : '○';
                 const depStatusClass = `status-${depStatus}`;
                 return `
                 <span class="stage-dependency-tag ${depStatusClass}">
                   <span class="dependency-icon">${depStatusIcon}</span>
                   ${this.escapeHtml(depStage.name)}
                 </span>
               `;
               })
               .join('')}
           </div>
         </div>`
        : '';

    // 新增：显示负责Agent
    const stageAgents = stage.agentRoles || stage.agents || [];
    const agentsHTML =
      stageAgents.length > 0
        ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
           负责成员：${stageAgents
             .map(a => {
               if (typeof a === 'object') {
                 return this.escapeHtml(a.role || a.id);
               }
               return this.escapeHtml(a);
             })
             .join('、')}
         </div>`
        : '';

    // 新增：显示预期交付物
    const outputsDetailed = Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : [];
    const outputs = stage.outputs || [];
    const outputsHTML =
      outputsDetailed.length > 0 || outputs.length > 0
        ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
           预期交付物：${(outputsDetailed.length > 0 ? outputsDetailed : outputs)
             .map(o => {
               if (typeof o === 'string') return this.escapeHtml(o);
               const name = this.escapeHtml(o.name || o.id || '未命名交付物');
               const templates =
                 Array.isArray(o.promptTemplates) && o.promptTemplates.length > 0
                   ? `（模板：${o.promptTemplates.map(p => this.escapeHtml(p)).join('，')}）`
                   : '';
               return `${name}${templates}`;
             })
             .join('、')}
         </div>`
        : '';
    const expectedDeliverables = this.getExpectedDeliverables(stage, definition);
    const selectedDeliverables = this.getStageSelectedDeliverables(stageId, expectedDeliverables);
    const selectedSet = new Set(selectedDeliverables);
    const isSelectionLocked = stage.status !== 'pending' || project?.status === 'in_progress';
    const deliverableChecklistHTML =
      expectedDeliverables.length > 0
        ? `
      <div class="project-deliverable-checklist ${isSelectionLocked ? 'is-locked' : ''}" ${isSelectionLocked ? 'title="已开始执行，交付物选择已锁定"' : ''}>
        <div class="project-deliverable-checklist-title">输出交付物（可选）</div>
        <div class="project-deliverable-checklist-list">
          ${expectedDeliverables
            .map((item, index) => {
              const id = item.id || item.key || `deliverable-${index}`;
              const encodedId = encodeURIComponent(id);
              const label = this.escapeHtml(item.label || item.id || id);
              const checked = selectedSet.has(id) ? 'checked' : '';
              return `
              <label class="project-deliverable-checklist-item">
                <input class="project-deliverable-checklist-input" type="checkbox" ${checked} ${isSelectionLocked ? 'disabled' : ''} onchange="projectManager.toggleStageDeliverable('${stageId}', '${encodedId}', this.checked)">
                <span class="project-deliverable-checklist-label">${label}</span>
              </label>
            `;
            })
            .join('')}
        </div>
      </div>
    `
        : '';
    const missingDeliverables = this.getMissingDeliverables(stage, definition);
    const missingHTML =
      missingDeliverables.length > 0
        ? `<div style="margin-top: 8px; font-size: 12px; color: #b45309;">
           缺失交付物（${missingDeliverables.length}）：${missingDeliverables.map(name => this.escapeHtml(name)).join('、')}
         </div>`
        : '';

    container.innerHTML = `
        <div class="project-stage-split">
            <div class="project-stage-left">
                <div class="project-stage-meta-row">
                    <div>
                        <div class="project-stage-title">${stage.name || stage.id}</div>
                        <div class="project-stage-sub">状态：${this.getStageStatusLabel(stage.status || 'pending')}</div>
                        ${dependencyHTML}
                        ${agentsHTML}
                        ${outputsHTML}
                        ${missingHTML}
                        ${deliverableChecklistHTML}
                    </div>
                    ${actionHTML}
                </div>
                <div class="project-stage-deliverables">
                    ${leftArtifactsHTML || '<div class="project-panel-empty">暂无交付物</div>'}
                </div>
                ${humanPanelHTML}
            </div>
            <div class="project-stage-right">
                <div class="project-stage-tabs">
                    <button class="project-deliverable-tab ${tab === 'document' ? 'active' : ''}" data-tab="document" onclick="projectManager.switchDeliverableTab('${stageId}', 'document')">文档</button>
                    <button class="project-deliverable-tab ${tab === 'code' ? 'active' : ''}" data-tab="code" onclick="projectManager.switchDeliverableTab('${stageId}', 'code')">代码</button>
                    <button class="project-deliverable-tab ${tab === 'preview' ? 'active' : ''}" data-tab="preview" onclick="projectManager.switchDeliverableTab('${stageId}', 'preview')">预览</button>
                </div>
                <div id="projectDeliverableContent" class="project-deliverable-content"></div>
            </div>
        </div>
    `;

    this.renderDeliverableContent(stageId, selectedArtifact, tab);
  }

  renderStageAction(project, stage) {
    const workflowReady = Boolean(window.workflowExecutor);

    // 检查依赖阶段是否完成
    const dependencies = stage.dependencies || [];
    const unmetDependencies = [];

    if (dependencies.length > 0) {
      const stages = project.workflow?.stages || [];
      for (const depId of dependencies) {
        const depStage = stages.find(s => s.id === depId);
        if (depStage && depStage.status !== 'completed') {
          unmetDependencies.push(depStage.name);
        }
      }
    }

    if (stage.status === 'pending') {
      if (project?.status === 'in_progress') {
        return `<button class="btn-secondary" disabled>执行中...</button>`;
      }

      // 如果有未完成的依赖，禁用按钮并显示提示
      if (unmetDependencies.length > 0) {
        const tooltip = `依赖阶段未完成：${unmetDependencies.join('、')}`;
        return `<button class="btn-secondary" disabled title="${tooltip}">依赖未满足</button>`;
      }

      return workflowReady
        ? `<button class="btn-primary" onclick="projectManager.startStageWithSelection('${project.id}', '${stage.id}')">开始执行</button>`
        : `<button class="btn-secondary" disabled title="工作流执行器未就绪">开始执行</button>`;
    }
    if (stage.status === 'active') {
      return `<button class="btn-secondary" disabled>执行中...</button>`;
    }
    return `<button class="btn-secondary" onclick="projectManager.showStageArtifactsModal('${project.id}', '${stage.id}')">查看交付物</button>`;
  }

  renderHumanInLoopPanel(stage) {
    return '';
  }

  getStageStatusLabel(status) {
    const labels = {
      pending: '待执行',
      active: '执行中',
      in_progress: '执行中',
      completed: '已完成',
      blocked: '阻塞中'
    };
    return labels[status] || status;
  }

  /**
   * 计算阶段进度
   * @param {Object} stage - 阶段对象
   * @returns {number} 进度百分比 (0-100)
   */
  calculateStageProgress(stage) {
    if (!stage) return 0;

    // 根据状态返回进度
    if (stage.status === 'completed') {
      return 100;
    }

    if (stage.status === 'pending') {
      return 0;
    }

    // 如果是进行中，根据交付物完成情况计算
    if (stage.status === 'active' || stage.status === 'in_progress') {
      const artifacts = stage.artifacts || [];
      if (artifacts.length === 0) {
        return 50; // 默认50%
      }

      const completedCount = artifacts.filter(a => a.status === 'completed').length;
      return Math.round((completedCount / artifacts.length) * 100);
    }

    return 0;
  }

  /**
   * 获取Agent定义
   * @param {string} agentType - Agent类型ID
   * @returns {Object|null} Agent定义对象
   */
  getAgentDefinition(agentType) {
    const agentDefs = {
      'product-manager': { name: '产品经理', emoji: '📱', icon: '📱' },
      'ui-ux-designer': { name: 'UI/UX设计师', emoji: '🎨', icon: '🎨' },
      'frontend-developer': { name: '前端开发', emoji: '💻', icon: '💻' },
      'backend-developer': { name: '后端开发', emoji: '⚙️', icon: '⚙️' },
      'qa-engineer': { name: '测试工程师', emoji: '🔍', icon: '🔍' },
      devops: { name: '运维工程师', emoji: '🚀', icon: '🚀' },
      marketing: { name: '市场营销', emoji: '📢', icon: '📢' },
      operations: { name: '运营专员', emoji: '📊', icon: '📊' },
      'strategy-design': { name: '战略设计师', emoji: '🎯', icon: '🎯' },
      'tech-lead': { name: '技术负责人', emoji: '👨‍💻', icon: '👨‍💻' }
    };
    return agentDefs[agentType] || null;
  }

  /**
   * 获取交付物类型定义
   * @param {string} artifactType - 交付物类型
   * @returns {Object|null} 交付物类型定义
   */
  getArtifactTypeDefinition(artifactType) {
    const artifactDefs = {
      prd: { name: '产品需求文档', icon: '📋' },
      'user-story': { name: '用户故事', icon: '👤' },
      'feature-list': { name: '功能清单', icon: '📝' },
      design: { name: '设计稿', icon: '🎨' },
      'design-spec': { name: '设计规范', icon: '📐' },
      prototype: { name: '交互原型', icon: '🖼️' },
      code: { name: '代码', icon: '💻' },
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
      'acceptance-criteria-quality': { name: '验收标准质量检查清单', icon: '✅' },
      'ui-design': { name: 'UI设计方案', icon: '🎨' },
      'architecture-doc': { name: '系统架构设计', icon: '🏗️' },
      'marketing-plan': { name: '运营推广方案', icon: '📈' },
      'deploy-doc': { name: '部署文档', icon: '🚀' },
      preview: { name: '可交互预览', icon: '🖥️' },
      'ui-preview': { name: 'UI预览', icon: '🖼️' },
      image: { name: '图片', icon: '🖼️' }
    };
    return artifactDefs[artifactType] || { name: artifactType, icon: '📄' };
  }

  getExpectedDeliverables(stage, definition) {
    if (!stage) return [];
    const outputsDetailed = Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : [];
    const outputs = Array.isArray(stage.outputs) ? stage.outputs : [];
    let expected = [];
    if (outputsDetailed.length > 0) {
      expected = outputsDetailed;
    } else if (outputs.length > 0) {
      expected = outputs;
    } else if (definition?.expectedArtifacts?.length > 0) {
      expected = definition.expectedArtifacts;
    }
    return expected.map(item => {
      if (typeof item === 'string') {
        const def = this.getArtifactTypeDefinition(item);
        return {
          id: item,
          key: this.normalizeDeliverableKey(item),
          label: def?.name || item
        };
      }
      const id = item?.id || item?.type || item?.name || '';
      const label = item?.name || item?.id || item?.type || '未命名交付物';
      return {
        id,
        key: this.normalizeDeliverableKey(id),
        label
      };
    });
  }

  normalizeDeliverableKey(value) {
    if (!value || typeof value !== 'string') {
      return '';
    }
    return value.trim().toLowerCase();
  }

  getMissingDeliverables(stage, definition) {
    const expected = this.getExpectedDeliverables(stage, definition);
    return this.getMissingDeliverablesFromExpected(stage, expected);
  }

  getMissingSelectedDeliverables(stage, definition, selectedIds = []) {
    const expected = this.getExpectedDeliverables(stage, definition);
    if (expected.length === 0) return [];
    const selectedSet = new Set(selectedIds.filter(Boolean));
    const filteredExpected =
      selectedSet.size > 0
        ? expected.filter(item => selectedSet.has(item.id || item.key))
        : expected;
    return this.getMissingDeliverablesFromExpected(stage, filteredExpected);
  }

  getMissingDeliverablesFromExpected(stage, expected = []) {
    if (!expected || expected.length === 0) return [];
    const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
    const actualKeys = new Set();
    artifacts.forEach(artifact => {
      const type = artifact?.type || 'document';
      const typeDef = this.getArtifactTypeDefinition(type);
      [type, artifact?.name, artifact?.fileName, artifact?.id, typeDef?.name].forEach(val => {
        const key = this.normalizeDeliverableKey(val);
        if (key) actualKeys.add(key);
      });
    });
    const missing = [];
    const seen = new Set();
    expected.forEach(item => {
      const key = this.normalizeDeliverableKey(item.key);
      const labelKey = this.normalizeDeliverableKey(item.label);
      const matched = (key && actualKeys.has(key)) || (labelKey && actualKeys.has(labelKey));
      if (!matched) {
        const label = item.label || item.key || '未命名交付物';
        const labelKeyFinal = this.normalizeDeliverableKey(label);
        if (!seen.has(labelKeyFinal)) {
          missing.push(label);
          seen.add(labelKeyFinal);
        }
      }
    });
    return missing;
  }

  getMissingDeliverablesWithReason(stage, expected = [], selectedIds = []) {
    if (!expected || expected.length === 0) return [];
    const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
    const actualKeys = new Set();
    artifacts.forEach(artifact => {
      const type = artifact?.type || 'document';
      const typeDef = this.getArtifactTypeDefinition(type);
      [type, artifact?.name, artifact?.fileName, artifact?.id, typeDef?.name].forEach(val => {
        const key = this.normalizeDeliverableKey(val);
        if (key) actualKeys.add(key);
      });
    });
    const selectedSet = new Set((selectedIds || []).filter(Boolean));
    const missing = [];
    const seen = new Set();
    expected.forEach(item => {
      const key = this.normalizeDeliverableKey(item.key);
      const labelKey = this.normalizeDeliverableKey(item.label);
      const matched = (key && actualKeys.has(key)) || (labelKey && actualKeys.has(labelKey));
      if (!matched) {
        const label = item.label || item.key || '未命名交付物';
        const id = item.id || item.key || label;
        const labelKeyFinal = this.normalizeDeliverableKey(label);
        if (!seen.has(labelKeyFinal)) {
          const isSelected = selectedSet.size === 0 ? true : selectedSet.has(id);
          const reason = isSelected ? '生成失败' : '未勾选';
          missing.push({ label, reason });
          seen.add(labelKeyFinal);
        }
      }
    });
    return missing;
  }

  getStageSelectedDeliverables(stageId, expectedDeliverables) {
    const existing = this.stageDeliverableSelection[stageId];
    if (Array.isArray(existing) && existing.length > 0) {
      return existing;
    }
    const defaults = expectedDeliverables.map(item => item.id || item.key).filter(Boolean);
    this.stageDeliverableSelection[stageId] = defaults;
    if (this.currentProjectId) {
      this.stageDeliverableSelectionByProject[this.currentProjectId] =
        this.stageDeliverableSelection;
      this.persistStageDeliverableSelectionStore();
    }
    return defaults;
  }

  toggleStageDeliverable(stageId, encodedId, checked) {
    const id = decodeURIComponent(encodedId || '');
    if (!id) return;
    const stage = (this.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
    if (!stage || stage.status !== 'pending' || this.currentProject?.status === 'in_progress') {
      return;
    }
    const current = new Set(this.stageDeliverableSelection[stageId] || []);
    if (checked) {
      current.add(id);
    } else {
      current.delete(id);
    }
    this.stageDeliverableSelection[stageId] = Array.from(current);
    if (this.currentProjectId) {
      this.stageDeliverableSelectionByProject[this.currentProjectId] =
        this.stageDeliverableSelection;
      this.persistStageDeliverableSelectionStore();
    }
  }

  async startStageWithSelection(projectId, stageId, reopen = false) {
    if (!window.workflowExecutor) {
      window.modalManager?.alert('工作流执行器未就绪', 'warning');
      return;
    }
    const stage = (this.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
    const definition = window.workflowExecutor?.getStageDefinition(stageId, stage);
    const expectedDeliverables = this.getExpectedDeliverables(stage, definition);
    const selected = this.getStageSelectedDeliverables(stageId, expectedDeliverables);
    if (expectedDeliverables.length > 0 && selected.length === 0) {
      const msg = '请先勾选需要输出的交付物';
      if (window.modalManager) {
        window.modalManager.alert(msg, 'warning');
      } else {
        alert(msg);
      }
      return;
    }
    await window.workflowExecutor.startStage(projectId, stageId, {
      selectedArtifactTypes: selected
    });
    if (reopen) {
      setTimeout(() => this.openProject(projectId), 2000);
    }
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
    return stages
      .map((stage, index) => {
        const definition = window.workflowExecutor?.getStageDefinition(stage.id, stage);
        const isSelected = stage.id === selectedStageId;
        const statusClass = `status-${stage.status || 'pending'}`;
        const selectedClass = isSelected ? 'selected' : '';

        // 状态图标
        const statusIcon =
          {
            pending: '⏸️',
            active: '⚡',
            completed: '✅'
          }[stage.status] || '📋';

        return `
        <div class="workflow-step ${statusClass} ${selectedClass}"
             data-stage-id="${stage.id}"
             onclick="projectManager.selectStage('${stage.id}')">
          <div class="workflow-step-icon">
            <span>${definition?.icon || '📋'}</span>
            <span class="workflow-step-status">${statusIcon}</span>
          </div>
          <div class="workflow-step-title">${stage.name || stage.id}</div>
          <div class="workflow-step-connector"></div>
        </div>
      `;
      })
      .join('');
  }

  /**
   * 渲染阶段详情展开区域
   * @param {Object} project - 项目对象
   * @param {Object} stage - 阶段对象
   * @returns {String} HTML字符串
   */
  renderStageDetailSection(project, stage) {
    const definition = window.workflowExecutor?.getStageDefinition(stage.id, stage);
    const statusText = this.getStageStatusLabel(stage.status || 'pending');
    const statusColor =
      {
        pending: '#9ca3af',
        active: '#3b82f6',
        completed: '#10b981'
      }[stage.status] || '#9ca3af';

    // 渲染Agent列表
    const agentsHTML =
      (stage.agents || []).length > 0
        ? `
      <div class="workflow-stage-agents">
        <div class="workflow-stage-agents-title">
          <span>🤖</span>
          <span>负责数字员工</span>
        </div>
        <div class="workflow-stage-agents-list">
          ${(stage.agents || [])
            .map(agentType => {
              const agentDef = this.getAgentDefinition(agentType);
              return `
              <div class="workflow-stage-agent-tag">
                <span>${agentDef?.icon || '👤'}</span>
                <span>${agentDef?.name || agentType}</span>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `
        : '';

    const expectedDeliverables = this.getExpectedDeliverables(stage, definition);
    const selectedDeliverables = this.getStageSelectedDeliverables(stage.id, expectedDeliverables);
    const selectedSet = new Set(selectedDeliverables);
    const isSelectionLocked = stage.status !== 'pending' || project?.status === 'in_progress';
    const deliverableChecklistHTML =
      expectedDeliverables.length > 0
        ? `
      <div class="project-deliverable-checklist ${isSelectionLocked ? 'is-locked' : ''}" ${isSelectionLocked ? 'title="已开始执行，交付物选择已锁定"' : ''}>
        <div class="project-deliverable-checklist-title">输出交付物（可选）</div>
        <div class="project-deliverable-checklist-list">
          ${expectedDeliverables
            .map((item, index) => {
              const id = item.id || item.key || `deliverable-${index}`;
              const encodedId = encodeURIComponent(id);
              const label = this.escapeHtml(item.label || item.id || id);
              const checked = selectedSet.has(id) ? 'checked' : '';
              return `
              <label class="project-deliverable-checklist-item">
                <input class="project-deliverable-checklist-input" type="checkbox" ${checked} ${isSelectionLocked ? 'disabled' : ''} onchange="projectManager.toggleStageDeliverable('${stage.id}', '${encodedId}', this.checked)">
                <span class="project-deliverable-checklist-label">${label}</span>
              </label>
            `;
            })
            .join('')}
        </div>
      </div>
    `
        : '';

    // 渲染预期交付物
    const expectedArtifactsHTML =
      definition?.expectedArtifacts?.length > 0
        ? `
      <div class="workflow-stage-artifacts">
        <div class="workflow-stage-artifacts-title">
          <span>📋</span>
          <span>预期交付物</span>
        </div>
        <div class="workflow-stage-artifacts-grid">
          ${definition.expectedArtifacts
            .map(artifactType => {
              const artifactDef = this.getArtifactTypeDefinition(artifactType);
              return `
              <div class="workflow-stage-artifact-card" style="opacity: 0.6; cursor: default;">
                <span class="workflow-stage-artifact-icon">${artifactDef?.icon || '📄'}</span>
                <div class="workflow-stage-artifact-info">
                  <div class="workflow-stage-artifact-name">${artifactDef?.name || artifactType}</div>
                  <div class="workflow-stage-artifact-type">待生成</div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `
        : '';

    // 渲染实际交付物（已生成交付物）
    const actualArtifactsHTML =
      (stage.artifacts || []).length > 0
        ? `
      <div class="workflow-stage-artifacts">
        <div class="workflow-stage-artifacts-title">
          <span>📦</span>
          <span>最终交付物 (${stage.artifacts.length})</span>
        </div>
        <div class="workflow-stage-artifacts-grid">
          ${(stage.artifacts || [])
            .map(artifact => {
              const icon = this.getArtifactIcon(artifact.type);
              const typeLabel = this.getArtifactTypeLabel(artifact);
              return `
              <div class="workflow-stage-artifact-card"
                   onclick="projectManager.openArtifactPreviewPanel('${project.id}', '${stage.id}', '${artifact.id}')">
                <span class="workflow-stage-artifact-icon">${icon}</span>
                <div class="workflow-stage-artifact-info">
                  <div class="workflow-stage-artifact-name">${this.escapeHtml(artifact.name || artifact.fileName || '未命名')}</div>
                  <div class="workflow-stage-artifact-type">${typeLabel}</div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `
        : '';
    const missingWithReason = this.getMissingDeliverablesWithReason(
      stage,
      expectedDeliverables,
      selectedDeliverables
    );
    const missingArtifactsHTML =
      missingWithReason.length > 0
        ? `
      <div class="workflow-stage-artifacts">
        <div class="workflow-stage-artifacts-title">
          <span>⚠️</span>
          <span>本次未生成的交付物 (${missingWithReason.length})</span>
        </div>
        <div class="workflow-stage-artifacts-grid">
          ${missingWithReason
            .map(
              item => `
            <div class="workflow-stage-artifact-card" style="opacity: 0.7; cursor: default;">
              <span class="workflow-stage-artifact-icon">📄</span>
              <div class="workflow-stage-artifact-info">
                <div class="workflow-stage-artifact-name">${this.escapeHtml(item.label)}</div>
                <div class="workflow-stage-artifact-type">${this.escapeHtml(item.reason)}</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `
        : '';

    // 操作按钮
    let actionsHTML = '';
    if (stage.status === 'pending') {
      const dependencies = stage.dependencies || [];
      const unmetDependencies = [];
      if (dependencies.length > 0) {
        const stages = project.workflow?.stages || [];
        for (const depId of dependencies) {
          const depStage = stages.find(s => s.id === depId);
          if (depStage && depStage.status !== 'completed') {
            unmetDependencies.push(depStage.name);
          }
        }
      }

      const isBlocked = unmetDependencies.length > 0;
      const workflowReady = Boolean(window.workflowExecutor);

      if (isBlocked) {
        actionsHTML = `
          <button class="btn-secondary" disabled title="依赖阶段未完成：${unmetDependencies.join('、')}" style="opacity: 0.5;">
            🔒 依赖未满足
          </button>
        `;
      } else if (workflowReady) {
        actionsHTML = `
          <button class="btn-primary" onclick="projectManager.startStageWithSelection('${project.id}', '${stage.id}', true)">
            ▶️ 开始执行
          </button>
        `;
      }
    } else if (stage.status === 'completed') {
      // 已完成阶段不显示按钮，用户可以直接点击交付物卡片查看详情
      actionsHTML = '';
    } else if (stage.status === 'active') {
      actionsHTML = `
        <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
          <div style="width: 16px; height: 16px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span style="font-size: 14px; font-weight: 500; color: #3b82f6;">正在执行中...</span>
        </div>
      `;
    }

    return `
      <div class="workflow-stage-detail ${stage.id === this.currentStageId ? 'active' : ''}"
           data-stage-id="${stage.id}">
        <div class="workflow-stage-detail-header">
          <div class="workflow-stage-detail-title">
            <span style="font-size: 36px;">${definition?.icon || '📋'}</span>
            <div>
              <h3>${definition?.name || stage.name}</h3>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">${definition?.description || ''}</p>
            </div>
          </div>
          <div class="workflow-stage-detail-badge" style="background: ${statusColor};">
            ${statusText}
          </div>
        </div>
        <div class="workflow-stage-detail-content">
          ${agentsHTML}
          ${deliverableChecklistHTML}
          ${stage.status === 'completed' ? `${actualArtifactsHTML}${missingArtifactsHTML}` : expectedArtifactsHTML}
        </div>
        ${actionsHTML ? `<div class="workflow-stage-detail-actions">${actionsHTML}</div>` : ''}
      </div>
    `;
  }

  /**
   * 选择阶段（切换展开的阶段详情）
   * @param {String} stageId - 阶段ID
   */
  selectStage(stageId) {
    this.currentStageId = stageId;

    // 更新步骤条选中状态
    document.querySelectorAll('.workflow-step').forEach(step => {
      if (step.dataset.stageId === stageId) {
        step.classList.add('selected');
      } else {
        step.classList.remove('selected');
      }
    });

    // 更新阶段详情展开状态
    document.querySelectorAll('.workflow-stage-detail').forEach(detail => {
      if (detail.dataset.stageId === stageId) {
        detail.classList.add('active');
      } else {
        detail.classList.remove('active');
      }
    });
  }

  /**
   * 查看所有交付物（占位方法）
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   */
  viewAllArtifacts(projectId, stageId) {
    // 可以实现一个模态框显示所有交付物
    console.log('查看所有交付物:', projectId, stageId);
  }

  switchDeliverableTab(stageId, tab) {
    this.stageTabState[stageId] = tab;
    const artifactId = this.stageArtifactState[stageId];
    const stage = (this.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
    const artifact =
      (stage?.artifacts || []).find(a => a.id === artifactId) || stage?.artifacts?.[0];
    this.renderDeliverableContent(stageId, artifact, tab);
    const tabs = document.querySelectorAll('.project-deliverable-tab');
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  }

  selectArtifact(stageId, artifactId) {
    this.stageArtifactState[stageId] = artifactId;
    const stage = (this.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
    const artifact = (stage?.artifacts || []).find(a => a.id === artifactId);
    const tab = this.stageTabState[stageId] || 'document';
    this.renderDeliverableContent(stageId, artifact, tab);
  }

  renderDeliverableContent(stageId, artifact, tab) {
    const container = document.getElementById('projectDeliverableContent');
    if (!container) {
      return;
    }
    if (!artifact) {
      container.innerHTML = '<div class="project-panel-empty">暂无交付物内容</div>';
      return;
    }

    if (tab === 'code') {
      container.innerHTML = `
          <pre class="code-block">${this.escapeHtml(artifact.content || '')}</pre>
          <button class="btn-secondary" onclick="projectManager.openPreviewPanel('${this.currentProjectId}', '${artifact.id}')">立即预览</button>
      `;
      return;
    }
    if (tab === 'preview') {
      if (!window.previewPanel) {
        container.innerHTML = '<div class="project-panel-empty">预览模块未就绪</div>';
        return;
      }
      container.innerHTML = `<div id="previewPanelHost" class="preview-panel-host"></div>`;
      if (typeof window.previewPanel.attachTo === 'function') {
        window.previewPanel.attachTo('previewPanelHost');
      }
      if (typeof window.previewPanel.renderPreview === 'function') {
        window.previewPanel.renderPreview({
          projectId: this.currentProjectId,
          stageId,
          artifact
        });
      }
      return;
    }

    const rendered = window.markdownRenderer
      ? window.markdownRenderer.render(artifact.content || '')
      : this.escapeHtml(artifact.content || '');
    container.innerHTML = `<div class="markdown-body">${rendered}</div>`;
  }

  getArtifactTypeLabel(artifact) {
    if (!artifact || !artifact.type) {
      return '文档';
    }

    // 使用 getArtifactTypeDefinition 获取类型名称
    const def = this.getArtifactTypeDefinition(artifact.type);
    return def.name;
  }

  renderStageArtifacts(stage, projectId, displayArtifacts) {
    if (stage.status !== 'completed') {
      return '';
    }

    if (!displayArtifacts || displayArtifacts.length === 0) {
      return '';
    }

    if (displayArtifacts.length > 3) {
      return '';
    }

    return `
            <div class="project-panel-list" style="margin-top: 10px;">
                ${displayArtifacts
                  .map(
                    artifact => `
                    <div class="project-panel-item">
                        <div class="project-panel-item-main">
                            <div class="project-panel-item-title">${this.escapeHtml(artifact.name || '未命名交付物')}</div>
                            <div class="project-panel-item-sub">${this.escapeHtml(artifact.type || 'deliverable')}</div>
                        </div>
                        <button class="btn-secondary" onclick="projectManager.openKnowledgeFromArtifact('${projectId}', '${artifact.id}')" style="padding: 4px 10px; font-size: 12px;">
                            查看
                        </button>
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  }

  getDocArtifacts(stage) {
    const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
    const docTypes = new Set([
      'prd',
      'ui-design',
      'architecture-doc',
      'test-report',
      'deploy-doc',
      'marketing-plan',
      'document'
    ]);
    return artifacts
      .map(artifact => ({
        ...artifact,
        type: artifact.type || 'document'
      }))
      .filter(artifact => docTypes.has(artifact.type));
  }

  getDisplayArtifacts(stage) {
    const docArtifacts = this.getDocArtifacts(stage);
    if (docArtifacts.length > 0) {
      return docArtifacts;
    }
    const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
    return artifacts.map(artifact => ({
      ...artifact,
      type: artifact.type || 'document'
    }));
  }

  async openKnowledgeFromArtifact(projectId, artifactId) {
    if (!this.storageManager || !window.modalManager) {
      return;
    }

    const knowledgeId = `knowledge-${artifactId}`;
    let item = await this.storageManager.getKnowledge(knowledgeId);
    if (!item) {
      const artifact = await this.storageManager.getArtifact(artifactId);
      if (!artifact) {
        window.modalManager.alert('未找到交付物内容', 'warning');
        return;
      }
      item = {
        title: artifact.name || '交付物',
        content: artifact.content || ''
      };
    }

    const rendered = window.markdownRenderer
      ? window.markdownRenderer.render(item.content || '')
      : item.content || '';
    const contentHTML = `
            <div style="display: grid; gap: 12px;">
                <div style="font-size: 18px; font-weight: 600;">${this.escapeHtml(item.title || '知识条目')}</div>
                <div class="markdown-body">${rendered}</div>
            </div>
        `;
    window.modalManager.showCustomModal('知识查看', contentHTML, 'knowledgeDetailModal');
  }

  confirmStage(stageId) {
    window.modalManager?.alert(`已确认阶段 ${stageId}`, 'success');
  }

  requestStageRevision(stageId) {
    window.modalManager?.alert(`已退回阶段 ${stageId}，请补充意见`, 'warning');
  }

  addStageNote(stageId) {
    const note = prompt('请输入补充意见：');
    if (!note) {
      return;
    }
    window.modalManager?.alert('已记录补充意见', 'success');
  }

  async openPreviewPanel(projectId, artifactId = null) {
    let project = this.currentProject;
    if (!project || (projectId && project.id !== projectId)) {
      project = await this.getProject(projectId);
      if (!project) {
        return;
      }
      this.currentProject = project;
      this.currentProjectId = project.id;
    }

    let stageId = this.currentStageId;
    if (!stageId) {
      stageId = project.workflow?.stages?.[0]?.id || null;
    }
    if (!stageId) {
      window.modalManager?.alert('暂无可预览的阶段', 'info');
      return;
    }

    this.currentStageId = stageId;
    this.stageTabState[stageId] = 'preview';
    if (artifactId) {
      this.stageArtifactState[stageId] = artifactId;
    }
    this.renderStageContent(project, stageId);
  }

  showStageArtifactsModal(projectId, stageId) {
    const project = this.currentProjectId === projectId ? this.currentProject : null;
    const stage = project?.workflow?.stages?.find(s => s.id === stageId);
    const artifacts = stage ? this.getDisplayArtifacts(stage) : [];

    if (!window.modalManager) {
      return;
    }

    if (artifacts.length === 0) {
      window.modalManager.alert('暂无交付物', 'info');
      return;
    }

    const listHTML = `
            <div style="display: grid; gap: 10px;">
                ${artifacts
                  .map(
                    artifact => `
                    <div class="project-panel-item">
                        <div class="project-panel-item-main">
                            <div class="project-panel-item-title">${this.escapeHtml(artifact.name || '未命名交付物')}</div>
                            <div class="project-panel-item-sub">${this.escapeHtml(artifact.type || 'deliverable')}</div>
                        </div>
                        <button class="btn-secondary" onclick="projectManager.openKnowledgeFromArtifact('${projectId}', '${artifact.id}')" style="padding: 4px 10px; font-size: 12px;">
                            查看
                        </button>
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;

    window.modalManager.showCustomModal('交付物列表', listHTML, 'stageArtifactsModal');
  }

  /**
   * 关闭项目右侧面板
   */
  closeProjectPanel() {
    const panel = document.getElementById('projectPanel');
    const body = document.getElementById('projectPanelBody');
    const mainContent = document.querySelector('.main-content');
    const chatContainer = document.getElementById('chatContainer');

    if (panel) {
      panel.classList.remove('active');
      panel.style.display = 'none';
    }
    if (body) {
      body.innerHTML = '';
    }
    if (mainContent) {
      mainContent.classList.remove('project-panel-open');
    }
    if (chatContainer) {
      chatContainer.style.display = 'flex';
    }

    this.currentProjectId = null;
    this.currentProject = null;
    this.updateProjectSelection(null);
  }

  /**
   * 渲染项目成员（右侧面板）
   * @param {Object} project - 项目对象
   */
  async renderProjectMembersPanel(project) {
    const container = document.getElementById('projectPanelMembers');
    if (!container) {
      console.warn('[项目成员面板] 容器不存在');
      return;
    }

    const assignedIds = project.assignedAgents || [];
    console.log('[项目成员面板] 分配的成员ID:', assignedIds);

    if (assignedIds.length === 0) {
      container.classList.add('is-empty');
      container.innerHTML = '<div class="project-panel-empty centered">暂未添加成员</div>';
      return;
    }

    // 尝试从已雇佣列表获取成员
    const hiredAgents = await this.getUserHiredAgents();
    console.log('[项目成员面板] 已雇佣的成员:', hiredAgents.length);

    let members = hiredAgents.filter(agent => assignedIds.includes(agent.id));
    console.log('[项目成员面板] 从已雇佣列表匹配的成员:', members.length);

    // 如果没有匹配到已雇佣的成员，则根据成员类型生成虚拟成员卡片
    if (members.length === 0) {
      console.log('[项目成员面板] 使用成员类型生成虚拟成员卡片');
      members = assignedIds.map(agentType => {
        const agentDef = this.getAgentDefinition(agentType);
        return {
          id: agentType,
          name: agentDef?.name || agentType,
          nickname: agentDef?.name || agentType,
          emoji: agentDef?.icon || agentDef?.emoji || '👤',
          desc: `负责${agentDef?.name || agentType}相关工作`,
          skills: []
        };
      });
    }

    container.classList.remove('is-empty');
    container.innerHTML = members
      .map(
        agent => `
            <div class="agent-card hired">
                <div class="agent-card-header">
                    <div class="agent-card-avatar">${typeof window.getAgentIconSvg === 'function' ? window.getAgentIconSvg(agent.emoji || agent.name, 32, 'agent-card-icon') : agent.emoji}</div>
                    <div class="agent-card-info">
                        <div class="agent-card-name">${agent.nickname || agent.name}</div>
                        <div class="agent-card-role">${agent.name}</div>
                    </div>
                </div>
                <div class="agent-card-desc">${agent.desc || '擅长当前项目的核心任务执行'}</div>
                <div class="agent-card-skills">
                    ${(agent.skills || []).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>
        `
      )
      .join('');
  }

  /**
   * 渲染创意列表（右侧面板）
   * @param {Object} project - 项目对象
   */
  async renderProjectIdeasPanel(project) {
    const container = document.getElementById('projectPanelIdeas');
    if (!container) {
      return;
    }

    const rawIdeaId = project.ideaId ?? project.linkedIdeas?.[0];
    if (!rawIdeaId) {
      container.innerHTML = '<div class="project-panel-empty">暂无创意</div>';
      return;
    }

    try {
      const ideaId = this.normalizeIdeaId(rawIdeaId);
      let chat = await this.storageManager.getChat(ideaId);
      if (!chat && ideaId !== rawIdeaId) {
        chat = await this.storageManager.getChat(rawIdeaId);
      }
      if (!chat) {
        const chats = await this.storageManager.getAllChats().catch(() => []);
        const rawKey = this.normalizeIdeaIdForCompare(rawIdeaId);
        chat = chats.find(item => this.normalizeIdeaIdForCompare(item.id) === rawKey);
      }
      if (!chat) {
        container.innerHTML = '<div class="project-panel-empty">创意信息缺失</div>';
        return;
      }

      const reports = await this.getReportsByChatId(chat.id ?? ideaId ?? rawIdeaId);
      const analysis = reports.analysis;
      const business = reports.business;
      const proposal = reports.proposal;

      const analysisSummary = analysis?.data?.coreDefinition || analysis?.data?.problem || '';

      container.innerHTML = `
            <div class="project-idea-card">
                <div class="project-idea-title">💡 ${this.escapeHtml(chat.title || '未命名创意')}</div>
                <div class="project-idea-meta">${this.formatTimeAgo(chat.updatedAt || Date.now())}</div>
                <div class="project-idea-summary">${this.escapeHtml(analysisSummary || '暂无分析报告摘要')}</div>
                <div class="project-idea-actions">
                    <button class="btn-secondary" onclick="projectManager.openIdeaChat('${chat.id}')">查看对话</button>
                    <button class="btn-secondary" onclick="projectManager.viewIdeaReport('${chat.id}', 'analysis')" ${analysis ? '' : 'disabled'}>分析报告</button>
                    <button class="btn-secondary" onclick="projectManager.viewIdeaReport('${chat.id}', 'business')" ${business ? '' : 'disabled'}>商业计划书</button>
                    <button class="btn-secondary" onclick="projectManager.viewIdeaReport('${chat.id}', 'proposal')" ${proposal ? '' : 'disabled'}>立项材料</button>
                </div>
            </div>
        `;
    } catch (error) {
      container.innerHTML = '<div class="project-panel-empty">创意加载失败</div>';
    }
  }

  /**
   * 渲染知识库摘要（右侧面板）
   * @param {Object} project - 项目对象
   */
  async renderProjectKnowledgePanel(project) {
    const container = document.getElementById('projectPanelKnowledge');
    if (!container || !this.storageManager) {
      return;
    }

    try {
      const items = await this.storageManager.getKnowledgeByProject(project.id);
      if (!items || items.length === 0) {
        container.innerHTML = '<div class="project-panel-empty">暂无知识沉淀</div>';
        return;
      }

      const previewItems = items.slice(0, 4).map(
        item => `
                <div class="project-panel-item">
                    <div class="project-panel-item-main">
                        <div class="project-panel-item-title">${this.escapeHtml(item.title || '未命名内容')}</div>
                        <div class="project-panel-item-sub">${this.formatTimeAgo(item.createdAt || Date.now())}</div>
                    </div>
                </div>
            `
      );

      container.innerHTML = previewItems.join('');
    } catch (error) {
      container.innerHTML = '<div class="project-panel-empty">加载失败</div>';
    }
  }

  async getReportsByChatId(chatId) {
    if (!this.storageManager) {
      return {};
    }
    try {
      const reports = await this.storageManager.getAllReports();
      const result = {};
      const rankStatus = status => {
        if (status === 'completed') return 4;
        if (status === 'generating') return 3;
        if (status === 'error') return 2;
        if (status === 'idle') return 1;
        return 0;
      };
      const hasData = report => {
        if (!report?.data) return false;
        if (typeof report.data.document === 'string' && report.data.document.trim().length > 0)
          return true;
        if (Array.isArray(report.data.chapters) && report.data.chapters.length > 0) return true;
        return false;
      };
      reports
        .filter(
          r => this.normalizeIdeaIdForCompare(r.chatId) === this.normalizeIdeaIdForCompare(chatId)
        )
        .forEach(r => {
          const existing = result[r.type];
          if (!existing) {
            result[r.type] = r;
            return;
          }
          const rankDiff = rankStatus(r.status) - rankStatus(existing.status);
          if (rankDiff > 0) {
            result[r.type] = r;
            return;
          }
          if (rankDiff < 0) {
            return;
          }
          const dataDiff = Number(hasData(r)) - Number(hasData(existing));
          if (dataDiff > 0) {
            result[r.type] = r;
            return;
          }
          const rTime = Number(r.endTime || r.startTime || 0);
          const eTime = Number(existing.endTime || existing.startTime || 0);
          if (rTime > eTime) {
            result[r.type] = r;
          }
        });
      return result;
    } catch (error) {
      return {};
    }
  }

  async viewIdeaReport(chatId, type) {
    if (!window.modalManager || !this.storageManager) {
      return;
    }
    let chat = null;
    try {
      chat = await this.storageManager.getChat(chatId);
      if (!chat) {
        const allChats = await this.storageManager.getAllChats().catch(() => []);
        chat = allChats.find(
          item => this.normalizeIdeaIdForCompare(item.id) === this.normalizeIdeaIdForCompare(chatId)
        );
      }
    } catch (error) {}

    if (window.state && chat) {
      window.state.currentChat = chat.id;
      if (chat.userData) {
        window.state.userData = { ...chat.userData };
      }
    }

    const reports = await this.storageManager.getAllReports();
    const report = reports.find(
      r =>
        this.normalizeIdeaIdForCompare(r.chatId) === this.normalizeIdeaIdForCompare(chatId) &&
        r.type === type
    );
    if (!report) {
      window.modalManager.alert('暂无报告内容', 'info');
      return;
    }

    const data = report.data || {};
    const renderMarkdown = text => {
      const raw = text || '';
      return window.markdownRenderer ? window.markdownRenderer.render(raw) : this.escapeHtml(raw);
    };
    const safeText = text => this.escapeHtml(text ?? '');
    const normalizeArray = value => (Array.isArray(value) ? value : []);
    const normalizeObject = value => (value && typeof value === 'object' ? value : {});
    const normalizeText = (value, fallback = '') =>
      value === undefined || value === null || value === '' ? fallback : value;

    const buildChaptersHTML = chapters =>
      chapters
        .map(
          (chapter, index) => `
            <div class="report-section">
                <div class="report-section-title">${index + 1}. ${safeText(chapter.title || `章节 ${index + 1}`)}</div>
                <div class="document-chapter">
                    <div class="chapter-content" style="padding-left: 0;">
                        <div class="markdown-body">${renderMarkdown(chapter.content || '')}</div>
                    </div>
                </div>
            </div>
        `
        )
        .join('');

    const buildAnalysisHTML = reportData => {
      // 兼容性处理：提取嵌套的report字段
      if (reportData && reportData.report && !reportData.chapters) {
        console.warn('[项目面板] 检测到旧数据格式，自动提取 report 字段');
        reportData = reportData.report;
      }

      let chapters = reportData?.chapters;
      if (!chapters) {
        return '';
      }

      // 数组格式转换为对象格式
      if (Array.isArray(chapters)) {
        console.warn('[项目面板] chapters是数组格式，转换为对象格式');
        const chaptersObj = {};
        chapters.forEach((ch, idx) => {
          chaptersObj[`chapter${idx + 1}`] = ch;
        });
        chapters = chaptersObj;
        reportData.chapters = chaptersObj;
      }

      if (Array.isArray(chapters)) {
        return buildChaptersHTML(chapters);
      }

      const ch1 = normalizeObject(chapters.chapter1);
      const ch2 = normalizeObject(chapters.chapter2);
      const ch3 = normalizeObject(chapters.chapter3);
      const ch4 = normalizeObject(chapters.chapter4);
      const ch5 = normalizeObject(chapters.chapter5);
      const ch6 = normalizeObject(chapters.chapter6);
      const ch2Assumptions = normalizeArray(ch2.assumptions);
      const ch3Limitations = normalizeArray(ch3.limitations);
      const ch4Stages = normalizeArray(ch4.stages);
      const ch5BlindSpots = normalizeArray(ch5.blindSpots);
      const ch5KeyQuestions = normalizeArray(ch5.keyQuestions);
      const ch6ImmediateActions = normalizeArray(ch6.immediateActions);
      const ch6ExtendedIdeas = normalizeArray(ch6.extendedIdeas);
      const ch6MidtermPlan = normalizeObject(ch6.midtermPlan);
      const ch3Prerequisites = normalizeObject(ch3.prerequisites);
      const coreDefinition = safeText(normalizeText(reportData.coreDefinition));
      const problem = safeText(normalizeText(reportData.problem));
      const solution = safeText(normalizeText(reportData.solution));
      const targetUser = safeText(normalizeText(reportData.targetUser));

      return `
        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch1.title, '创意定义与演化'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 原始表述</h4>
                    <div class="highlight-box">
                        ${safeText(normalizeText(ch1.originalIdea || reportData.initialIdea))}
                    </div>

                    <h4>2. 核心定义（对话后）</h4>
                    <p><strong>一句话概括：</strong>${coreDefinition}</p>

                    <h4>3. 价值主张</h4>
                    <ul>
                        <li><strong>解决的根本问题：</strong>${problem}</li>
                        <li><strong>提供的独特价值：</strong>${solution}</li>
                        <li><strong>目标受益者：</strong>${targetUser}</li>
                    </ul>

                    <h4>4. 演变说明</h4>
                    <p>${safeText(normalizeText(ch1.evolution))}</p>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch2.title, '核心洞察与根本假设'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 识别的根本需求</h4>
                    <div class="highlight-box">
                        <strong>表层需求：</strong>${safeText(normalizeText(ch2.surfaceNeed))}<br><br>
                        <strong>深层动力：</strong>${safeText(normalizeText(ch2.deepMotivation))}
                    </div>

                    <h4>2. 核心假设清单</h4>
                    <p><strong>创意成立所依赖的关键前提（未经完全验证）：</strong></p>
                    <ul>
                        ${ch2Assumptions.map(item => `<li>${safeText(item)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch3.title, '边界条件与应用场景'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 理想应用场景</h4>
                    <div class="highlight-box">
                        ${safeText(normalizeText(ch3.idealScenario))}
                    </div>

                    <h4>2. 潜在限制因素</h4>
                    <p><strong>创意在以下情况下可能效果打折或失效：</strong></p>
                    <ul>
                        ${ch3Limitations.map(item => `<li>${safeText(item)}</li>`).join('')}
                    </ul>

                    <h4>3. 必要前置条件</h4>
                    <div class="analysis-grid">
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🔧</div>
                                <div class="analysis-card-title">技术基础</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch3Prerequisites.technical))}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">💰</div>
                                <div class="analysis-card-title">资源要求</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch3Prerequisites.resources))}
                            </div>
                        </div>
                        <div class="analysis-card">
                            <div class="analysis-card-header">
                                <div class="analysis-icon">🤝</div>
                                <div class="analysis-card-title">合作基础</div>
                            </div>
                            <div class="analysis-card-content">
                                ${safeText(normalizeText(ch3Prerequisites.partnerships))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch4.title, '可行性分析与关键挑战'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 实现路径分解</h4>
                    <p><strong>将大创意拆解为关键模块/发展阶段：</strong></p>
                    <ol>
                        ${ch4Stages
                          .map(
                            (stage, idx) => `
                            <li><strong>${safeText(normalizeText(stage?.stage, `阶段 ${idx + 1}`))}：</strong>${safeText(
                              normalizeText(stage?.goal)
                            )} - ${safeText(normalizeText(stage?.tasks))}</li>
                        `
                          )
                          .join('')}
                    </ol>

                    <h4>2. 最大障碍预判</h4>
                    <div class="highlight-box">
                        <strong>⚠️ 最大单一风险点：</strong>${safeText(normalizeText(ch4.biggestRisk))}<br><br>
                        <strong>预防措施：</strong>${safeText(normalizeText(ch4.mitigation))}
                    </div>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch5.title, '思维盲点与待探索问题'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 对话中暴露的空白</h4>
                    <div class="highlight-box">
                        <strong>⚠️ 未深入考虑的领域：</strong>
                        <ul style="margin-top: 12px; margin-bottom: 0;">
                          ${ch5BlindSpots.map(item => `<li>${safeText(item)}</li>`).join('')}
                        </ul>
                    </div>

                    <h4>2. 关键待验证问题</h4>
                    <p><strong>以下问题需通过调研、实验或原型才能回答：</strong></p>
                    <div class="analysis-grid">
                        ${ch5KeyQuestions
                          .map(
                            (item, idx) => `
                            <div class="analysis-card">
                                <div class="analysis-card-header">
                                    <div class="analysis-icon">❓</div>
                                    <div class="analysis-card-title">决定性问题 ${idx + 1}</div>
                                </div>
                                <div class="analysis-card-content">
                                    ${safeText(normalizeText(item?.question))}<br><br>
                                    <strong>验证方法：</strong>${safeText(normalizeText(item?.validation))}
                                </div>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            </div>
        </div>

        <div class="report-section">
            <div class="report-section-title">${safeText(normalizeText(ch6.title, '结构化行动建议'))}</div>
            <div class="document-chapter">
                <div class="chapter-content" style="padding-left: 0;">
                    <h4>1. 立即验证步骤（下周内）</h4>
                    <div class="highlight-box">
                        <strong>🎯 本周行动清单：</strong>
                        <ul style="margin-top: 12px; margin-bottom: 0;">
                            ${ch6ImmediateActions.map(item => `<li>${safeText(item)}</li>`).join('')}
                        </ul>
                    </div>

                    <h4>2. 中期探索方向（1-3个月）</h4>
                    <p><strong>为解答待探索问题，规划以下研究计划：</strong></p>
                    <ul>
                        <li><strong>用户研究：</strong>${safeText(normalizeText(ch6MidtermPlan.userResearch))}</li>
                        <li><strong>市场调研：</strong>${safeText(normalizeText(ch6MidtermPlan.marketResearch))}</li>
                        <li><strong>原型开发：</strong>${safeText(normalizeText(ch6MidtermPlan.prototyping))}</li>
                        <li><strong>合作探索：</strong>${safeText(normalizeText(ch6MidtermPlan.partnerships))}</li>
                    </ul>

                    <h4>3. 概念延伸提示</h4>
                    <p><strong>对话中衍生的关联创意方向：</strong></p>
                    <ul>
                        ${ch6ExtendedIdeas.map(item => `<li>${safeText(item)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
      `;
    };

    const metaHTML =
      type === 'analysis' ? `<div class="report-meta">项目面板 · 只读预览</div>` : '';
    let contentHTML = '';
    if (type === 'analysis') {
      // 检查数据是否有效
      if (!data || !data.chapters) {
        contentHTML =
          metaHTML +
          `
          <div style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
              暂无分析报告内容
            </div>
            <div style="font-size: 14px; color: var(--text-secondary);">
              报告数据不完整或格式错误
            </div>
          </div>
        `;
      } else {
        contentHTML = metaHTML + buildAnalysisHTML(data);
      }
    } else if (type === 'business' || type === 'proposal') {
      const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
      const ideaTitle = chat?.userData?.idea || chat?.title || '创意项目';
      if (data.document) {
        contentHTML = `
          <div class="report-section">
              <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid var(--border); margin-bottom: 30px;">
                  <h1 style="font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                      ${safeText(ideaTitle)}
                  </h1>
                  <p style="font-size: 16px; color: var(--text-secondary);">
                      ${typeTitle} · AI生成于 ${new Date(data.timestamp || report.timestamp || Date.now()).toLocaleDateString()}
                  </p>
                  ${
                    data.costStats || report.costStats
                      ? `<p style="font-size: 14px; color: var(--text-tertiary); margin-top: 8px;">
                          使用 ${data.totalTokens || report.totalTokens || ''} tokens · 成本 ${
                            (data.costStats || report.costStats)?.costString || ''
                          }
                        </p>`
                      : ''
                  }
              </div>

              <div class="markdown-content" style="line-height: 1.8; font-size: 15px;">
                  ${renderMarkdown(data.document)}
              </div>
          </div>
        `;
      } else if (data.chapters) {
        const chapters = Array.isArray(data.chapters)
          ? data.chapters
          : Object.values(data.chapters || {});
        contentHTML = `
          <div class="report-section">
              <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid var(--border); margin-bottom: 30px;">
                  <h1 style="font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                      ${safeText(ideaTitle)}
                  </h1>
                  <p style="font-size: 16px; color: var(--text-secondary);">
                      ${typeTitle} · AI生成于 ${new Date(data.timestamp || report.timestamp || Date.now()).toLocaleDateString()}
                  </p>
                  ${
                    data.costStats || report.costStats
                      ? `<p style="font-size: 14px; color: var(--text-tertiary); margin-top: 8px;">
                          使用 ${data.totalTokens || report.totalTokens || ''} tokens · 成本 ${
                            (data.costStats || report.costStats)?.costString || ''
                          }
                        </p>`
                      : ''
                  }
              </div>

              ${chapters
                .map(
                  (chapter, index) => `
                    <div class="report-section" style="margin-bottom: 40px;">
                        <div class="report-section-title">${index + 1}. ${safeText(
                          chapter.title || `章节 ${index + 1}`
                        )}</div>
                        <div class="document-chapter">
                            <div class="chapter-content" style="padding-left: 0;">
                                <p style="color: var(--text-secondary); margin-bottom: 20px;">
                                    <strong>分析师：</strong>${
                                      typeof window.getAgentIconSvg === 'function'
                                        ? window.getAgentIconSvg(
                                            chapter.emoji || chapter.agent,
                                            16,
                                            'agent-inline-icon'
                                          )
                                        : ''
                                    } ${safeText(chapter.agent || 'AI分析师')}
                                </p>

                                <div class="markdown-content" style="line-height: 1.8; font-size: 15px;">
                                    ${chapter.content ? renderMarkdown(chapter.content) : '<p style="color: var(--text-secondary);">内容生成中...</p>'}
                                </div>
                            </div>
                        </div>
                    </div>
                `
                )
                .join('')}

              <div style="text-align: center; padding: 30px 0; border-top: 2px solid var(--border); margin-top: 40px;">
                  <p style="color: var(--text-secondary); font-size: 14px;">
                      本报告由 ThinkCraft AI 自动生成 | 数据仅供参考
                  </p>
              </div>
          </div>
        `;
      }
    } else if (data.chapters) {
      const chapters = Array.isArray(data.chapters)
        ? data.chapters
        : Object.values(data.chapters || {});
      contentHTML = metaHTML + buildChaptersHTML(chapters);
    } else {
      const summary = data.coreDefinition || data.problem || data.solution || '';
      contentHTML =
        metaHTML + `<div class="project-panel-empty">${safeText(summary || '暂无报告内容')}</div>`;
    }

    if (!contentHTML) {
      contentHTML = `${metaHTML}<div class="project-panel-empty">暂无报告内容</div>`;
    }

    const modalTitle =
      type === 'analysis' ? '分析报告' : type === 'business' ? '商业计划书' : '产品立项材料';
    window.modalManager.showCustomModal(modalTitle, contentHTML, 'projectIdeaReportModal');
  }

  /**
   * 显示成员管理弹窗
   * @param {String} projectId - 项目ID
   */
  async showMemberModal(projectId) {
    if (!window.modalManager) {
      alert('成员管理功能暂不可用');
      return;
    }

    const project = await this.getProject(projectId);
    if (!project) {
      return;
    }

    this.memberModalProjectId = projectId;

    const modalHTML = `
            <div class="report-tabs">
                <button class="report-tab active" onclick="projectManager.switchMemberModalTab('market')">数字员工市场</button>
                <button class="report-tab" onclick="projectManager.switchMemberModalTab('hired')">已雇佣</button>
            </div>
            <div id="memberMarketTab" class="report-tab-content active">
                <div id="memberMarketList" class="agent-market-grid"></div>
            </div>
            <div id="memberHiredTab" class="report-tab-content">
                <div id="memberHiredList" class="agent-market-grid"></div>
            </div>
        `;

    window.modalManager.showCustomModal('添加项目成员', modalHTML, 'projectMemberModal');
    this.switchMemberModalTab('market');
  }

  switchMemberModalTab(tab) {
    const modal = document.getElementById('projectMemberModal');
    if (!modal) {
      return;
    }

    const tabs = modal.querySelectorAll('.report-tab');
    const marketTab = document.getElementById('memberMarketTab');
    const hiredTab = document.getElementById('memberHiredTab');

    tabs.forEach(t => t.classList.remove('active'));

    if (tab === 'market') {
      tabs[0]?.classList.add('active');
      if (marketTab) {
        marketTab.classList.add('active');
      }
      if (hiredTab) {
        hiredTab.classList.remove('active');
      }
      this.renderMemberMarket();
    } else {
      tabs[1]?.classList.add('active');
      if (marketTab) {
        marketTab.classList.remove('active');
      }
      if (hiredTab) {
        hiredTab.classList.add('active');
      }
      this.renderMemberHired();
    }
  }

  async renderMemberMarket() {
    const container = document.getElementById('memberMarketList');
    if (!container) {
      return;
    }

    const project = await this.getProject(this.memberModalProjectId);
    if (!project) {
      return;
    }

    const agentMarket = await this.getAgentMarketList(
      project.workflowCategory || 'product-development'
    );
    const hiredAgents = await this.getUserHiredAgents();
    const hiredIds = project.assignedAgents || [];
    const assignedAgents = hiredAgents.filter(agent => hiredIds.includes(agent.id));
    const recommended = this.getRecommendedAgentsForStage(project, this.currentStageId);

    container.innerHTML = agentMarket
      .map(agent => {
        const isAssigned = assignedAgents.some(
          item => item.type === agent.id || item.id === agent.id
        );
        const isRecommended = recommended.includes(agent.id);
        return `
                <div class="agent-card ${isAssigned ? 'hired' : ''}">
                    <div class="agent-card-header">
                        <div class="agent-card-avatar">${typeof window.getAgentIconSvg === 'function' ? window.getAgentIconSvg(agent.emoji || agent.name, 32, 'agent-card-icon') : agent.emoji}</div>
                        <div class="agent-card-info">
                            <div class="agent-card-name">${agent.name}</div>
                            <div class="agent-card-role">${agent.role || agent.level || ''}</div>
                        </div>
                    </div>
                    <div class="agent-card-desc">${agent.desc}</div>
                    <div class="agent-card-skills">
                        ${agent.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                    ${isRecommended ? '<div class="agent-card-badge">推荐</div>' : ''}
                    <div class="agent-card-actions">
                        ${
                          isAssigned
                            ? '<button class="hire-btn hired" disabled>✓ 已加入</button>'
                            : `<button class="hire-btn" onclick="projectManager.hireAgentToProject('${project.id}', '${agent.id}')">加入</button>`
                        }
                    </div>
                </div>
            `;
      })
      .join('');
  }

  async renderMemberHired() {
    const container = document.getElementById('memberHiredList');
    if (!container) {
      return;
    }

    const project = await this.getProject(this.memberModalProjectId);
    if (!project) {
      return;
    }

    const hiredAgents = await this.getUserHiredAgents();
    const hiredIds = project.assignedAgents || [];
    const assignedAgents = hiredAgents.filter(agent => hiredIds.includes(agent.id));

    if (assignedAgents.length === 0) {
      container.innerHTML = '<div class="project-panel-empty">暂无雇佣成员</div>';
      return;
    }

    container.innerHTML = assignedAgents
      .map(
        agent => `
            <div class="agent-card hired">
                <div class="agent-card-header">
                    <div class="agent-card-avatar">${typeof window.getAgentIconSvg === 'function' ? window.getAgentIconSvg(agent.emoji || agent.name, 32, 'agent-card-icon') : agent.emoji}</div>
                    <div class="agent-card-info">
                        <div class="agent-card-name">${agent.nickname || agent.name}</div>
                        <div class="agent-card-role">${agent.name}</div>
                    </div>
                </div>
                <div class="agent-card-desc">${agent.desc}</div>
                <div class="agent-card-skills">
                    ${agent.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
                <div class="agent-card-actions">
                    <button class="btn-secondary" onclick="projectManager.fireAgentFromProject('${project.id}', '${agent.id}')">解雇</button>
                </div>
            </div>
        `
      )
      .join('');
  }

  async hireAgentToProject(projectId, agentId) {
    const project = await this.getProject(projectId);
    if (!project) {
      return;
    }

    const userId = this.getUserId();
    const response = await this.fetchWithAuth(`${this.apiUrl}/api/agents/hire`, {
      method: 'POST',
      headers: this.buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ userId, agentType: agentId })
    }).catch(() => null);
    if (!response || !response.ok) {
      window.modalManager?.alert('雇佣失败，请稍后重试', 'error');
      return;
    }
    const result = await response.json();
    const hiredAgent = result.data;

    if (hiredAgent) {
      const existing = Array.isArray(this.cachedHiredAgents) ? this.cachedHiredAgents : [];
      this.cachedHiredAgents = [...existing, hiredAgent];
      this.hiredAgentsFetchedAt = Date.now();
      this.hiredAgentsPromise = null;
    }

    const assignedAgents = Array.from(new Set([...(project.assignedAgents || []), hiredAgent.id]));
    const updatedProject = await this.updateProject(
      projectId,
      { assignedAgents },
      { allowFallback: true }
    );
    const viewProject = updatedProject || { ...project, assignedAgents };
    this.renderProjectMembersPanel(viewProject);
    this.renderMemberMarket();
    this.renderMemberHired();
  }

  async fireAgentFromProject(projectId, agentId) {
    const project = await this.getProject(projectId);
    if (!project) {
      return;
    }

    const hiredAgents = await this.getUserHiredAgents();
    const agent = hiredAgents.find(item => item.id === agentId);
    const agentName = agent?.nickname || agent?.name || '该成员';

    window.modalManager?.confirm(
      `确认解雇该数字员工？\n\n解雇后该岗位将不再参与当前项目协作。`,
      async () => {
        const missingRoles = this.getMissingRolesAfterRemoval(project, agent);
        if (missingRoles.length > 0) {
          window.modalManager?.confirm(
            `该角色为关键岗位，解雇后缺少：${missingRoles.join('、')}\n\n仍要解雇吗？`,
            () => this.handleFireAgent(project, agentId),
            null
          );
        } else {
          this.handleFireAgent(project, agentId);
        }
      }
    );
  }

  async handleFireAgent(project, agentId) {
    const userId = this.getUserId();
    await this.fetchWithAuth(`${this.apiUrl}/api/agents/${userId}/${agentId}`, {
      method: 'DELETE',
      headers: this.buildAuthHeaders()
    }).catch(() => null);
    const assignedAgents = (project.assignedAgents || []).filter(id => id !== agentId);
    const updatedProject = await this.updateProject(
      project.id,
      { assignedAgents },
      { allowFallback: true }
    );
    const viewProject = updatedProject || { ...project, assignedAgents };
    this.renderProjectMembersPanel(viewProject);
    this.renderMemberMarket();
    this.renderMemberHired();
  }

  getMissingRolesAfterRemoval(project, agent) {
    const stageId = this.currentStageId;
    const recommended = this.getRecommendedAgentsForStage(project, stageId);
    if (!agent || recommended.length === 0) {
      return [];
    }
    if (!recommended.includes(agent.type)) {
      return [];
    }
    const assignedIds = (project.assignedAgents || []).filter(id => id !== agent.id);
    const hiredAgents = this.cachedHiredAgents || [];
    const remainingSameType = hiredAgents.some(
      item => assignedIds.includes(item.id) && item.type === agent.type
    );
    return remainingSameType ? [] : [agent.name];
  }

  async getAgentMarketList(workflowCategory) {
    const category = workflowCategory || 'product-development';
    if (this.agentMarket?.length && this.agentMarketCategory === category) {
      return this.agentMarket;
    }
    try {
      const response = await this.fetchWithAuth(
        `${this.apiUrl}/api/agents/types-by-workflow?workflowCategory=${encodeURIComponent(category)}`
      );
      let result = null;
      if (response.ok) {
        result = await response.json();
      } else {
        const fallback = await this.fetchWithAuth(`${this.apiUrl}/api/agents/types`);
        if (!fallback.ok) {
          return [];
        }
        result = await fallback.json();
      }
      const types = result?.data?.types || [];
      this.agentMarket = types.map(agent => ({
        id: agent.id,
        name: agent.name,
        emoji: agent.emoji,
        desc: agent.desc,
        skills: agent.skills || [],
        level: agent.level,
        role: agent.name,
        promptPath: agent.promptPath,
        promptName: agent.promptName,
        promptDescription: agent.promptDescription
      }));
      this.agentMarketCategory = category;
      return this.agentMarket;
    } catch (error) {
      return [];
    }
  }

  async getUserHiredAgents() {
    const now = Date.now();
    if (this.cachedHiredAgents?.length && now - this.hiredAgentsFetchedAt < 5000) {
      return this.cachedHiredAgents;
    }
    if (this.hiredAgentsPromise) {
      return this.hiredAgentsPromise;
    }

    this.hiredAgentsPromise = (async () => {
      try {
        const userId = this.getUserId();
        const response = await this.fetchWithAuth(`${this.apiUrl}/api/agents/my/${userId}`);
        if (!response.ok) {
          return this.cachedHiredAgents || [];
        }
        const result = await response.json();
        const agents = result.data?.agents || [];
        this.cachedHiredAgents = agents;
        this.hiredAgentsFetchedAt = Date.now();
        return agents;
      } catch (error) {
        return this.cachedHiredAgents || [];
      } finally {
        this.hiredAgentsPromise = null;
      }
    })();

    return this.hiredAgentsPromise;
  }

  getRecommendedAgentsForStage(project, stageId) {
    const category = project.workflowCategory || 'product-development';
    const catalog = this.getWorkflowCatalog();
    const workflow = catalog[category];
    if (!workflow || !stageId) {
      return [];
    }
    return workflow.agents?.[stageId] || [];
  }

  /**
   * 引入创意弹窗
   * @param {String} projectId - 项目ID
   */
  async showReplaceIdeaDialog(projectId) {
    if (!window.modalManager) {
      alert('创意更换功能暂不可用');
      return;
    }

    const project = await this.getProject(projectId);
    if (!project) {
      return;
    }

    const chats = await this.storageManager.getAllChats();
    const analyzedChats = await this.filterCompletedIdeas(chats);
    const projects = await this.storageManager.getAllProjects().catch(() => []);
    const activeProjects = projects.filter(p => p.status !== 'deleted');
    const chatIdToProjectName = new Map(
      activeProjects.map(p => [this.normalizeIdeaIdForCompare(p.ideaId), p.name || '未命名项目'])
    );
    const chatIdsWithProjects = new Set(
      activeProjects.map(p => this.normalizeIdeaIdForCompare(p.ideaId))
    );

    if (analyzedChats.length === 0) {
      window.modalManager.alert('暂无可用创意，请先在对话中完成创意分析', 'info');
      return;
    }

    const ideaListHTML = analyzedChats
      .map(chat => {
        const chatIdKey = this.normalizeIdeaIdForCompare(chat.id);
        const isCurrent = chatIdKey === this.normalizeIdeaIdForCompare(project.ideaId);
        const usedByOtherProject = chatIdsWithProjects.has(chatIdKey) && !isCurrent;
        const disabled = isCurrent || usedByOtherProject;
        const referencedBy = usedByOtherProject ? chatIdToProjectName.get(chatIdKey) : '';
        const hint = isCurrent
          ? '· 当前项目'
          : usedByOtherProject
            ? `· 已被项目“${this.escapeHtml(referencedBy)}”引用`
            : '';
        return `
                <label class="idea-item ${disabled ? 'disabled' : ''}" style="display: flex; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; cursor: ${disabled ? 'not-allowed' : 'pointer'}; opacity: ${disabled ? '0.5' : '1'};">
                    <input type="radio" name="replaceIdea" value="${chat.id}" ${disabled ? 'disabled' : ''} style="margin-top: 4px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; margin-bottom: 4px;">${this.escapeHtml(chat.title)}</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">
                            ${this.formatTimeAgo(chat.updatedAt)}
                            ${hint}
                        </div>
                    </div>
                </label>
            `;
      })
      .join('');

    const dialogHTML = `
            <div style="max-height: 60vh; overflow-y: auto; padding: 4px;">
                <div style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">
                    选择新的创意替换当前项目创意（将重新推荐流程）：
                </div>
                <div id="replaceIdeaList" style="display: flex; flex-direction: column; gap: 12px;">
                    ${ideaListHTML}
                </div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);">
                <button class="btn-secondary" onclick="window.modalManager.close('replaceIdeaDialog')" style="flex: 1;">取消</button>
                <button class="btn-primary" onclick="projectManager.confirmReplaceIdea('${project.id}')" style="flex: 1;">确认更换</button>
            </div>
        `;

    window.modalManager.showCustomModal('更换创意', dialogHTML, 'replaceIdeaDialog');
  }

  async confirmReplaceIdea(projectId) {
    const selected = document.querySelector('input[name="replaceIdea"]:checked');
    if (!selected) {
      window.modalManager.alert('请选择一个创意', 'warning');
      return;
    }

    const project = await this.getProject(projectId);
    if (!project) {
      return;
    }

    const ideaId = this.normalizeIdeaId(selected.value);
    const updatedProject = await this.updateProject(projectId, { ideaId, workflowCategory: null });
    const viewProject = updatedProject || { ...project, ideaId, workflowCategory: null };

    window.modalManager.close('replaceIdeaDialog');
    this.renderProjectIdeasPanel(viewProject);
  }

  async saveIdeaKnowledge(projectId, ideaId) {
    if (!this.storageManager) {
      return;
    }

    try {
      const normalizedIdeaId = this.normalizeIdeaId(ideaId);
      const chat =
        (await this.storageManager.getChat(normalizedIdeaId)) ||
        (await this.storageManager.getChat(ideaId));
      if (!chat) {
        return;
      }

      await this.storageManager.saveKnowledge({
        projectId,
        scope: 'project',
        type: 'idea',
        title: chat.title || '创意摘要',
        content:
          chat.messages
            ?.slice(0, 3)
            .map(m => `${m.role}: ${m.content}`)
            .join('\n') || '',
        tags: ['创意引入'],
        createdAt: Date.now()
      });
    } catch (error) {}
  }

  /**
   * 显示创建项目对话框
   */
  async showCreateProjectDialog() {
    try {
      // 优先从 IndexedDB 获取，避免使用过期的 localStorage 缓存
      let chats = [];
      if (this.storageManager) {
        chats = await this.storageManager.getAllChats().catch(() => []);
      }
      // 如果 IndexedDB 不可用，再尝试从 state 获取
      if (chats.length === 0) {
        chats = window.state?.chats ? [...window.state.chats] : [];
      }
      // 最后兜底使用 localStorage（可能存在旧缓存）
      if (chats.length === 0) {
        const saved = localStorage.getItem('thinkcraft_chats');
        if (saved) {
          try {
            const parsedChats = JSON.parse(saved);
            if (Array.isArray(parsedChats)) {
              chats = parsedChats;
            }
          } catch (e) {
            console.error('Failed to parse chats from localStorage:', e);
          }
        }
      }

      const reports = await this.storageManager.getAllReports().catch(() => []);
      const analysisMap = new Map();
      reports.forEach(report => {
        if (report.type === 'analysis' && report.chatId) {
          analysisMap.set(this.normalizeIdeaIdForCompare(report.chatId), true);
        }
      });

      // 检查哪些创意已经创建过项目
      const projects = await this.storageManager.getAllProjects().catch(() => []);
      const activeProjects = projects.filter(p => p.status !== 'deleted');
      const chatIdToProjectName = new Map(
        activeProjects.map(p => [this.normalizeIdeaIdForCompare(p.ideaId), p.name || '未命名项目'])
      );
      const chatIdsWithProjects = new Set(
        activeProjects.map(p => this.normalizeIdeaIdForCompare(p.ideaId))
      );

      if (chats.length === 0) {
        window.modalManager?.alert('暂无可用创意，请先创建对话', 'info');
        return;
      }

      // 显示创意选择对话框（含未完成提示）
      const ideaListHTML = chats
        .map(chat => {
          const chatIdKey = this.normalizeIdeaIdForCompare(chat.id);
          const hasProject = chatIdsWithProjects.has(chatIdKey);
          const analysisReady = analysisMap.has(chatIdKey);
          const disabled = hasProject || !analysisReady;
          const disabledClass = disabled ? 'disabled' : '';
          const disabledAttr = disabled ? 'disabled' : '';
          let hint = '';
          if (hasProject) {
            const projectName = chatIdToProjectName.get(chatIdKey);
            hint = `· 已被项目"${this.escapeHtml(projectName || '未命名项目')}"引用`;
          } else if (!analysisReady) {
            hint = '· 未生成分析报告';
          }

          // 调试日志
          console.log('[创建项目对话框] 创意:', {
            id: chat.id,
            title: chat.title,
            disabled,
            analysisReady
          });

          return `
                    <label class="idea-item ${disabledClass}" style="display: flex; gap: 12px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; cursor: ${disabled ? 'not-allowed' : 'pointer'}; opacity: ${disabled ? '0.5' : '1'};">
                        <input type="radio" name="selectedIdea" value="${chat.id || ''}" ${disabledAttr} style="margin-top: 4px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; margin-bottom: 4px;">${this.escapeHtml(chat.title)}</div>
                            <div style="font-size: 14px; color: var(--text-secondary);">
                                ${this.formatTimeAgo(chat.updatedAt)}
                                ${hint}
                            </div>
                        </div>
                    </label>
                `;
        })
        .join('');

      const dialogHTML = `
                <div style="max-height: 60vh; overflow-y: auto; padding: 4px;">
                    <div style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">
                        选择一个已完成分析的创意来创建项目：
                    </div>
                    <div id="ideaList" style="display: flex; flex-direction: column; gap: 12px;">
                        ${ideaListHTML}
                    </div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" onclick="window.modalManager.close('createProjectDialog')" style="flex: 1;">取消</button>
                    <button class="btn-primary" onclick="projectManager.confirmCreateProject()" style="flex: 1;">创建项目</button>
                </div>
            `;

      // 使用modalManager显示对话框
      if (window.modalManager) {
        window.modalManager.showCustomModal('创建项目', dialogHTML, 'createProjectDialog');
      } else {
        // 降级处理：使用简单的prompt
        const eligibleChats = chats.filter(chat => {
          const chatIdKey = this.normalizeIdeaIdForCompare(chat.id);
          return analysisMap.has(chatIdKey) && !chatIdsWithProjects.has(chatIdKey);
        });
        const chatTitles = eligibleChats.map((c, i) => `${i + 1}. ${c.title}`).join('\n');
        const choice = prompt(`选择创意（输入序号）：\n\n${chatTitles}`);
        if (choice) {
          const index = parseInt(choice) - 1;
          if (index >= 0 && index < eligibleChats.length) {
            const chat = eligibleChats[index];
            await this.createProjectFromIdea(chat.id, chat.title);
          }
        }
      }
    } catch (error) {
      alert('显示对话框失败: ' + error.message);
    }
  }

  async filterCompletedIdeas(chats = []) {
    const reports = await this.storageManager.getAllReports().catch(() => []);
    const reportMap = new Map();
    reports.forEach(report => {
      if (report.type === 'analysis' && report.chatId) {
        reportMap.set(this.normalizeIdeaIdForCompare(report.chatId), report);
      }
    });
    return chats.filter(chat => reportMap.has(this.normalizeIdeaIdForCompare(chat.id)));
  }

  async promptWorkflowRecommendation(project) {
    return;
  }

  async applyWorkflowCategory(projectId, workflowCategory) {
    const project = await this.getProject(projectId);
    if (!project || !project.workflow) {
      return;
    }
    if (project.collaborationSuggestion?.stages?.length) {
      return;
    }
    const stages = await this.buildWorkflowStages(workflowCategory);
    if (!stages || stages.length === 0) {
      return;
    }
    project.workflow.stages = stages;
    project.workflow.currentStage = stages[0]?.id || null;
    await this.storageManager.saveProject(project);
    await this.updateProject(projectId, { workflow: project.workflow }, { localOnly: true });
  }

  async applyCollaborationSuggestion(projectId, suggestion) {
    const project = await this.getProject(projectId);
    if (!project || !suggestion) {
      return;
    }

    console.log('[应用协作建议] 开始应用', { projectId, suggestion });

    const recommendedAgents = suggestion.recommendedAgents || [];
    const suggestedStages = suggestion.stages || []; // AI返回的阶段
    console.log('[应用协作建议] 推荐的Agent类型:', recommendedAgents);
    console.log('[应用协作建议] AI建议的阶段:', suggestedStages);

    // 使用AI返回的阶段，而不是从固定的workflow中过滤
    let adjustedStages = [];

    if (suggestedStages.length > 0) {
      // 使用AI返回的阶段
      adjustedStages = suggestedStages.map((stage, index) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description || '',
        agents: stage.agents || [],
        dependencies: stage.dependencies || [],
        outputs: stage.outputs || [],
        outputsDetailed: stage.outputsDetailed || [],
        status: 'pending',
        order: index + 1,
        priority: 'high',
        recommended: true
      }));
      console.log('[应用协作建议] 使用AI生成的阶段，数量:', adjustedStages.length);
    } else {
      // 降级方案：如果AI没有返回阶段，从现有workflow中过滤
      console.log('[应用协作建议] AI未返回阶段，使用降级方案');
      const stages = project.workflow?.stages || [];
      adjustedStages = stages
        .map(stage => {
          const stageAgents = stage.agents || [];
          const recommendedForStage = stageAgents.filter(a => recommendedAgents.includes(a));
          const hasRecommendedAgent = recommendedForStage.length > 0;

          return {
            ...stage,
            agents: recommendedForStage,
            priority: 'high',
            recommended: true,
            hasRecommendedAgent
          };
        })
        .filter(stage => stage.hasRecommendedAgent)
        .map((stage, index) => {
          const { hasRecommendedAgent, ...cleanStage } = stage;
          return {
            ...cleanStage,
            order: index + 1
          };
        });
    }

    // 清理阶段依赖关系：移除不存在的阶段依赖
    const stageIds = new Set(adjustedStages.map(s => s.id));
    adjustedStages.forEach(stage => {
      if (stage.dependencies && stage.dependencies.length > 0) {
        stage.dependencies = stage.dependencies.filter(depId => stageIds.has(depId));
      }
    });

    console.log('[应用协作建议] 最终阶段数量:', adjustedStages.length);
    console.log(
      '[应用协作建议] 阶段列表:',
      adjustedStages.map(s => ({ id: s.id, name: s.name, agents: s.agents }))
    );

    // 【修复点】将推荐的Agent类型ID转换为实际的Agent实例ID
    // 直接调用API获取最新数据，完全绕过缓存
    const userId = this.getUserId();
    const response = await this.fetchWithAuth(`${this.apiUrl}/api/agents/my/${userId}`);
    if (!response.ok) {
      throw new Error('获取已雇佣Agent失败');
    }
    const result = await response.json();
    const hiredAgents = result.data?.agents || [];
    console.log(
      '[应用协作建议] 已雇佣的Agent (直接从API):',
      hiredAgents.map(a => ({ id: a.id, type: a.type, name: a.name }))
    );

    const currentAssignedAgents = project.assignedAgents || [];
    console.log('[应用协作建议] 当前项目已分配的Agent ID:', currentAssignedAgents);

    // 为每个推荐的类型ID找到对应的已雇佣Agent实例
    const recommendedAgentInstances = [];
    const missingAgentTypes = [];

    for (const agentType of recommendedAgents) {
      // 通过agent.type字段匹配（而不是agent.id）
      const hiredAgent = hiredAgents.find(agent => agent.type === agentType);
      if (hiredAgent) {
        console.log('[应用协作建议] 找到匹配的Agent:', {
          type: agentType,
          id: hiredAgent.id,
          name: hiredAgent.name
        });
        recommendedAgentInstances.push(hiredAgent.id);
      } else {
        console.warn('[应用协作建议] 未找到匹配的Agent:', agentType);
        missingAgentTypes.push(agentType);
      }
    }

    console.log('[应用协作建议] 推荐的Agent实例ID:', recommendedAgentInstances);
    console.log('[应用协作建议] 缺失的Agent类型:', missingAgentTypes);

    // 合并现有成员和推荐成员的实例ID
    const mergedAgents = Array.from(
      new Set([...currentAssignedAgents, ...recommendedAgentInstances])
    );
    console.log('[应用协作建议] 合并后的Agent ID:', mergedAgents);

    // 如果有未雇佣的推荐Agent，记录到项目中以便后续提示
    const updateData = {
      workflow: {
        ...project.workflow,
        stages: adjustedStages
      },
      collaborationSuggestion: suggestion,
      assignedAgents: mergedAgents
    };

    if (missingAgentTypes.length > 0) {
      updateData.missingRecommendedAgents = missingAgentTypes;
    }

    // 保存调整后的阶段和成员
    await this.updateProject(projectId, updateData, { localOnly: true });

    // 刷新项目面板
    if (this.currentProject?.id === projectId) {
      this.currentProject = await this.getProject(projectId);
      this.refreshProjectPanel(this.currentProject);
    }

    // 不再显示未雇佣Agent的提示（本期需求：不检测是否需要雇佣其他成员）
    console.log('[应用协作建议] 应用完成，推荐成员已添加到项目');
  }

  /**
   * 根据依赖关系对阶段进行拓扑排序
   * @param {Array} stages - 阶段列表
   * @returns {Array} 排序后的阶段列表
   */
  sortStagesByDependencies(stages) {
    if (!stages || stages.length === 0) {
      return [];
    }

    // 创建阶段ID到阶段对象的映射
    const stageMap = new Map();
    stages.forEach(stage => {
      stageMap.set(stage.id, stage);
    });

    // 计算每个阶段的入度（被依赖的次数）
    const inDegree = new Map();
    stages.forEach(stage => {
      inDegree.set(stage.id, 0);
    });

    stages.forEach(stage => {
      const dependencies = stage.dependencies || [];
      dependencies.forEach(depId => {
        if (inDegree.has(depId)) {
          inDegree.set(stage.id, inDegree.get(stage.id) + 1);
        }
      });
    });

    // 拓扑排序（Kahn算法）
    const result = [];
    const queue = [];

    // 将所有入度为0的阶段加入队列
    inDegree.forEach((degree, stageId) => {
      if (degree === 0) {
        queue.push(stageId);
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentStage = stageMap.get(currentId);
      if (currentStage) {
        result.push(currentStage);
      }

      // 遍历所有阶段，找到依赖当前阶段的阶段
      stages.forEach(stage => {
        const dependencies = stage.dependencies || [];
        if (dependencies.includes(currentId)) {
          const newDegree = inDegree.get(stage.id) - 1;
          inDegree.set(stage.id, newDegree);
          if (newDegree === 0) {
            queue.push(stage.id);
          }
        }
      });
    }

    // 如果有循环依赖，将剩余的阶段按原顺序添加
    if (result.length < stages.length) {
      stages.forEach(stage => {
        if (!result.find(s => s.id === stage.id)) {
          result.push(stage);
        }
      });
    }

    return result;
  }

  async buildWorkflowStages(category) {
    const catalog = await this.getWorkflowCatalog(category);

    if (!catalog || !catalog.stages) {
      return null;
    }

    return catalog.stages.map((stage, index) => ({
      id: stage.id,
      name: stage.name,
      description: stage.description || '',
      status: 'pending',
      order: index + 1,
      artifacts: [],
      agents: catalog.agents?.[stage.id] || [],
      agentRoles: catalog.agentRoles?.[stage.id] || [],
      dependencies: stage.dependencies || [],
      outputs: stage.outputs || [],
      outputsDetailed: stage.outputsDetailed || []
    }));
  }

  normalizeSuggestedStages(suggestedStages = []) {
    const list = Array.isArray(suggestedStages) ? suggestedStages : [];
    return list.map((stage, index) => ({
      id: stage.id || `stage-${index + 1}`,
      name: stage.name || `阶段${index + 1}`,
      description: stage.description || '',
      status: stage.status || 'pending',
      order: Number.isFinite(stage.order) ? stage.order : index + 1,
      artifacts: Array.isArray(stage.artifacts) ? stage.artifacts : [],
      agents: Array.isArray(stage.agents) ? stage.agents : [],
      agentRoles: Array.isArray(stage.agentRoles) ? stage.agentRoles : [],
      dependencies: Array.isArray(stage.dependencies) ? stage.dependencies : [],
      outputs: Array.isArray(stage.outputs) ? stage.outputs : [],
      outputsDetailed: Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : [],
      recommended: true
    }));
  }

  /**
   * 确认创建项目
   */
  async confirmCreateProject() {
    try {
      // 获取选中的创意
      const selectedIdeaInput = document.querySelector('input[name="selectedIdea"]:checked');
      if (!selectedIdeaInput) {
        if (window.modalManager) {
          window.modalManager.alert('请选择一个创意', 'warning');
        } else {
          alert('请选择一个创意');
        }
        return;
      }

      const ideaId = selectedIdeaInput.value;

      console.log('[创建项目] 选中的创意ID:', ideaId, '类型:', typeof ideaId);

      // 验证 ideaId 不为空
      if (!ideaId || ideaId.trim() === '') {
        console.error('[创建项目] 创意ID为空');
        if (window.modalManager) {
          window.modalManager.alert('创意ID无效，请重新选择', 'warning');
        } else {
          alert('创意ID无效，请重新选择');
        }
        return;
      }

      // 【增强】获取创意标题，尝试多种方式
      const normalizedIdeaId = this.normalizeIdeaId(ideaId);
      console.log('[创建项目] 规范化后的ID:', normalizedIdeaId, '类型:', typeof normalizedIdeaId);

      // 再次验证规范化后的ID
      if (!normalizedIdeaId) {
        console.error('[创建项目] 规范化后的ID为空');
        if (window.modalManager) {
          window.modalManager.alert('创意ID格式错误，请重新选择', 'warning');
        } else {
          alert('创意ID格式错误，请重新选择');
        }
        return;
      }

      let chat = await this.storageManager.getChat(normalizedIdeaId);

      // 如果normalized ID找不到，尝试原始ID
      if (!chat) {
        chat = await this.storageManager.getChat(ideaId);
      }

      // 如果还是找不到，尝试去掉前缀
      if (!chat && ideaId.startsWith('idea-')) {
        const rawId = ideaId.replace('idea-', '');
        chat = await this.storageManager.getChat(rawId);
      }

      // 生成项目名称
      let projectName = '新项目';
      if (chat) {
        if (chat.title && chat.title.trim()) {
          projectName = `${chat.title.trim()} - 项目`;
        } else {
          // 如果标题为空，使用创意ID的最后部分
          const idParts = ideaId.split('-');
          const shortId = idParts[idParts.length - 1];
          projectName = `创意${shortId} - 项目`;
        }
      } else {
        console.warn('未找到创意对话，使用默认项目名称', { ideaId, normalizedIdeaId });
      }

      // 关闭对话框
      if (window.modalManager) {
        window.modalManager.close('createProjectDialog');
      }

      // 直接创建项目（工作流编辑在项目面板中完成）
      await this.createProjectFromIdea(normalizedIdeaId, projectName);
    } catch (error) {
      console.error('创建项目失败:', error);
      if (window.modalManager) {
        window.modalManager.alert('创建项目失败: ' + error.message, 'error');
      } else {
        alert('创建项目失败: ' + error.message);
      }
    }
  }

  /**
   * 创建项目并设置自定义工作流
   * @param {String} ideaId - 创意ID
   * @param {String} name - 项目名称
   * @param {Array<String>} selectedStages - 选中的阶段ID
   */
  async createProjectWithWorkflow(ideaId, name, selectedStages) {
    try {
      // 创建项目
      const project = await this.createProject(ideaId, name);
      const workflowCategory = project.workflowCategory || 'product-development';

      // 如果有自定义阶段，更新工作流
      if (selectedStages && selectedStages.length > 0 && project.workflow) {
        // 过滤出选中的阶段
        project.workflow.stages = project.workflow.stages.filter(stage =>
          selectedStages.includes(stage.id)
        );

        // 保存更新后的项目
        await this.storageManager.saveProject(project);
      }

      await this.updateProject(project.id, { workflowCategory });
      await this.applyWorkflowCategory(project.id, workflowCategory);

      // 刷新项目列表
      await this.loadProjects();
      this.renderProjectList('projectListContainer');

      // 显示成功提示
      if (window.modalManager) {
        window.modalManager.alert(
          `项目创建成功！<br><br>名称：${this.escapeHtml(name)}<br>阶段数：${selectedStages.length}`,
          'success'
        );
      } else {
        alert('项目创建成功！');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 从创意创建项目
   * @param {String} ideaId - 创意ID
   * @param {String} name - 项目名称
   */
  async createProjectFromIdea(ideaId, name) {
    try {
      // 创建项目
      const project = await this.createProject(ideaId, name);
      const workflowCategory = project.workflowCategory || 'product-development';

      await this.updateProject(project.id, { workflowCategory });
      if (!project.collaborationSuggestion?.stages?.length) {
        await this.applyWorkflowCategory(project.id, workflowCategory);
      }
      await this.saveIdeaKnowledge(project.id, ideaId);

      // 刷新项目列表
      await this.loadProjects();
      this.renderProjectList('projectListContainer');

      // 显示成功提示
      if (window.modalManager) {
        window.modalManager.alert(
          `项目创建成功！<br><br>名称：${this.escapeHtml(name)}`,
          'success'
        );
      } else {
        alert('项目创建成功！');
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * 打开项目详情
   * @param {String} projectId - 项目ID
   */
  async openProject(projectId) {
    try {
      // 获取项目详情
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error('项目不存在');
      }

      this.currentProjectId = projectId;
      this.currentProject = project;
      this.stageDeliverableSelection = this.stageDeliverableSelectionByProject[projectId] || {};

      // 更新全局状态
      if (window.setCurrentProject) {
        window.setCurrentProject(project);
      }

      // 右侧面板展示
      this.renderProjectPanel(project);
      this.updateProjectSelection(projectId);
    } catch (error) {
      if (window.modalManager) {
        window.modalManager.alert('打开项目失败: ' + error.message, 'error');
      } else {
        alert('打开项目失败: ' + error.message);
      }
    }
  }

  /**
   * 渲染工作流详情页
   * @param {Object} project - 项目对象
   */
  renderWorkflowDetails(project) {
    // 使用modalManager显示工作流详情
    if (!window.modalManager) {
      return;
    }

    const workflowReady = Boolean(window.workflowExecutor);
    if (!project.workflow || !project.workflow.stages) {
      window.modalManager.alert('项目工作流不存在或未加载', 'warning');
      return;
    }

    const progress = this.calculateWorkflowProgress(project.workflow);

    // 渲染阶段卡片 - 优化版
    const stagesHTML = project.workflow.stages
      .map((stage, index) => {
        const definition = window.workflowExecutor?.getStageDefinition(stage.id, stage);
        const statusText =
          {
            pending: '待执行',
            active: '执行中',
            completed: '已完成'
          }[stage.status] || stage.status;

        const statusColor =
          {
            pending: '#9ca3af',
            active: '#3b82f6',
            completed: '#10b981'
          }[stage.status] || '#9ca3af';

        const artifactCount = stage.artifacts?.length || 0;
        const isLastStage = index === project.workflow.stages.length - 1;

        // 检查依赖关系
        const dependencies = stage.dependencies || [];
        const unmetDependencies = [];
        if (dependencies.length > 0) {
          const stages = project.workflow?.stages || [];
          for (const depId of dependencies) {
            const depStage = stages.find(s => s.id === depId);
            if (depStage && depStage.status !== 'completed') {
              unmetDependencies.push(depStage.name);
            }
          }
        }

        // 判断是否可执行
        const isExecutable =
          stage.status === 'pending' && unmetDependencies.length === 0 && workflowReady;
        const isBlocked = stage.status === 'pending' && unmetDependencies.length > 0;

        // 卡片样式 - 根据状态动态调整
        let cardStyle = '';
        let cardClass = 'stage-card';

        if (stage.status === 'completed') {
          cardStyle = `
            border: 1px solid #d1fae5;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-left: 4px solid #10b981;
          `;
        } else if (stage.status === 'active') {
          cardStyle = `
            border: 1px solid #dbeafe;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-left: 4px solid #3b82f6;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          `;
        } else if (isExecutable) {
          cardStyle = `
            border: 1px solid #e0e7ff;
            background: white;
            border-left: 4px solid #667eea;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
          `;
        } else if (isBlocked) {
          cardStyle = `
            border: 1px solid #f3f4f6;
            background: #fafafa;
            border-left: 4px solid #d1d5db;
            opacity: 0.7;
          `;
        } else {
          cardStyle = `
            border: 1px solid var(--border);
            background: white;
            border-left: 4px solid ${definition?.color || '#667eea'};
          `;
        }

        // 状态图标
        const statusIcon =
          {
            pending: isBlocked ? '🔒' : '⏸️',
            active: '⚡',
            completed: '✅'
          }[stage.status] || '📋';

        // 交付物展示
        let artifactsHTML = '';
        if (artifactCount > 0) {
          const artifactsList = (stage.artifacts || [])
            .slice(0, 3)
            .map(artifact => {
              const fileName = artifact.fileName || artifact.title || '未命名文件';
              const fileType = artifact.type || '文档';
              return `
              <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <span style="font-size: 16px;">📄</span>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 13px; font-weight: 500; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(fileName)}</div>
                  <div style="font-size: 11px; color: #9ca3af;">${fileType}</div>
                </div>
              </div>
            `;
            })
            .join('');

          const moreCount = artifactCount > 3 ? artifactCount - 3 : 0;
          artifactsHTML = `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05);">
              <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">📦 交付物 (${artifactCount})</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${artifactsList}
                ${moreCount > 0 ? `<div style="font-size: 12px; color: #9ca3af; text-align: center;">还有 ${moreCount} 个交付物...</div>` : ''}
              </div>
            </div>
          `;
        }

        // 依赖提示
        let dependencyHTML = '';
        if (isBlocked) {
          dependencyHTML = `
            <div style="margin-top: 12px; padding: 8px 12px; background: #fef3c7; border-radius: 8px; border-left: 3px solid #f59e0b;">
              <div style="font-size: 12px; color: #92400e;">
                <span style="font-weight: 600;">⚠️ 依赖未满足：</span>
                <span>${unmetDependencies.join('、')}</span>
              </div>
            </div>
          `;
        }

        // 操作按钮
        let actionHTML = '';
        if (stage.status === 'pending') {
          if (isBlocked) {
            actionHTML = `
              <button class="btn-secondary" disabled title="依赖阶段未完成：${unmetDependencies.join('、')}" style="opacity: 0.5;">
                🔒 依赖未满足
              </button>
            `;
          } else if (workflowReady) {
            actionHTML = `
              <button class="btn-primary" onclick="projectManager.startStageWithSelection('${project.id}', '${stage.id}', true)" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);">
                ▶️ 开始执行
              </button>
            `;
          } else {
            actionHTML = `
              <button class="btn-secondary" disabled title="工作流执行器未就绪">
                开始执行
              </button>
            `;
          }
        } else if (stage.status === 'completed') {
          actionHTML = workflowReady
            ? `
              <button class="btn-secondary" onclick="workflowExecutor.viewArtifacts('${project.id}', '${stage.id}')" style="background: white; border: 1px solid #10b981; color: #10b981;">
                👁️ 查看全部交付物
              </button>
            `
            : `
              <button class="btn-secondary" disabled title="工作流执行器未就绪">
                查看交付物 (${artifactCount})
              </button>
            `;
        } else {
          actionHTML = `
            <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
              <div style="width: 16px; height: 16px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <span style="font-size: 14px; font-weight: 500; color: #3b82f6;">正在执行中...</span>
            </div>
          `;
        }

        // 连接线（除了最后一个阶段）
        const connectorHTML = !isLastStage
          ? `
          <div style="display: flex; justify-content: center; margin: -8px 0;">
            <div style="width: 2px; height: 24px; background: linear-gradient(to bottom, ${statusColor}, #e5e7eb); opacity: 0.5;"></div>
          </div>
        `
          : '';

        return `
          <div class="${cardClass}" style="${cardStyle} border-radius: 12px; padding: 20px; margin-bottom: 8px; transition: all 0.3s ease;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div style="font-size: 36px; line-height: 1;">${definition?.icon || '📋'}</div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${definition?.name || stage.name}</h3>
                    <span style="font-size: 18px;">${statusIcon}</span>
                  </div>
                  <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">${definition?.description || ''}</p>
                </div>
              </div>
              <div style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: white; background: ${statusColor}; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${statusText}
              </div>
            </div>
            ${dependencyHTML}
            ${artifactsHTML}
            <div style="margin-top: ${artifactsHTML || dependencyHTML ? '12' : '16'}px;">
              ${actionHTML}
            </div>
          </div>
          ${connectorHTML}
        `;
      })
      .join('');

    const contentHTML = `
            <div style="max-height: 70vh; overflow-y: auto; padding: 4px;">
                <!-- 项目信息卡片 -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; color: white;">
                    <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600;">${this.escapeHtml(project.name)}</h2>
                    <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span>📊</span>
                            <span>进度: ${progress}%</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span>⏱️</span>
                            <span>${this.formatTimeAgo(project.updatedAt)}</span>
                        </div>
                    </div>
                    <!-- 进度条 -->
                    <div style="background: rgba(255,255,255,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: white; height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <!-- 工作流阶段 -->
                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">工作流阶段</h3>
                    ${stagesHTML}
                </div>

                <!-- 快捷操作 -->
                <div style="display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" onclick="window.modalManager.close('workflowDetails')" style="flex: 1;">
                        返回项目列表
                    </button>
                    <button class="btn-primary" onclick="projectManager.executeAllStages('${project.id}')" style="flex: 1;" ${workflowReady ? '' : 'disabled title="工作流执行器未就绪"'}>
                        一键执行全部
                    </button>
                </div>
            </div>
        `;

    window.modalManager.showCustomModal('🎯 项目工作流', contentHTML, 'workflowDetails');
  }

  /**
   * 执行所有阶段
   * @param {String} projectId - 项目ID
   */
  async executeAllStages(projectId) {
    try {
      const options = arguments.length > 1 && typeof arguments[1] === 'object' ? arguments[1] : {};
      const skipConfirm = Boolean(options.skipConfirm);
      if (!window.workflowExecutor) {
        if (window.modalManager) {
          window.modalManager.alert('工作流执行器未就绪，请稍后重试', 'warning');
        }
        return;
      }

      const project = await this.getProject(projectId);
      if (!project || !project.workflow) {
        throw new Error('项目工作流不存在');
      }

      await this.updateProject(projectId, { status: 'in_progress' }, { allowFallback: true });

      // 获取所有未完成的阶段
      const pendingStages = project.workflow.stages
        .filter(s => s.status === 'pending')
        .map(s => s.id);

      if (pendingStages.length === 0) {
        if (window.modalManager) {
          window.modalManager.alert('所有阶段已完成！', 'success');
        }
        return;
      }

      // 确认执行
      if (!skipConfirm) {
        const confirmed = confirm(
          `将执行 ${pendingStages.length} 个阶段，这可能需要一些时间，是否继续？`
        );
        if (!confirmed) {
          return;
        }
      }

      // 关闭详情页
      if (window.modalManager) {
        window.modalManager.close('workflowDetails');
      }

      // 显示执行提示
      if (window.modalManager) {
        window.modalManager.alert('正在批量执行工作流，请稍候...', 'info');
      }

      // 获取创意对话内容
      const ideaId = this.normalizeIdeaId(project.ideaId);
      const chat =
        (await this.storageManager.getChat(ideaId)) ||
        (await this.storageManager.getChat(project.ideaId));
      const conversation = chat
        ? chat.messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
        : '';

      // 调用workflowExecutor批量执行
      const result = await window.workflowExecutor.executeBatch(
        projectId,
        pendingStages,
        conversation,
        async (stageId, status) => {
          if (this.currentProjectId !== projectId) {
            return;
          }
          if (status === 'active' || status === 'completed') {
            const refreshed = await this.getProject(projectId);
            if (refreshed) {
              this.refreshProjectPanel(refreshed);
            }
          }
        },
        { skipRoleCheck: skipConfirm }
      );

      const refreshedProject = await this.getProject(projectId);
      const allCompleted = refreshedProject?.workflow?.stages?.every(
        stage => stage.status === 'completed'
      );
      if (allCompleted) {
        await this.updateProject(projectId, { status: 'completed' }, { allowFallback: true });
      }

      // 显示成功提示
      if (window.modalManager) {
        window.modalManager.close();
        window.modalManager.alert(
          `工作流执行完成！<br><br>完成了 ${pendingStages.length} 个阶段<br>消耗 ${result.totalTokens} tokens`,
          'success'
        );
      }

      // 刷新项目列表
      await this.loadProjects();
      this.renderProjectList('projectListContainer');
      this.refreshProjectPanel(await this.getProject(projectId));
    } catch (error) {
      if (window.modalManager) {
        window.modalManager.close();
        window.modalManager.alert('执行失败: ' + error.message, 'error');
      }
    }
  }

  // ==================== Legacy Project Management Functions ====================
  // 这些函数用于向后兼容，支持旧的项目管理UI

  /**
   * 创建新项目（简化版）
   */
  createNewProject() {
    const projectName = prompt('请输入项目名称：');
    if (!projectName || !projectName.trim()) return;

    const project = {
      id: 'proj_' + Date.now(),
      name: projectName.trim(),
      icon: '📁',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [],
      assignedAgents: [],
      linkedIdeas: [],
      ideas: [],
      tasks: [],
      files: [],
      status: 'active'
    };

    if (window.state?.teamSpace) {
      window.state.teamSpace.projects.unshift(project);
      if (typeof window.saveTeamSpace === 'function') {
        window.saveTeamSpace();
      }
    }

    this.renderProjectList('projectListContainer');
    this.openProjectLegacy(project.id);
  }

  /**
   * 打开项目（旧版UI）
   * @param {String} projectId - 项目ID
   */
  openProjectLegacy(projectId) {
    const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
    if (!project) return;

    if (window.state) {
      window.state.currentProject = projectId;
    }
    window.currentProject = project;

    this.renderProjectList('projectListContainer');
    this.renderProjectDetail(project);
  }

  /**
   * 渲染项目详情（旧版UI）
   * @param {Object} project - 项目对象
   */
  renderProjectDetail(project) {
    const chatContainer = document.getElementById('chatContainer');
    const knowledgePanel = document.getElementById('knowledgePanel');
    const inputContainer = document.getElementById('inputContainer');

    if (chatContainer) chatContainer.style.display = 'flex';
    if (knowledgePanel) knowledgePanel.style.display = 'none';
    if (inputContainer) inputContainer.style.display = 'none';

    const memberCount = project.assignedAgents?.length || 0;
    const ideaCount = project.linkedIdeas?.length || 0;

    const agentMarket = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];

    // 构建成员列表HTML
    let membersHTML = '';
    if (memberCount === 0) {
      membersHTML = '<div style="color: var(--text-tertiary); font-size: 13px;">尚未分配员工</div>';
    } else {
      membersHTML = (project.assignedAgents || [])
        .map(agentId => {
          const agent = agentMarket.find(a => a.id === agentId);
          if (!agent) return '';
          const iconSvg =
            typeof window.getAgentIconSvg === 'function'
              ? window.getAgentIconSvg(
                  agent.avatar || agent.role || agent.name,
                  28,
                  'member-avatar-icon'
                )
              : '👤';
          return `
          <div class="project-member-card">
            <div class="member-avatar">${iconSvg}</div>
            <div class="member-info">
              <div class="member-name">${agent.name}</div>
              <div class="member-role">${agent.role}</div>
            </div>
            <button class="icon-btn" onclick="window.projectManager.removeAgentFromProject('${project.id}', '${agent.id}')" title="移除">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        `;
        })
        .join('');
    }

    // 构建创意列表HTML
    let ideasHTML = '';
    if (ideaCount === 0) {
      ideasHTML = '<div style="color: var(--text-tertiary); font-size: 13px;">尚未引入创意</div>';
    } else {
      ideasHTML = (project.linkedIdeas || [])
        .map(ideaId => {
          const chat = window.state?.chats?.find(c => c.id === ideaId);
          if (!chat) return '';
          return `
          <div class="project-idea-card" onclick="window.projectManager.loadChatFromProject('${chat.id}')">
            <div class="idea-icon">💡</div>
            <div class="idea-info">
              <div class="idea-title">${chat.title}</div>
              <div class="idea-date">${new Date(chat.createdAt).toLocaleDateString('zh-CN')}</div>
            </div>
          </div>
        `;
        })
        .join('');
    }

    // 更新header
    let mainHeader = document.querySelector('.main-header');
    if (!mainHeader) {
      mainHeader = document.createElement('div');
      mainHeader.className = 'main-header';
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.insertBefore(mainHeader, mainContent.firstChild);
      }
    }

    mainHeader.innerHTML = `
      <button class="menu-toggle" onclick="window.toggleSidebar && window.toggleSidebar()">
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <div class="main-title">📁 ${project.name}</div>
      <div class="header-actions">
        <button class="icon-btn" onclick="window.showKnowledgeBase && window.showKnowledgeBase('project', '${project.id}')" title="项目知识库">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </button>
        <button class="icon-btn" onclick="window.projectManager.editProjectInfo('${project.id}')" title="编辑项目">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <button class="icon-btn" onclick="window.projectManager.deleteProjectLegacy('${project.id}')" title="删除项目" style="color: #ef4444;">
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>
    `;

    // 更新chatContainer内容
    if (chatContainer) {
      chatContainer.innerHTML = `
        <div class="project-detail-wrapper">
          <div class="project-overview">
            <div class="overview-card">
              <div class="overview-label">团队成员</div>
              <div class="overview-value">${memberCount}</div>
            </div>
            <div class="overview-card">
              <div class="overview-label">关联创意</div>
              <div class="overview-value">${ideaCount}</div>
            </div>
            <div class="overview-card">
              <div class="overview-label">任务</div>
              <div class="overview-value">${project.tasks?.length || 0}</div>
            </div>
          </div>

          <div class="project-section">
            <div class="project-section-header">
              <h3>👥 团队成员</h3>
              <button class="btn-secondary" onclick="window.currentProjectId='${project.id}'; window.currentProject=window.state.teamSpace.projects.find(p=>p.id==='${project.id}'); window.showAddMember && window.showAddMember()">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                添加成员
              </button>
            </div>
            <div class="project-members-grid">
              ${membersHTML}
            </div>
          </div>

          <div class="project-section">
            <div class="project-section-header">
              <h3>💡 关联创意</h3>
              <button class="btn-secondary" onclick="window.projectManager.linkIdeaToProject('${project.id}')">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                </svg>
                引入创意
              </button>
            </div>
            <div class="project-ideas-grid">
              ${ideasHTML}
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * 从项目中移除Agent
   * @param {String} projectId - 项目ID
   * @param {String} agentId - Agent ID
   */
  removeAgentFromProject(projectId, agentId) {
    const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
    if (!project) return;

    const index = (project.assignedAgents || []).indexOf(agentId);
    if (index > -1) {
      project.assignedAgents.splice(index, 1);
      if (typeof window.saveTeamSpace === 'function') {
        window.saveTeamSpace();
      }
      this.renderProjectDetail(project);
    }
  }

  /**
   * 关联创意到项目
   * @param {String} projectId - 项目ID
   */
  linkIdeaToProject(projectId) {
    const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
    if (!project) return;

    const chats = window.state?.chats || [];
    if (chats.length === 0) {
      alert('暂无可关联的创意');
      return;
    }

    const options = chats.map((chat, index) => `${index + 1}. ${chat.title}`).join('\n');
    const input = prompt(`请选择要关联的创意（输入序号）：\n\n${options}`);

    if (!input) return;

    const index = parseInt(input) - 1;
    if (index < 0 || index >= chats.length) {
      alert('无效的序号');
      return;
    }

    const chat = chats[index];
    if (!project.linkedIdeas) {
      project.linkedIdeas = [];
    }

    if (project.linkedIdeas.includes(chat.id)) {
      alert('该创意已经关联到此项目');
      return;
    }

    project.linkedIdeas.push(chat.id);
    if (typeof window.saveTeamSpace === 'function') {
      window.saveTeamSpace();
    }
    this.renderProjectDetail(project);
  }

  /**
   * 编辑项目信息
   * @param {String} projectId - 项目ID
   */
  editProjectInfo(projectId) {
    const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
    if (!project) return;

    const newName = prompt('请输入新的项目名称：', project.name);
    if (newName && newName.trim() && newName.trim() !== project.name) {
      project.name = newName.trim();
      project.updatedAt = new Date().toISOString();
      if (typeof window.saveTeamSpace === 'function') {
        window.saveTeamSpace();
      }
      this.renderProjectList('projectListContainer');
      this.renderProjectDetail(project);
    }
  }

  /**
   * 删除项目（旧版）
   * @param {String} projectId - 项目ID
   */
  deleteProjectLegacy(projectId) {
    const project = window.state?.teamSpace?.projects.find(p => p.id === projectId);
    if (!project) return;

    if (!confirm(`确定要删除项目"${project.name}"吗？`)) return;

    const index = window.state.teamSpace.projects.findIndex(p => p.id === projectId);
    if (index > -1) {
      window.state.teamSpace.projects.splice(index, 1);
      if (typeof window.saveTeamSpace === 'function') {
        window.saveTeamSpace();
      }
      this.renderProjectList('projectListContainer');

      // 清空主内容区
      const chatContainer = document.getElementById('chatContainer');
      if (chatContainer) {
        chatContainer.innerHTML =
          '<div style="padding: 40px; text-align: center; color: var(--text-tertiary);">请选择一个项目</div>';
      }
    }
  }

  /**
   * 从项目加载聊天
   * @param {String} chatId - 聊天ID
   */
  loadChatFromProject(chatId) {
    if (typeof window.loadChat === 'function') {
      window.loadChat(chatId);
    }
  }

  /**
   * 开始工作流执行
   * @param {String} projectId - 项目ID
   */
  async startWorkflowExecution(projectId) {
    console.log('[开始执行] ========== 开始工作流执行 ==========');
    console.log('[开始执行] 项目ID:', projectId);

    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error('项目不存在');
      }

      console.log('[开始执行] 项目信息:', {
        name: project.name,
        status: project.status,
        stageCount:
          project.workflow && project.workflow.stages ? project.workflow.stages.length : 0,
        memberCount: project.assignedAgents ? project.assignedAgents.length : 0
      });

      if (!project.collaborationExecuted) {
        if (window.ErrorHandler) {
          window.ErrorHandler.showToast('请先确认协作模式', 'warning');
        }
        return;
      }

      if (!project.workflow || !project.workflow.stages || project.workflow.stages.length === 0) {
        if (window.ErrorHandler) {
          window.ErrorHandler.showToast('项目没有工作流阶段', 'warning');
        }
        return;
      }

      const memberCount = project.assignedAgents ? project.assignedAgents.length : 0;
      const confirmed = confirm(
        '确定要开始执行工作流吗？\n\n' +
          '项目：' +
          project.name +
          '\n' +
          '阶段数：' +
          project.workflow.stages.length +
          '\n' +
          '成员数：' +
          memberCount +
          '\n\n' +
          '执行过程可能需要较长时间，请耐心等待。'
      );

      if (!confirmed) {
        console.log('[开始执行] 用户取消执行');
        return;
      }

      console.log('[开始执行] 用户确认执行，开始调用 executeAllStages');

      if (this.executeAllStages) {
        await this.executeAllStages(projectId, {
          skipConfirm: true
        });
      } else {
        throw new Error('executeAllStages 方法不存在');
      }

      console.log('[开始执行] ========== 工作流执行完成 ==========');
    } catch (error) {
      console.error('[开始执行] 执行失败:', error);
      if (window.ErrorHandler) {
        window.ErrorHandler.showToast('执行失败：' + error.message, 'error');
      }
    }
  }

  /**
   * 打开交付物预览面板
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   * @param {String} artifactId - 交付物ID
   */
  async openArtifactPreviewPanel(projectId, stageId, artifactId) {
    try {
      const project = await this.getProject(projectId);
      if (!project || !project.workflow) {
        throw new Error('项目不存在');
      }

      const stage = project.workflow.stages.find(s => s.id === stageId);
      if (!stage) {
        throw new Error('阶段不存在');
      }

      // 直接使用 stage.artifacts，不过滤类型
      const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
      const artifact = artifacts.find(a => a.id === artifactId);
      if (!artifact) {
        console.error('[交付物预览] 未找到交付物:', {
          artifactId,
          availableArtifacts: artifacts.map(a => ({ id: a.id, name: a.name, type: a.type }))
        });
        throw new Error('交付物不存在');
      }

      // 创建遮罩层
      if (!this.stageDetailOverlay) {
        this.stageDetailOverlay = document.createElement('div');
        this.stageDetailOverlay.className = 'stage-detail-panel-overlay';
        this.stageDetailOverlay.addEventListener('click', () => this.closeArtifactPreviewPanel());
        document.body.appendChild(this.stageDetailOverlay);
      }

      // 创建面板
      if (!this.stageDetailPanel) {
        this.stageDetailPanel = document.createElement('div');
        this.stageDetailPanel.className = 'stage-detail-panel';
        document.body.appendChild(this.stageDetailPanel);
      }

      // 渲染面板内容
      await this.renderArtifactPreviewPanel(project, stage, artifact);

      // 显示面板
      setTimeout(() => {
        this.stageDetailOverlay.classList.add('open');
        this.stageDetailPanel.classList.add('open');
      }, 10);
    } catch (error) {
      console.error('[交付物预览] 打开失败:', error);
      if (window.ErrorHandler) {
        window.ErrorHandler.showToast('打开预览失败：' + error.message, 'error');
      }
    }
  }

  /**
   * 关闭交付物预览面板
   */
  closeArtifactPreviewPanel() {
    if (this.stageDetailOverlay) {
      this.stageDetailOverlay.classList.remove('open');
    }
    if (this.stageDetailPanel) {
      this.stageDetailPanel.classList.remove('open');
    }
  }

  /**
   * 渲染交付物预览面板
   * @param {Object} project - 项目对象
   * @param {Object} stage - 阶段对象
   * @param {Object} artifact - 交付物对象
   */
  async renderArtifactPreviewPanel(project, stage, artifact) {
    if (!this.stageDetailPanel) return;

    const icon = this.getArtifactIcon(artifact.type);
    const typeLabel = this.getArtifactTypeLabel(artifact);

    // 获取交付物内容
    let contentHTML = '';

    // 根据交付物类型渲染不同的预览内容
    // 文档类型：包括各种文档、报告、计划等
    const documentTypes = [
      'document',
      'report',
      'plan',
      'strategy-doc',
      'prd',
      'ui-design',
      'architecture-doc',
      'test-report',
      'deployment-guide',
      'deploy-doc',
      'marketing-plan',
      'user-story',
      'feature-list',
      'design-spec' // 设计规范也是文档类型
    ];

    if (documentTypes.includes(artifact.type)) {
      // 文档类型：显示文本内容
      const content = artifact.content || artifact.text || '';
      if (content) {
        // 使用 markdownRenderer 渲染 Markdown
        let renderedContent = '';
        if (window.markdownRenderer) {
          renderedContent = window.markdownRenderer.render(content);
        } else if (window.marked) {
          renderedContent = window.marked.parse(content);
        } else {
          renderedContent = content.replace(/\n/g, '<br>');
        }

        contentHTML = `
          <div class="artifact-preview-content">
            <div class="artifact-preview-document markdown-content">
              ${renderedContent}
            </div>
          </div>
        `;
      } else {
        contentHTML = `
          <div class="artifact-preview-empty">
            <div class="artifact-preview-empty-icon">📄</div>
            <div>暂无内容</div>
          </div>
        `;
      }
    } else if (
      artifact.type === 'code' ||
      artifact.type === 'component-lib' ||
      artifact.type === 'api-doc'
    ) {
      // 代码类型：显示代码内容
      const code = artifact.content || artifact.code || '';
      const language = artifact.language || 'javascript';
      if (code) {
        contentHTML = `
          <div class="artifact-preview-content">
            <div class="artifact-preview-code-header">
              <span class="artifact-preview-code-language">${language}</span>
              <button class="artifact-preview-copy-btn" onclick="projectManager.copyArtifactContent('${artifact.id}')">
                📋 复制代码
              </button>
            </div>
            <pre class="artifact-preview-code"><code class="language-${language}">${this.escapeHtml(code)}</code></pre>
          </div>
        `;
      } else {
        contentHTML = `
          <div class="artifact-preview-empty">
            <div class="artifact-preview-empty-icon">💻</div>
            <div>暂无代码</div>
          </div>
        `;
      }
    } else if (
      artifact.type === 'preview' ||
      artifact.type === 'ui-preview' ||
      artifact.type === 'prototype'
    ) {
      // 前端可交互系统：使用iframe显示
      const previewUrl = artifact.previewUrl || artifact.url || '';
      const htmlContent = artifact.htmlContent || artifact.content || '';

      if (previewUrl) {
        // 如果有预览URL，使用iframe加载
        contentHTML = `
          <div class="artifact-preview-content">
            <div class="artifact-preview-iframe-container">
              <iframe
                src="${previewUrl}"
                class="artifact-preview-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="${this.escapeHtml(artifact.name || '预览')}">
              </iframe>
            </div>
          </div>
        `;
      } else if (htmlContent) {
        // 如果有HTML内容，使用srcdoc显示
        contentHTML = `
          <div class="artifact-preview-content">
            <div class="artifact-preview-iframe-container">
              <iframe
                srcdoc="${this.escapeHtml(htmlContent)}"
                class="artifact-preview-iframe"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="${this.escapeHtml(artifact.name || '预览')}">
              </iframe>
            </div>
          </div>
        `;
      } else {
        contentHTML = `
          <div class="artifact-preview-empty">
            <div class="artifact-preview-empty-icon">🖥️</div>
            <div>暂无预览内容</div>
          </div>
        `;
      }
    } else if (artifact.type === 'design' || artifact.type === 'image') {
      // 设计类型：显示图片或设计稿
      const imageUrl = artifact.imageUrl || artifact.url || '';
      if (imageUrl) {
        contentHTML = `
          <div class="artifact-preview-content">
            <div class="artifact-preview-image">
              <img src="${imageUrl}" alt="${this.escapeHtml(artifact.name)}" />
            </div>
          </div>
        `;
      } else {
        contentHTML = `
          <div class="artifact-preview-empty">
            <div class="artifact-preview-empty-icon">🎨</div>
            <div>暂无设计稿</div>
          </div>
        `;
      }
    } else {
      // 其他类型：尝试智能识别内容
      const content = artifact.content || artifact.text || artifact.code || '';

      if (content) {
        // 检查是否是HTML内容
        if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) {
          contentHTML = `
            <div class="artifact-preview-content">
              <div class="artifact-preview-iframe-container">
                <iframe
                  srcdoc="${this.escapeHtml(content)}"
                  class="artifact-preview-iframe"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title="${this.escapeHtml(artifact.name || '预览')}">
                </iframe>
              </div>
            </div>
          `;
        } else {
          // 默认显示为文档
          let renderedContent = '';
          if (window.markdownRenderer) {
            renderedContent = window.markdownRenderer.render(content);
          } else if (window.marked) {
            renderedContent = window.marked.parse(content);
          } else {
            renderedContent = content.replace(/\n/g, '<br>');
          }

          contentHTML = `
            <div class="artifact-preview-content">
              <div class="artifact-preview-document markdown-content">
                ${renderedContent}
              </div>
            </div>
          `;
        }
      } else {
        // 显示基本信息
        contentHTML = `
          <div class="artifact-preview-content">
            <div class="artifact-preview-info">
              <div class="artifact-preview-info-item">
                <span class="label">文件名:</span>
                <span class="value">${this.escapeHtml(artifact.fileName || artifact.name || '未命名')}</span>
              </div>
              <div class="artifact-preview-info-item">
                <span class="label">类型:</span>
                <span class="value">${typeLabel}</span>
              </div>
              ${
                artifact.size
                  ? `
                <div class="artifact-preview-info-item">
                  <span class="label">大小:</span>
                  <span class="value">${this.formatFileSize(artifact.size)}</span>
                </div>
              `
                  : ''
              }
              ${
                artifact.createdAt
                  ? `
                <div class="artifact-preview-info-item">
                  <span class="label">创建时间:</span>
                  <span class="value">${new Date(artifact.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              `
                  : ''
              }
            </div>
          </div>
        `;
      }
    }

    // 操作按钮
    const actionsHTML = `
      <div class="artifact-preview-actions">
        ${
          artifact.previewUrl || artifact.url
            ? `
          <button class="btn-primary" onclick="window.open('${artifact.previewUrl || artifact.url}', '_blank')">
            🔗 新窗口打开
          </button>
        `
            : ''
        }
        ${
          artifact.downloadUrl
            ? `
          <button class="btn-secondary" onclick="projectManager.downloadArtifact('${artifact.id}')">
            📥 下载
          </button>
        `
            : ''
        }
        ${
          artifact.content || artifact.text || artifact.code
            ? `
          <button class="btn-secondary" onclick="projectManager.copyArtifactContent('${artifact.id}')">
            📋 复制内容
          </button>
        `
            : ''
        }
      </div>
    `;

    this.stageDetailPanel.innerHTML = `
      <div class="stage-detail-header">
        <div class="stage-detail-header-top">
          <div class="stage-detail-title">
            <span>${icon}</span>
            <span>${this.escapeHtml(artifact.name || artifact.fileName || '未命名交付物')}</span>
          </div>
          <button class="stage-detail-close" onclick="projectManager.closeArtifactPreviewPanel()">×</button>
        </div>
        <div class="stage-detail-meta">
          <div class="stage-detail-meta-item">
            <span class="label">阶段:</span>
            <span class="value">${this.escapeHtml(stage.name)}</span>
          </div>
          <div class="stage-detail-meta-item">
            <span class="label">类型:</span>
            <span class="value">${typeLabel}</span>
          </div>
        </div>
      </div>
      <div class="stage-detail-body">
        ${contentHTML}
        ${actionsHTML}
      </div>
    `;

    // 如果有代码高亮库，应用高亮
    if (window.Prism && artifact.type === 'code') {
      setTimeout(() => {
        window.Prism.highlightAll();
      }, 100);
    }
  }

  /**
   * 复制交付物内容
   * @param {String} artifactId - 交付物ID
   */
  async copyArtifactContent(artifactId) {
    try {
      // 从当前项目中查找交付物
      if (!this.currentProject) {
        throw new Error('未选择项目');
      }

      const stages = this.currentProject.workflow?.stages || [];
      let artifact = null;

      // 直接从 stage.artifacts 中查找，不过滤类型
      for (const stage of stages) {
        const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
        artifact = artifacts.find(a => a.id === artifactId);
        if (artifact) break;
      }

      if (!artifact) {
        throw new Error('交付物不存在');
      }

      const content = artifact.content || artifact.text || artifact.code || '';
      if (!content) {
        throw new Error('交付物无内容');
      }

      await navigator.clipboard.writeText(content);

      if (window.ErrorHandler) {
        window.ErrorHandler.showToast('已复制到剪贴板', 'success');
      }
    } catch (error) {
      console.error('[复制内容] 失败:', error);
      if (window.ErrorHandler) {
        window.ErrorHandler.showToast('复制失败：' + error.message, 'error');
      }
    }
  }

  /**
   * 下载交付物
   * @param {String} artifactId - 交付物ID
   */
  async downloadArtifact(artifactId) {
    try {
      // 从当前项目中查找交付物
      if (!this.currentProject) {
        throw new Error('未选择项目');
      }

      const stages = this.currentProject.workflow?.stages || [];
      let artifact = null;

      // 直接从 stage.artifacts 中查找，不过滤类型
      for (const stage of stages) {
        const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
        artifact = artifacts.find(a => a.id === artifactId);
        if (artifact) break;
      }

      if (!artifact) {
        throw new Error('交付物不存在');
      }

      const downloadUrl = artifact.downloadUrl || artifact.url;
      if (!downloadUrl) {
        throw new Error('交付物无下载链接');
      }

      // 创建下载链接
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = artifact.fileName || artifact.name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      if (window.ErrorHandler) {
        window.ErrorHandler.showToast('开始下载', 'success');
      }
    } catch (error) {
      console.error('[下载交付物] 失败:', error);
      if (window.ErrorHandler) {
        window.ErrorHandler.showToast('下载失败：' + error.message, 'error');
      }
    }
  }

  /**
   * 格式化文件大小
   * @param {Number} bytes - 字节数
   * @returns {String} 格式化后的大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
