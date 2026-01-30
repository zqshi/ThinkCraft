/**
 * 项目管理器（前端）
 * 负责项目创建、查询、展示
 */

function getDefaultApiUrl() {
  if (window.location.hostname === 'localhost' && window.location.port === '8000') {
    return 'http://localhost:3000';
  }
  return window.location.origin;
}

class ProjectManager {
  constructor() {
    this.projects = [];
    this.currentProject = null;
    this.currentProjectId = null;
    this.memberModalProjectId = null;
    this.currentStageId = null;
    this.stageTabState = {};
    this.stageArtifactState = {};
    this.agentMarket = [];
    this.agentMarketCategory = null;
    this.cachedHiredAgents = [];
    this.hiredAgentsFetchedAt = 0;
    this.hiredAgentsPromise = null;
    this.apiUrl = window.appState?.settings?.apiUrl || getDefaultApiUrl();
    this.storageManager = window.storageManager;
  }

  /**
   * 规范化 ideaId：统一转换为字符串
   * @param {*} value - 原始值
   * @returns {String} 规范化后的字符串ID
   */
  normalizeIdeaId(value) {
    if (value === null || value === undefined) {
      return value;
    }
    // 统一转换为字符串，避免类型混淆
    return String(value).trim();
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
      const response = await fetch(
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
            outputs: s.outputs
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
      // 统一转换为字符串，避免类型混淆
      const normalizedIdeaId = this.normalizeIdeaId(ideaId);

      // 检查该创意是否已创建项目
      const existing = await this.storageManager.getProjectByIdeaId(normalizedIdeaId);
      if (existing) {
        throw new Error('该创意已创建项目');
      }

      // 调用后端API创建项目（使用字符串ID）
      const response = await fetch(`${this.apiUrl}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId: normalizedIdeaId, name })
      });

      if (!response.ok) {
        const error = await response.json();
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
      const response = await fetch(`${this.apiUrl}/api/projects/${projectId}`);
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
    const workflowCategory = project.workflowCategory || 'product-development';
    const stages = await this.buildWorkflowStages(workflowCategory);
    if (!stages || stages.length === 0) {
      return project;
    }
    return {
      ...project,
      workflow: {
        stages,
        currentStage: stages[0]?.id || null
      }
    };
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
      if (!options.forceRemote && options.allowFallback && !options.localOnly && this.storageManager?.getProject) {
        const localProject = await this.storageManager.getProject(projectId).catch(() => null);
        if (localProject) {
          return await this.updateProject(projectId, updates, { ...options, localOnly: true });
        }
      }

      const normalizedUpdates =
        updates && Object.prototype.hasOwnProperty.call(updates, 'assignedAgents')
          ? {
              ...updates,
              assignedAgents: Array.isArray(updates.assignedAgents)
                ? updates.assignedAgents.filter(Boolean).map(String)
                : []
            }
          : updates;

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
      const response = await fetch(`${this.apiUrl}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
          const project = { ...existing, ...(updates || {}), updatedAt: Date.now() };
          await this.storageManager.saveProject(project);
          const index = this.projects.findIndex(p => p.id === projectId);
          if (index !== -1) {
            this.projects[index] = project;
          }
          if (window.updateProject) {
            window.updateProject(projectId, updates);
          }
          this.refreshProjectPanel(project);
          return project;
        }
      }
      const existing = await this.storageManager.getProject(projectId);
      if (!existing) {
        throw error;
      }
      const project = { ...existing, ...(updates || {}), updatedAt: Date.now() };
      await this.storageManager.saveProject(project);

      const index = this.projects.findIndex(p => p.id === projectId);
      if (index !== -1) {
        this.projects[index] = project;
      }
      if (window.updateProject) {
        window.updateProject(projectId, updates);
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
      const isServerId = projectIdText.startsWith('project_') || /^[a-f0-9]{24}$/i.test(projectIdText);
      console.log('[DEBUG] deleteProject - projectId:', projectId);
      console.log('[DEBUG] deleteProject - isServerId:', isServerId);

      if (isServerId) {
        let response;
        try {
          console.log('[DEBUG] deleteProject - calling DELETE API');
          response = await fetch(`${this.apiUrl}/api/projects/${projectId}`, {
            method: 'DELETE'
          });
          console.log('[DEBUG] deleteProject - response.ok:', response.ok);
          console.log('[DEBUG] deleteProject - response.status:', response.status);
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
            console.log('[DEBUG] deleteProject - error response:', error);
          } catch (parseError) {}

          const localExisting = await this.storageManager.getProject(projectId);
          if (!localExisting) {
            window.modalManager?.alert(`删除项目失败: ${message}`, 'error');
            return;
          }
          console.log('[DEBUG] deleteProject - continuing despite API error, local project exists');
        }
      }

      // 软删除本地存储
      console.log('[DEBUG] deleteProject - deleting from local storage');
      await this.storageManager.deleteProject(projectId);

      // 更新内存（保留项目，标记为deleted）
      this.projects = this.projects.map(project =>
        project.id === projectId ? { ...project, status: 'deleted', updatedAt: Date.now() } : project
      );

      // 更新全局状态
      if (window.updateProject) {
        window.updateProject(projectId, { status: 'deleted', updatedAt: Date.now() });
      }

      if (this.currentProjectId === projectId) {
        this.closeProjectPanel();
      }

      this.renderProjectList('projectListContainer');
      console.log('[DEBUG] deleteProject - completed');
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

    const projectCardsHTML = visibleProjects.map(project => this.renderProjectCard(project)).join('');

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

    const progress = this.calculateWorkflowProgress(project.workflow);
    const memberCount = (project.assignedAgents || []).length;
    const ideaCount = project.ideaId ? 1 : 0;
    const stageCount = project.workflow?.stages?.length || 0;
    const completedStages = (project.workflow?.stages || []).filter(
      stage => stage.status === 'completed'
    ).length;
    const pendingStages = Math.max(stageCount - completedStages, 0);
    const statusClass = `status-${project.status || 'planning'}`;
    const hasStages = stageCount > 0;

    const workflowCategory = project.workflowCategory || 'product-development';
    const workflowLabel = this.getWorkflowCategoryLabel(workflowCategory);
    const stages = project.workflow?.stages || [];
    const selectedStageId = this.currentStageId || stages[0]?.id || null;
    this.currentStageId = selectedStageId;

    // 检查是否已执行协同模式
    const collaborationExecuted = project.collaborationExecuted || false;

    const stageTabsHTML = collaborationExecuted
      ? stages
          .map(
            stage => `
            <button class="project-stage-tab ${stage.id === selectedStageId ? 'active' : ''}"
                    data-stage-id="${stage.id}"
                    onclick="projectManager.switchStage('${stage.id}')">
                ${stage.name || stage.id}
                <span class="project-stage-tab-status status-${stage.status || 'pending'}"></span>
            </button>
        `
          )
          .join('')
      : '';

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
                        ${hasStages ? `<button class="btn-secondary" onclick="projectManager.openPreviewPanel('${project.id}')">预览入口</button>` : ''}
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
                    <div class="project-stage-tabs">
                        ${
                          collaborationExecuted
                            ? stageTabsHTML || '<div class="project-panel-empty">暂无阶段</div>'
                            : '<div class="project-panel-empty centered"><div><div style="margin-bottom: 16px;">' + (typeof window.getDefaultIconSvg === 'function' ? window.getDefaultIconSvg(64, 'empty-icon') : '🤝') + '</div><div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">尚未配置协同模式</div><div style="font-size: 14px;">请点击上方"协同模式"按钮，配置项目的协作方式和团队成员</div></div></div>'
                        }
                    </div>
                </div>
                <div class="project-panel-section project-panel-card project-panel-span-2">
                    <div id="projectStageContent" class="project-stage-content">
                        <div class="project-panel-empty">请选择阶段</div>
                    </div>
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
    this.renderStageContent(project, selectedStageId);
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

    const artifacts = this.getDisplayArtifacts(stage);
    const tab = this.stageTabState[stageId] || 'document';
    const selectedArtifactId = this.stageArtifactState[stageId] || artifacts[0]?.id || null;
    const selectedArtifact = artifacts.find(a => a.id === selectedArtifactId) || artifacts[0] || null;
    if (selectedArtifact?.id) {
      this.stageArtifactState[stageId] = selectedArtifact.id;
    }

    const leftArtifactsHTML = artifacts
      .map(artifact => {
        const typeLabel = this.getArtifactTypeLabel(artifact);
        const isActive = artifact.id === selectedArtifact?.id;
        return `
            <div class="project-deliverable-item ${isActive ? 'active' : ''}" onclick="projectManager.selectArtifact('${stageId}', '${artifact.id}')">
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
    const dependencyHTML = dependencies.length > 0
      ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
           依赖阶段：${dependencies.map(d => {
             const depStage = project.workflow.stages.find(s => s.id === d);
             return depStage ? this.escapeHtml(depStage.name) : d;
           }).join('、')}
         </div>`
      : '';

    // 新增：显示负责Agent
    const stageAgents = stage.agentRoles || stage.agents || [];
    const agentsHTML = stageAgents.length > 0
      ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
           负责成员：${stageAgents.map(a => {
             if (typeof a === 'object') {
               return this.escapeHtml(a.role || a.id);
             }
             return this.escapeHtml(a);
           }).join('、')}
         </div>`
      : '';

    // 新增：显示预期交付物
    const outputs = stage.outputs || [];
    const outputsHTML = outputs.length > 0
      ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
           预期交付物：${outputs.map(o => this.escapeHtml(o)).join('、')}
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
    if (stage.status === 'pending') {
      if (project?.status === 'in_progress') {
        return `<button class="btn-secondary" disabled>执行中...</button>`;
      }
      return workflowReady
        ? `<button class="btn-primary" onclick="workflowExecutor.startStage('${project.id}', '${stage.id}')">开始执行</button>`
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
      'pending': '待执行',
      'active': '执行中',
      'in_progress': '执行中',
      'completed': '已完成',
      'blocked': '阻塞中'
    };
    return labels[status] || status;
  }

  switchDeliverableTab(stageId, tab) {
    this.stageTabState[stageId] = tab;
    const artifactId = this.stageArtifactState[stageId];
    const stage = (this.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
    const artifact = (stage?.artifacts || []).find(a => a.id === artifactId) || stage?.artifacts?.[0];
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
    if (['code', 'component-lib', 'api-doc'].includes(artifact.type)) {
      return '代码';
    }
    if (['preview', 'ui-preview'].includes(artifact.type)) {
      return '预览';
    }
    return '文档';
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
      return;
    }

    const assignedIds = project.assignedAgents || [];
    const hiredAgents = await this.getUserHiredAgents();
    const members = hiredAgents.filter(agent => assignedIds.includes(agent.id));

    if (members.length === 0) {
      container.classList.add('is-empty');
      container.innerHTML = '<div class="project-panel-empty centered">暂未添加成员</div>';
      return;
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
      reports
        .filter(r => this.normalizeIdeaIdForCompare(r.chatId) === this.normalizeIdeaIdForCompare(chatId))
        .forEach(r => {
          result[r.type] = r;
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
        chat = allChats.find(item => this.normalizeIdeaIdForCompare(item.id) === this.normalizeIdeaIdForCompare(chatId));
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
      r => this.normalizeIdeaIdForCompare(r.chatId) === this.normalizeIdeaIdForCompare(chatId) && r.type === type
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
      const chapters = reportData?.chapters;
      if (!chapters) {
        return '';
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

    const metaHTML = type === 'analysis' ? `<div class="report-meta">项目面板 · 只读预览</div>` : '';
    let contentHTML = '';
    if (type === 'analysis') {
      contentHTML = metaHTML + buildAnalysisHTML(data);
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
        metaHTML +
        `<div class="project-panel-empty">${safeText(summary || '暂无报告内容')}</div>`;
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

    const agentMarket = await this.getAgentMarketList(project.workflowCategory || 'product-development');
    const hiredAgents = await this.getUserHiredAgents();
    const hiredIds = project.assignedAgents || [];
    const assignedAgents = hiredAgents.filter(agent => hiredIds.includes(agent.id));
    const recommended = this.getRecommendedAgentsForStage(project, this.currentStageId);

    container.innerHTML = agentMarket
      .map(agent => {
        const isAssigned = assignedAgents.some(item => item.type === agent.id || item.id === agent.id);
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
    const response = await fetch(`${this.apiUrl}/api/agents/hire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const updatedProject = await this.updateProject(projectId, { assignedAgents }, { allowFallback: true });
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
    await fetch(`${this.apiUrl}/api/agents/${userId}/${agentId}`, { method: 'DELETE' }).catch(() => null);
    const assignedAgents = (project.assignedAgents || []).filter(id => id !== agentId);
    const updatedProject = await this.updateProject(project.id, { assignedAgents }, { allowFallback: true });
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
    const remainingSameType = hiredAgents.some(item => assignedIds.includes(item.id) && item.type === agent.type);
    return remainingSameType ? [] : [agent.name];
  }

  async getAgentMarketList(workflowCategory) {
    const category = workflowCategory || 'product-development';
    if (this.agentMarket?.length && this.agentMarketCategory === category) {
      return this.agentMarket;
    }
    try {
      const response = await fetch(
        `${this.apiUrl}/api/agents/types-by-workflow?workflowCategory=${encodeURIComponent(category)}`
      );
      let result = null;
      if (response.ok) {
        result = await response.json();
      } else {
        const fallback = await fetch(`${this.apiUrl}/api/agents/types`);
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
        const response = await fetch(`${this.apiUrl}/api/agents/my/${userId}`);
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
      // 获取所有对话
      const chats = await this.storageManager.getAllChats();
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
          const analysisReady = chat.analysisCompleted && analysisMap.has(chatIdKey);
          const disabled = hasProject || !analysisReady;
          const disabledClass = disabled ? 'disabled' : '';
          const disabledAttr = disabled ? 'disabled' : '';
          let hint = '';
          if (hasProject) {
            const projectName = chatIdToProjectName.get(chatIdKey);
            hint = `· 已被项目“${this.escapeHtml(projectName || '未命名项目')}”引用`;
          } else if (!chat.analysisCompleted) {
            hint = '· 未完成对话分析';
          } else if (!analysisMap.has(chatIdKey)) {
            hint = '· 未生成分析报告';
          }

          return `
                    <label class="idea-item ${disabledClass}" style="display: flex; gap: 12px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; cursor: ${disabled ? 'not-allowed' : 'pointer'}; opacity: ${disabled ? '0.5' : '1'};">
                        <input type="radio" name="selectedIdea" value="${chat.id}" ${disabledAttr} style="margin-top: 4px;">
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
          return chat.analysisCompleted && analysisMap.has(chatIdKey) && !chatIdsWithProjects.has(chatIdKey);
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
    return chats.filter(chat => chat.analysisCompleted && reportMap.has(this.normalizeIdeaIdForCompare(chat.id)));
  }

  async promptWorkflowRecommendation(project) {
    return;
  }

  async applyWorkflowCategory(projectId, workflowCategory) {
    const project = await this.getProject(projectId);
    if (!project || !project.workflow) {
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

    const recommendedAgents = suggestion.recommendedAgents || [];
    const stages = project.workflow?.stages || [];

    // 根据推荐Agent标记阶段优先级
    const adjustedStages = stages.map(stage => {
      const stageAgents = stage.agents || [];
      const hasRecommendedAgent = stageAgents.some(a =>
        recommendedAgents.includes(a)
      );

      return {
        ...stage,
        priority: hasRecommendedAgent ? 'high' : 'normal',
        recommended: hasRecommendedAgent
      };
    });

    // 将推荐成员合并到项目成员列表
    const currentAssignedAgents = project.assignedAgents || [];
    const mergedAgents = Array.from(new Set([...currentAssignedAgents, ...recommendedAgents]));

    // 保存调整后的阶段和成员
    await this.updateProject(
      projectId,
      {
        workflow: {
          ...project.workflow,
          stages: adjustedStages
        },
        collaborationSuggestion: suggestion,
        assignedAgents: mergedAgents
      },
      { localOnly: true }
    );

    // 刷新项目面板
    if (this.currentProject?.id === projectId) {
      this.currentProject = await this.getProject(projectId);
      this.refreshProjectPanel(this.currentProject);
    }
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
      outputs: stage.outputs || []
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

      const ideaId = this.normalizeIdeaId(selectedIdeaInput.value);

      // 获取创意标题
      const normalizedIdeaId = this.normalizeIdeaId(ideaId);
      const chat =
        (await this.storageManager.getChat(normalizedIdeaId)) ||
        (await this.storageManager.getChat(ideaId));
      const projectName = chat ? `${chat.title} - 项目` : '新项目';

      // 关闭对话框
      if (window.modalManager) {
        window.modalManager.close('createProjectDialog');
      }

      // 直接创建项目（工作流编辑在项目面板中完成）
      await this.createProjectFromIdea(ideaId, projectName);
    } catch (error) {
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
      await this.applyWorkflowCategory(project.id, workflowCategory);
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

    // 渲染阶段卡片
    const stagesHTML = project.workflow.stages
      .map((stage, index) => {
        const definition = window.workflowExecutor?.getStageDefinition(stage.id);
        const statusText =
          {
            pending: '未开始',
            active: '进行中',
            completed: '已完成'
          }[stage.status] || stage.status;

        const statusColor =
          {
            pending: '#9ca3af',
            active: '#3b82f6',
            completed: '#10b981'
          }[stage.status] || '#9ca3af';

        const artifactCount = stage.artifacts?.length || 0;

        let actionHTML = '';
        if (stage.status === 'pending') {
          actionHTML = workflowReady
            ? `
                        <button class="btn-primary" onclick="workflowExecutor.startStage('${project.id}', '${stage.id}'); setTimeout(() => projectManager.openProject('${project.id}'), 2000);">
                            开始执行
                        </button>
                    `
            : `
                        <button class="btn-secondary" disabled title="工作流执行器未就绪">
                            开始执行
                        </button>
                    `;
        } else if (stage.status === 'completed') {
          actionHTML = workflowReady
            ? `
                        <button class="btn-secondary" onclick="workflowExecutor.viewArtifacts('${project.id}', '${stage.id}')">
                            查看交付物 (${artifactCount})
                        </button>
                    `
            : `
                        <button class="btn-secondary" disabled title="工作流执行器未就绪">
                            查看交付物 (${artifactCount})
                        </button>
                    `;
        } else {
          actionHTML = `
                    <button class="btn-secondary" disabled>执行中...</button>
                `;
        }

        return `
                <div class="stage-card" style="border: 1px solid var(--border); border-radius: 12px; padding: 20px; background: white; border-left: 4px solid ${definition?.color || '#667eea'}; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 32px;">${definition?.icon || '📋'}</span>
                            <div>
                                <h3 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600;">${definition?.name || stage.name}</h3>
                                <p style="margin: 0; font-size: 14px; color: var(--text-secondary);">${definition?.description || ''}</p>
                            </div>
                        </div>
                        <div style="padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 500; color: white; background: ${statusColor};">
                            ${statusText}
                        </div>
                    </div>
                    <div style="margin-top: 16px;">
                        ${actionHTML}
                    </div>
                </div>
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
      const allCompleted = refreshedProject?.workflow?.stages?.every(stage => stage.status === 'completed');
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
