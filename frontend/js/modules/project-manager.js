/**
 * 项目管理器（前端）
 * 负责项目创建、查询、展示、模式管理
 */

class ProjectManager {
    constructor() {
        this.projects = [];
        this.currentProject = null;
        this.currentProjectId = null;
        this.memberModalProjectId = null;
        this.apiUrl = window.appState?.settings?.apiUrl || 'http://localhost:3000';
        this.storageManager = window.storageManager;

        console.log('[ProjectManager] 项目管理器已初始化');
    }

    /**
     * 初始化：加载所有项目
     */
    async init() {
        try {
            await this.loadProjects();
            console.log(`[ProjectManager] 加载了 ${this.projects.length} 个项目`);
        } catch (error) {
            console.error('[ProjectManager] 初始化失败:', error);
        }
    }

    /**
     * 加载所有项目（从本地存储）
     */
    async loadProjects() {
        try {
            this.projects = await this.storageManager.getAllProjects();

            // 更新全局状态
            if (window.setProjects) {
                window.setProjects(this.projects);
            }

            return this.projects;
        } catch (error) {
            console.error('[ProjectManager] 加载项目失败:', error);
            return [];
        }
    }

    /**
     * 创建项目（从创意）
     * @param {String} ideaId - 创意ID（对话ID）
     * @param {String} mode - 'demo' | 'development'
     * @param {String} name - 项目名称
     * @returns {Promise<Object>} 项目对象
     */
    async createProject(ideaId, mode, name) {
        try {
            // 检查该创意是否已创建项目
            const existing = await this.storageManager.getProjectByIdeaId(ideaId);
            if (existing) {
                throw new Error('该创意已创建项目');
            }

            // 调用后端API创建项目
            const response = await fetch(`${this.apiUrl}/api/projects/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ideaId, mode, name })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '创建项目失败');
            }

            const result = await response.json();
            const project = result.data.project;

            // 保存到本地存储
            await this.storageManager.saveProject(project);

            // 更新内存
            this.projects.unshift(project);

            // 更新全局状态
            if (window.addProject) {
                window.addProject(project);
            }

            console.log(`[ProjectManager] 创建项目成功: ${project.id}`);

            return project;
        } catch (error) {
            console.error('[ProjectManager] 创建项目失败:', error);
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
                return project;
            }

            // 如果本地没有，从后端获取
            const response = await fetch(`${this.apiUrl}/api/projects/${projectId}`);
            if (!response.ok) {
                throw new Error('项目不存在');
            }

            const result = await response.json();
            return result.data.project;
        } catch (error) {
            console.error('[ProjectManager] 获取项目失败:', error);
            throw error;
        }
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
    async updateProject(projectId, updates) {
        try {
            // 调用后端API
            const response = await fetch(`${this.apiUrl}/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            if (!response.ok) {
                throw new Error('更新项目失败');
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
                window.updateProject(projectId, updates);
            }

            this.refreshProjectPanel(project);

            console.log(`[ProjectManager] 更新项目成功: ${projectId}`);

            return project;
        } catch (error) {
            console.error('[ProjectManager] 更新项目失败:', error);
            throw error;
        }
    }

    /**
     * 删除项目
     * @param {String} projectId - 项目ID
     */
    async deleteProject(projectId) {
        try {
            try {
                const response = await fetch(`${this.apiUrl}/api/projects/${projectId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    console.warn('[ProjectManager] 后端删除失败，将继续清理本地数据');
                }
            } catch (error) {
                console.warn('[ProjectManager] 后端删除失败，将继续清理本地数据:', error);
            }

            // 删除本地存储
            await this.storageManager.deleteProject(projectId);

            // 更新内存
            this.projects = this.projects.filter(p => p.id !== projectId);

            // 更新全局状态
            if (window.removeProject) {
                window.removeProject(projectId);
            }

            if (this.currentProjectId === projectId) {
                this.closeProjectPanel();
            }

            this.renderProjectList('projectListContainer');

            console.log(`[ProjectManager] 删除项目成功: ${projectId}`);

        } catch (error) {
            console.error('[ProjectManager] 删除项目失败:', error);
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
            .catch(error => {
                console.error('[ProjectManager] 更新项目名称失败:', error);
            });
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
        if (typeof window.loadChat === 'function') {
            window.loadChat(chatId);
        } else {
            console.error('[ProjectManager] loadChat 未定义');
        }
    }

    /**
     * 升级项目模式（Demo → Development）
     * @param {String} projectId - 项目ID
     * @returns {Promise<Object>} 升级后的项目
     */
    async upgradeProject(projectId) {
        try {
            const existingProject = await this.getProject(projectId);
            const readiness = this.evaluateUpgradeReadiness(existingProject);
            if (readiness.missingRoles.length > 0) {
                const shouldContinue = await this.confirmUpgradeWithMissingRoles(projectId, readiness);
                if (!shouldContinue) {
                    return;
                }
            }

            // 调用后端API
            const response = await fetch(`${this.apiUrl}/api/projects/${projectId}/upgrade`, {
                method: 'POST'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '升级失败');
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

            this.refreshProjectPanel(project);

            console.log(`[ProjectManager] 项目升级成功: ${projectId}`);

            return project;
        } catch (error) {
            console.error('[ProjectManager] 项目升级失败:', error);
            throw error;
        }
    }

    /**
     * 为项目关联Demo
     * @param {String} projectId - 项目ID
     * @param {Object} demoData - Demo数据
     */
    async linkDemo(projectId, demoData) {
        try {
            const project = await this.storageManager.getProject(projectId);
            if (!project) {
                throw new Error('项目不存在');
            }

            // 更新项目的demo数据
            project.demo = {
                type: demoData.demoType,
                code: demoData.code || null,
                previewUrl: demoData.previewUrl,
                downloadUrl: demoData.downloadUrl,
                generatedAt: demoData.generatedAt || Date.now()
            };

            // 保存到本地
            await this.storageManager.saveProject(project);

            // 更新后端
            await this.updateProject(projectId, { demo: project.demo });

            this.refreshProjectPanel(project);

            console.log(`[ProjectManager] Demo已关联到项目: ${projectId}`);

            return project;
        } catch (error) {
            console.error('[ProjectManager] 关联Demo失败:', error);
            throw error;
        }
    }

    /**
     * 渲染项目列表
     * @param {String} containerId - 容器元素ID
     */
    renderProjectList(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`[ProjectManager] 容器不存在: ${containerId}`);
            return;
        }

        const headerHTML = `
            <div class="project-list-header">
                <div class="project-list-title">
                    项目空间
                    <span class="project-list-count">${this.projects.length}</span>
                </div>
                <button class="btn-primary btn-compact" onclick="projectManager.showCreateProjectDialog()">
                    新建项目
                </button>
            </div>
        `;

        if (this.projects.length === 0) {
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

        const projectCardsHTML = this.projects.map(project => this.renderProjectCard(project)).join('');

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
        const modeText = project.mode === 'demo' ? 'Demo模式' : '协同开发模式';
        const statusText = {
            planning: '规划中',
            active: '进行中',
            completed: '已完成',
            archived: '已归档'
        }[project.status] || project.status;

        const timeAgo = project.updatedAt ? this.formatTimeAgo(project.updatedAt) : '刚刚';
        const isActive = this.currentProjectId === project.id;
        const statusClass = `status-${project.status || 'planning'}`;
        const memberCount = (project.assignedAgents || []).length;
        const ideaCount = new Set([project.ideaId, ...(project.linkedIdeas || [])].filter(Boolean)).size;
        const stageCount = project.workflow?.stages?.length || 0;
        const completedStages = (project.workflow?.stages || []).filter(stage => stage.status === 'completed').length;
        const pendingStages = Math.max(stageCount - completedStages, 0);
        const demoStatus = project.demo && project.demo.previewUrl ? '已生成' : '未生成';
        const progress = this.calculateWorkflowProgress(project.workflow);
        const metaItems = project.mode === 'demo'
            ? [`更新 ${timeAgo}`, `Demo ${demoStatus}`]
            : [`更新 ${timeAgo}`, `阶段 ${stageCount}`, `待完成 ${pendingStages}`];

        let contentHTML = '';

        if (project.mode === 'demo') {
            contentHTML = `
                <div class="project-card-note">Demo 状态：${demoStatus}</div>
            `;
        } else {
            contentHTML = `
                <div class="project-card-progress-row">
                    <div class="project-card-progress-label">进度 ${progress}%</div>
                    <div class="project-card-progress">
                        <span style="width: ${progress}%;"></span>
                    </div>
                </div>
            `;
        }

        return `
            <div class="project-card${isActive ? ' active' : ''}" data-project-id="${project.id}" onclick="projectManager.openProject('${project.id}')">
                <div class="project-card-head">
                    <div class="project-card-title-row">
                        <div class="project-card-title">${this.escapeHtml(project.name)}</div>
                    </div>
                    <div class="project-card-badges">
                        <span class="project-pill ${statusClass}">${statusText}</span>
                        <span class="project-pill">${modeText}</span>
                    </div>
                    <div class="project-card-meta">
                        ${metaItems.map((item, index) => `
                            ${index ? '<span class="project-card-meta-dot"></span>' : ''}
                            <span>${item}</span>
                        `).join('')}
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
                        <span>${project.mode === 'demo' ? 'Demo' : '进度'}</span>
                        <strong>${project.mode === 'demo' ? demoStatus : `${progress}%`}</strong>
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

        if (days > 0) return `${days}天前`;
        if (hours > 0) return `${hours}小时前`;
        if (minutes > 0) return `${minutes}分钟前`;
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
        const knowledgePanel = document.getElementById('knowledgePanel');

        if (!panel || !body || !title) {
            this.renderWorkflowDetails(project);
            return;
        }

        const modeText = project.mode === 'demo' ? 'Demo模式' : '协同开发模式';
        const statusText = {
            planning: '规划中',
            active: '进行中',
            completed: '已完成',
            archived: '已归档'
        }[project.status] || project.status;

        const workflowReady = !!window.workflowExecutor;
        const demoStatus = project.demo && project.demo.previewUrl ? '已生成' : '未生成';
        const updatedAt = project.updatedAt ? this.formatTimeAgo(project.updatedAt) : '刚刚';

        const progress = this.calculateWorkflowProgress(project.workflow);
        const memberCount = (project.assignedAgents || []).length;
        const ideaCount = new Set([project.ideaId, ...(project.linkedIdeas || [])].filter(Boolean)).size;
        const stageCount = project.workflow?.stages?.length || 0;
        const completedStages = (project.workflow?.stages || []).filter(stage => stage.status === 'completed').length;
        const pendingStages = Math.max(stageCount - completedStages, 0);
        const statusClass = `status-${project.status || 'planning'}`;

        const stagesHTML = (project.workflow?.stages || []).map(stage => {
            const definition = window.workflowExecutor?.getStageDefinition(stage.id);
            const statusTextMap = {
                pending: '未开始',
                active: '进行中',
                completed: '已完成'
            };
            const statusColor = {
                pending: '#9ca3af',
                active: '#3b82f6',
                completed: '#10b981'
            }[stage.status] || '#9ca3af';

            let actionHTML = '';
            if (stage.status === 'pending') {
                actionHTML = workflowReady
                    ? `
                        <button class="btn-primary" onclick="workflowExecutor.startStage('${project.id}', '${stage.id}')">
                            开始执行
                        </button>
                    `
                    : `
                        <button class="btn-secondary" disabled title="工作流执行器未就绪">
                            开始执行
                        </button>
                    `;
            } else if (stage.status === 'completed') {
                const artifactCount = stage.artifacts?.length || 0;
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
                actionHTML = `<button class="btn-secondary" disabled>执行中...</button>`;
            }

            return `
                <div class="project-stage-item">
                    <div class="project-stage-title">${definition?.name || stage.name}</div>
                    <div class="project-stage-meta">
                        <span class="project-stage-status" style="background: ${statusColor};">
                            ${statusTextMap[stage.status] || stage.status}
                        </span>
                        <span>${definition?.description || ''}</span>
                    </div>
                    ${actionHTML}
                </div>
            `;
        }).join('');

        const demoProgress = demoStatus === '已生成' ? 100 : 0;
        const workflowSummarySection = `
            <div class="project-panel-section project-panel-card">
                <div class="project-panel-section-title">协同开发执行</div>
                <div class="project-panel-progress">
                    <div class="project-panel-progress-label">进度 ${progress}% · 已完成 ${completedStages}/${stageCount}</div>
                    <div class="project-panel-progress-bar">
                        <span style="width: ${progress}%;"></span>
                    </div>
                </div>
                <div class="project-panel-actions">
                    <button class="btn-primary" onclick="projectManager.executeAllStages('${project.id}')" ${workflowReady ? '' : 'disabled title="工作流执行器未就绪"'}>
                        一键执行全部
                    </button>
                </div>
            </div>
        `;
        const workflowStagesSection = `
            <div class="project-panel-section project-panel-card project-panel-span-2">
                <div class="project-panel-section-title">流程阶段</div>
                <div class="project-stage-list">
                    ${stagesHTML || '<div class="project-panel-empty">暂无阶段</div>'}
                </div>
            </div>
        `;
        const demoSummarySection = `
            <div class="project-panel-section project-panel-card">
                <div class="project-panel-section-title">Demo 状态</div>
                <div class="project-panel-progress">
                    <div class="project-panel-progress-label">
                        ${demoStatus}${project.demo?.generatedAt ? ` · 生成于 ${this.formatTimeAgo(project.demo.generatedAt)}` : ''}
                    </div>
                    <div class="project-panel-progress-bar">
                        <span style="width: ${demoProgress}%;"></span>
                    </div>
                </div>
                <div class="project-panel-actions">
                    ${project.demo && project.demo.previewUrl ? `
                        <button class="btn-primary" onclick="projectManager.previewDemo('${project.id}')">预览 Demo</button>
                        <button class="btn-secondary" onclick="projectManager.regenerateDemo('${project.id}')">重新生成</button>
                        <button class="btn-secondary" onclick="projectManager.upgradeProject('${project.id}')">升级为协同开发</button>
                    ` : `
                        <button class="btn-primary" onclick="projectManager.startDemoGeneration('${project.id}')">生成 Demo</button>
                        <button class="btn-secondary" onclick="projectManager.upgradeProject('${project.id}')">直接升级协同开发</button>
                    `}
                </div>
            </div>
        `;
        const workflowSection = project.mode === 'development'
            ? `${workflowSummarySection}${workflowStagesSection}`
            : demoSummarySection;

        title.textContent = project.name;

        body.innerHTML = `
            <div class="project-panel-hero">
                <div class="project-panel-badges">
                    <span class="project-pill ${statusClass}">${statusText}</span>
                    <span class="project-pill">${modeText}</span>
                    <span class="project-pill">${project.mode === 'demo' ? `Demo ${demoStatus}` : `进度 ${progress}%`}</span>
                </div>
                <div class="project-panel-meta">
                    <span>更新时间 ${updatedAt}</span>
                    <span>成员 ${memberCount}</span>
                    <span>创意 ${ideaCount}</span>
                    <span>${project.mode === 'demo' ? `Demo ${demoStatus}` : `待完成 ${pendingStages}`}</span>
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
                            <div class="project-panel-summary-label">${project.mode === 'demo' ? 'Demo' : '进度'}</div>
                            <div class="project-panel-summary-value">${project.mode === 'demo' ? demoStatus : `${progress}%`}</div>
                        </div>
                    </div>
                    <div class="project-panel-quick-actions">
                        <button class="btn-secondary" onclick="projectManager.showMemberModal('${project.id}')">成员管理</button>
                    </div>
                </div>
                ${workflowSection}
                <div class="project-panel-section project-panel-card project-panel-span-2">
                    <div class="project-panel-section-title">项目成员</div>
                    <div class="project-panel-list agent-market-grid" id="projectPanelMembers">加载中...</div>
                </div>
                <div class="project-panel-section project-panel-card project-panel-span-2">
                    <div class="project-panel-section-title">引入创意</div>
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
        if (knowledgePanel) {
            knowledgePanel.style.display = 'none';
        }

        this.renderProjectMembersPanel(project);
        this.renderProjectIdeasPanel(project);
        this.renderProjectKnowledgePanel(project);
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
    renderProjectMembersPanel(project) {
        const container = document.getElementById('projectPanelMembers');
        if (!container) return;

        const agentMarket = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];
        const assignedIds = project.assignedAgents || [];
        const members = assignedIds.map(id => agentMarket.find(agent => agent.id === id)).filter(Boolean);

        if (members.length === 0) {
            container.classList.add('is-empty');
            container.innerHTML = '<div class="project-panel-empty centered">暂未添加成员</div>';
            return;
        }

        container.classList.remove('is-empty');
        container.innerHTML = members.map(agent => `
            <div class="agent-card hired">
                <div class="agent-card-header">
                    <div class="agent-card-avatar">${agent.avatar}</div>
                    <div class="agent-card-info">
                        <div class="agent-card-name">${agent.name}</div>
                        <div class="agent-card-role">${agent.role}</div>
                    </div>
                </div>
                <div class="agent-card-desc">${agent.desc || '擅长当前项目的核心任务执行'}</div>
                <div class="agent-card-skills">
                    ${(agent.skills || []).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * 渲染创意列表（右侧面板）
     * @param {Object} project - 项目对象
     */
    async renderProjectIdeasPanel(project) {
        const container = document.getElementById('projectPanelIdeas');
        if (!container) return;

        const ideaIds = new Set([project.ideaId, ...(project.linkedIdeas || [])].filter(Boolean));
        if (ideaIds.size === 0) {
            container.innerHTML = '<div class="project-panel-empty">暂无引入创意</div>';
            return;
        }

        const ideaCards = [];
        for (const ideaId of ideaIds) {
            try {
                const chat = await this.storageManager.getChat(ideaId);
                if (!chat) continue;
                ideaCards.push(`
                    <div class="project-panel-item">
                        <div class="project-panel-item-main">
                            <div class="project-panel-item-title">💡 ${this.escapeHtml(chat.title || '未命名创意')}</div>
                            <div class="project-panel-item-sub">${this.formatTimeAgo(chat.updatedAt || Date.now())}</div>
                        </div>
                        <button class="btn-secondary" onclick="projectManager.openIdeaChat('${chat.id}')" style="padding: 4px 10px; font-size: 12px;">
                            查看
                        </button>
                    </div>
                `);
            } catch (error) {
                console.error('[ProjectManager] 读取创意失败:', error);
            }
        }

        container.innerHTML = ideaCards.length > 0
            ? ideaCards.join('')
            : '<div class="project-panel-empty">暂无引入创意</div>';
    }

    /**
     * 渲染知识库摘要（右侧面板）
     * @param {Object} project - 项目对象
     */
    async renderProjectKnowledgePanel(project) {
        const container = document.getElementById('projectPanelKnowledge');
        if (!container || !this.storageManager) return;

        try {
            const items = await this.storageManager.getKnowledgeByProject(project.id);
            if (!items || items.length === 0) {
                container.innerHTML = '<div class="project-panel-empty">暂无知识沉淀</div>';
                return;
            }

            const previewItems = items.slice(0, 4).map(item => `
                <div class="project-panel-item">
                    <div class="project-panel-item-main">
                        <div class="project-panel-item-title">${this.escapeHtml(item.title || '未命名内容')}</div>
                        <div class="project-panel-item-sub">${this.formatTimeAgo(item.createdAt || Date.now())}</div>
                    </div>
                </div>
            `);

            container.innerHTML = previewItems.join('');
        } catch (error) {
            console.error('[ProjectManager] 获取项目知识失败:', error);
            container.innerHTML = '<div class="project-panel-empty">加载失败</div>';
        }
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
        if (!project) return;

        this.memberModalProjectId = projectId;

        const modalHTML = `
            <div class="report-tabs">
                <button class="report-tab active" onclick="projectManager.switchMemberModalTab('market')">雇佣市场</button>
                <button class="report-tab" onclick="projectManager.switchMemberModalTab('hired')">已雇佣</button>
            </div>
            <div id="memberMarketTab" class="report-tab-content active">
                <div id="memberMarketList" class="agent-market-grid"></div>
            </div>
            <div id="memberHiredTab" class="report-tab-content">
                <div id="memberHiredList" class="agent-market-grid"></div>
            </div>
        `;

        window.modalManager.showCustomModal('项目成员管理', modalHTML, 'projectMemberModal');
        this.switchMemberModalTab('market');
    }

    switchMemberModalTab(tab) {
        const modal = document.getElementById('projectMemberModal');
        if (!modal) return;

        const tabs = modal.querySelectorAll('.report-tab');
        const marketTab = document.getElementById('memberMarketTab');
        const hiredTab = document.getElementById('memberHiredTab');

        tabs.forEach(t => t.classList.remove('active'));

        if (tab === 'market') {
            tabs[0]?.classList.add('active');
            if (marketTab) marketTab.classList.add('active');
            if (hiredTab) hiredTab.classList.remove('active');
            this.renderMemberMarket();
        } else {
            tabs[1]?.classList.add('active');
            if (marketTab) marketTab.classList.remove('active');
            if (hiredTab) hiredTab.classList.add('active');
            this.renderMemberHired();
        }
    }

    async renderMemberMarket() {
        const container = document.getElementById('memberMarketList');
        if (!container) return;

        const project = await this.getProject(this.memberModalProjectId);
        if (!project) return;

        const agentMarket = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];
        const hiredIds = project.assignedAgents || [];

        container.innerHTML = agentMarket.map(agent => {
            const isHired = hiredIds.includes(agent.id);
            return `
                <div class="agent-card ${isHired ? 'hired' : ''}">
                    <div class="agent-card-header">
                        <div class="agent-card-avatar">${agent.avatar}</div>
                        <div class="agent-card-info">
                            <div class="agent-card-name">${agent.name}</div>
                            <div class="agent-card-role">${agent.role}</div>
                        </div>
                    </div>
                    <div class="agent-card-desc">${agent.desc}</div>
                    <div class="agent-card-skills">
                        ${agent.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                    <div class="agent-card-actions">
                        ${isHired
                            ? `<button class="hire-btn hired" disabled>✓ 已加入</button>`
                            : `<button class="hire-btn" onclick="projectManager.hireAgentToProject('${project.id}', '${agent.id}')">加入团队</button>`
                        }
                    </div>
                </div>
            `;
        }).join('');
    }

    async renderMemberHired() {
        const container = document.getElementById('memberHiredList');
        if (!container) return;

        const project = await this.getProject(this.memberModalProjectId);
        if (!project) return;

        const agentMarket = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];
        const hiredIds = project.assignedAgents || [];
        const hiredAgents = agentMarket.filter(agent => hiredIds.includes(agent.id));

        if (hiredAgents.length === 0) {
            container.innerHTML = '<div class="project-panel-empty">暂无雇佣成员</div>';
            return;
        }

        container.innerHTML = hiredAgents.map(agent => `
            <div class="agent-card hired">
                <div class="agent-card-header">
                    <div class="agent-card-avatar">${agent.avatar}</div>
                    <div class="agent-card-info">
                        <div class="agent-card-name">${agent.name}</div>
                        <div class="agent-card-role">${agent.role}</div>
                    </div>
                </div>
                <div class="agent-card-desc">${agent.desc}</div>
                <div class="agent-card-skills">
                    ${agent.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>
                <div class="agent-card-actions">
                    <button class="btn-secondary" onclick="projectManager.fireAgentFromProject('${project.id}', '${agent.id}')">
                        解雇
                    </button>
                </div>
            </div>
        `).join('');
    }

    async hireAgentToProject(projectId, agentId) {
        const project = await this.getProject(projectId);
        if (!project) return;

        const assignedAgents = Array.from(new Set([...(project.assignedAgents || []), agentId]));
        const updatedProject = await this.updateProject(projectId, { assignedAgents });
        const viewProject = updatedProject || { ...project, assignedAgents };
        this.renderProjectMembersPanel(viewProject);
        this.renderMemberMarket();
        this.renderMemberHired();
    }

    async fireAgentFromProject(projectId, agentId) {
        const project = await this.getProject(projectId);
        if (!project) return;

        const agentMarket = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];
        const agent = agentMarket.find(item => item.id === agentId);
        const agentName = agent?.name || '该成员';

        const confirmed = window.confirm(`确定要将 ${agentName} 从项目中移除吗？`);
        if (!confirmed) {
            return;
        }

        if (project.mode === 'development') {
            const warnConfirmed = window.confirm('当前为协同开发模式，移除成员可能影响流程执行与交付质量。确认继续移除？');
            if (!warnConfirmed) {
                return;
            }
        }

        const assignedAgents = (project.assignedAgents || []).filter(id => id !== agentId);
        const updatedProject = await this.updateProject(projectId, { assignedAgents });
        const viewProject = updatedProject || { ...project, assignedAgents };
        this.renderProjectMembersPanel(viewProject);
        this.renderMemberMarket();
        this.renderMemberHired();
    }

    /**
     * 引入创意弹窗
     * @param {String} projectId - 项目ID
     */
    async showLinkIdeaDialog(projectId) {
        if (!window.modalManager) {
            alert('创意引入功能暂不可用');
            return;
        }

        const project = await this.getProject(projectId);
        if (!project) return;

        const chats = await this.storageManager.getAllChats();
        const analyzedChats = chats.filter(chat => chat.analysisCompleted);

        if (analyzedChats.length === 0) {
            window.modalManager.alert('暂无可用创意，请先在对话中完成创意分析', 'info');
            return;
        }

        const linkedSet = new Set([project.ideaId, ...(project.linkedIdeas || [])].filter(Boolean));
        const ideaListHTML = analyzedChats.map(chat => {
            const isLinked = linkedSet.has(chat.id);
            return `
                <label class="idea-item ${isLinked ? 'disabled' : ''}" style="display: flex; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; cursor: ${isLinked ? 'not-allowed' : 'pointer'}; opacity: ${isLinked ? '0.5' : '1'};">
                    <input type="radio" name="linkedIdea" value="${chat.id}" ${isLinked ? 'disabled' : ''} style="margin-top: 4px;">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; margin-bottom: 4px;">${this.escapeHtml(chat.title)}</div>
                        <div style="font-size: 13px; color: var(--text-secondary);">${this.formatTimeAgo(chat.updatedAt)}</div>
                    </div>
                </label>
            `;
        }).join('');

        const dialogHTML = `
            <div style="max-height: 60vh; overflow-y: auto; padding: 4px;">
                <div style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">
                    选择一个已完成分析的创意引入项目：
                </div>
                <div id="linkedIdeaList" style="display: flex; flex-direction: column; gap: 12px;">
                    ${ideaListHTML}
                </div>
            </div>
            <div style="display: flex; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);">
                <button class="btn-secondary" onclick="window.modalManager.close('linkIdeaDialog')" style="flex: 1;">取消</button>
                <button class="btn-primary" onclick="projectManager.confirmLinkIdea('${project.id}')" style="flex: 1;">引入创意</button>
            </div>
        `;

        window.modalManager.showCustomModal('引入创意', dialogHTML, 'linkIdeaDialog');
    }

    async confirmLinkIdea(projectId) {
        const selected = document.querySelector('input[name="linkedIdea"]:checked');
        if (!selected) {
            window.modalManager.alert('请选择一个创意', 'warning');
            return;
        }

        const project = await this.getProject(projectId);
        if (!project) return;

        const ideaId = selected.value;
        const linkedIdeas = Array.from(new Set([...(project.linkedIdeas || []), ideaId]));

        const updatedProject = await this.updateProject(projectId, { linkedIdeas });
        const viewProject = updatedProject || { ...project, linkedIdeas };
        await this.saveIdeaKnowledge(projectId, ideaId);

        window.modalManager.close('linkIdeaDialog');
        this.renderProjectIdeasPanel(viewProject);
        this.renderProjectKnowledgePanel(viewProject);
    }

    async saveIdeaKnowledge(projectId, ideaId) {
        if (!this.storageManager) return;

        try {
            const chat = await this.storageManager.getChat(ideaId);
            if (!chat) return;

            await this.storageManager.saveKnowledge({
                projectId,
                scope: 'project',
                type: 'idea',
                title: chat.title || '创意摘要',
                content: chat.messages?.slice(0, 3).map(m => `${m.role}: ${m.content}`).join('\n') || '',
                tags: ['创意引入'],
                createdAt: Date.now()
            });
        } catch (error) {
            console.error('[ProjectManager] 保存创意知识失败:', error);
        }
    }

    /**
     * 显示创建项目对话框
     */
    async showCreateProjectDialog() {
        try {
            console.log('[ProjectManager] 显示创建项目对话框');

            // 获取所有对话
            const chats = await this.storageManager.getAllChats();

            // 筛选已完成分析的对话
            const analyzedChats = chats.filter(chat => chat.analysisCompleted);

            if (analyzedChats.length === 0) {
                if (window.modalManager) {
                    window.modalManager.alert('暂无可用创意<br><br>请先在对话中完成创意分析，然后再创建项目', 'info');
                } else {
                    alert('暂无可用创意\n\n请先在对话中完成创意分析，然后再创建项目');
                }
                return;
            }

            // 检查哪些创意已经创建过项目
            const chatIdsWithProjects = new Set(this.projects.map(p => p.ideaId));

            // 显示创意选择对话框
            const ideaListHTML = analyzedChats.map(chat => {
                const hasProject = chatIdsWithProjects.has(chat.id);
                const disabledClass = hasProject ? 'disabled' : '';
                const disabledAttr = hasProject ? 'disabled' : '';

                return `
                    <label class="idea-item ${disabledClass}" style="display: flex; gap: 12px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; cursor: ${hasProject ? 'not-allowed' : 'pointer'}; opacity: ${hasProject ? '0.5' : '1'};">
                        <input type="radio" name="selectedIdea" value="${chat.id}" ${disabledAttr} style="margin-top: 4px;">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; margin-bottom: 4px;">${this.escapeHtml(chat.title)}</div>
                            <div style="font-size: 14px; color: var(--text-secondary);">
                                ${this.formatTimeAgo(chat.updatedAt)}
                                ${hasProject ? '· 已创建项目' : ''}
                            </div>
                        </div>
                    </label>
                `;
            }).join('');

            const dialogHTML = `
                <div style="max-height: 60vh; overflow-y: auto; padding: 4px;">
                    <div style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">
                        选择一个已完成分析的创意来创建项目：
                    </div>
                    <div id="ideaList" style="display: flex; flex-direction: column; gap: 12px;">
                        ${ideaListHTML}
                    </div>
                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border);">
                        <div style="margin-bottom: 12px; font-weight: 500;">选择开发模式：</div>
                        <div style="display: flex; gap: 12px;">
                            <label style="flex: 1; padding: 16px; border: 2px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.2s;" onclick="this.querySelector('input').checked = true; this.style.borderColor = 'var(--primary)'; this.parentElement.querySelectorAll('label').forEach(l => {if(l !== this) l.style.borderColor = 'var(--border)'})">
                                <input type="radio" name="projectMode" value="demo" checked style="margin-right: 8px;">
                                <strong>Demo模式</strong>
                                <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">快速生成原型验证创意</div>
                            </label>
                            <label style="flex: 1; padding: 16px; border: 2px solid var(--border); border-radius: 8px; cursor: pointer; transition: all 0.2s;" onclick="this.querySelector('input').checked = true; this.style.borderColor = 'var(--primary)'; this.parentElement.querySelectorAll('label').forEach(l => {if(l !== this) l.style.borderColor = 'var(--border)'})">
                                <input type="radio" name="projectMode" value="development" style="margin-right: 8px;">
                                <strong>协同开发</strong>
                                <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">完整开发流程，生产级产品</div>
                            </label>
                        </div>
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
                const chatTitles = analyzedChats.map((c, i) => `${i + 1}. ${c.title}`).join('\n');
                const choice = prompt(`选择创意（输入序号）：\n\n${chatTitles}`);
                if (choice) {
                    const index = parseInt(choice) - 1;
                    if (index >= 0 && index < analyzedChats.length) {
                        const chat = analyzedChats[index];
                        const mode = confirm('选择开发模式：\n\n确定 = Demo模式\n取消 = 协同开发模式') ? 'demo' : 'development';
                        await this.createProjectFromIdea(chat.id, mode, chat.title);
                    }
                }
            }

        } catch (error) {
            console.error('[ProjectManager] 显示创建项目对话框失败:', error);
            alert('显示对话框失败: ' + error.message);
        }
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

            // 获取选中的模式
            const selectedModeInput = document.querySelector('input[name="projectMode"]:checked');
            const mode = selectedModeInput ? selectedModeInput.value : 'demo';

            // 获取创意标题
            const chat = await this.storageManager.getChat(ideaId);
            const projectName = chat ? `${chat.title} - 项目` : '新项目';

            // 关闭对话框
            if (window.modalManager) {
                window.modalManager.close('createProjectDialog');
            }

            // 如果是协同开发模式，显示工作流推荐
            if (mode === 'development' && window.workflowRecommendationManager) {
                await window.workflowRecommendationManager.showRecommendationDialog(
                    projectName,
                    ideaId,
                    async (selectedStages) => {
                        // 创建项目并设置自定义工作流
                        await this.createProjectWithWorkflow(ideaId, mode, projectName, selectedStages);
                    }
                );
            } else {
                // Demo模式或不支持推荐，直接创建
                await this.createProjectFromIdea(ideaId, mode, projectName);
            }

        } catch (error) {
            console.error('[ProjectManager] 创建项目失败:', error);
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
     * @param {String} mode - 模式
     * @param {String} name - 项目名称
     * @param {Array<String>} selectedStages - 选中的阶段ID
     */
    async createProjectWithWorkflow(ideaId, mode, name, selectedStages) {
        try {
            // 创建项目
            const project = await this.createProject(ideaId, mode, name);

            // 如果有自定义阶段，更新工作流
            if (selectedStages && selectedStages.length > 0 && project.workflow) {
                // 过滤出选中的阶段
                project.workflow.stages = project.workflow.stages.filter(stage =>
                    selectedStages.includes(stage.id)
                );

                // 保存更新后的项目
                await this.storageManager.saveProject(project);
            }

            // 刷新项目列表
            await this.loadProjects();
            this.renderProjectList('projectListContainer');

            // 显示成功提示
            if (window.modalManager) {
                const modeText = mode === 'demo' ? 'Demo模式' : '协同开发模式';
                window.modalManager.alert(
                    `项目创建成功！<br><br>模式：${modeText}<br>名称：${this.escapeHtml(name)}<br>阶段数：${selectedStages.length}`,
                    'success'
                );
            } else {
                alert('项目创建成功！');
            }

            console.log('[ProjectManager] 项目创建成功:', project.id);

        } catch (error) {
            console.error('[ProjectManager] 创建项目失败:', error);
            throw error;
        }
    }

    /**
     * 从创意创建项目
     * @param {String} ideaId - 创意ID
     * @param {String} mode - 模式
     * @param {String} name - 项目名称
     */
    async createProjectFromIdea(ideaId, mode, name) {
        try {
            // 创建项目
            const project = await this.createProject(ideaId, mode, name);

            // 刷新项目列表
            await this.loadProjects();
            this.renderProjectList('projectListContainer');

            // 显示成功提示
            if (window.modalManager) {
                const modeText = mode === 'demo' ? 'Demo模式' : '协同开发模式';
                window.modalManager.alert(`项目创建成功！<br><br>模式：${modeText}<br>名称：${this.escapeHtml(name)}`, 'success');
            } else {
                alert('项目创建成功！');
            }

            console.log('[ProjectManager] 项目创建成功:', project.id);

        } catch (error) {
            console.error('[ProjectManager] 创建项目失败:', error);
            throw error;
        }
    }

    /**
     * 打开项目详情
     * @param {String} projectId - 项目ID
     */
    async openProject(projectId) {
        try {
            console.log('[ProjectManager] 打开项目:', projectId);

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
            console.error('[ProjectManager] 打开项目失败:', error);
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
            console.error('[ProjectManager] modalManager不可用');
            return;
        }

        const workflowReady = !!window.workflowExecutor;
        if (!project.workflow || !project.workflow.stages) {
            window.modalManager.alert('项目工作流不存在或未加载', 'warning');
            return;
        }

        const progress = this.calculateWorkflowProgress(project.workflow);

        // 渲染阶段卡片
        const stagesHTML = project.workflow.stages.map((stage, index) => {
            const definition = window.workflowExecutor?.getStageDefinition(stage.id);
            const statusText = {
                'pending': '未开始',
                'active': '进行中',
                'completed': '已完成'
            }[stage.status] || stage.status;

            const statusColor = {
                'pending': '#9ca3af',
                'active': '#3b82f6',
                'completed': '#10b981'
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
        }).join('');

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
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span>🚀</span>
                            <span>${project.mode === 'demo' ? 'Demo模式' : '协同开发模式'}</span>
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

        window.modalManager.showCustomModal(
            '🎯 项目工作流',
            contentHTML,
            'workflowDetails'
        );
    }

    /**
     * 执行所有阶段
     * @param {String} projectId - 项目ID
     */
    async executeAllStages(projectId) {
        try {
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
            const confirmed = confirm(`将执行 ${pendingStages.length} 个阶段，这可能需要一些时间，是否继续？`);
            if (!confirmed) return;

            // 关闭详情页
            if (window.modalManager) {
                window.modalManager.close('workflowDetails');
            }

            // 显示执行提示
            if (window.modalManager) {
                window.modalManager.alert('正在批量执行工作流，请稍候...', 'info');
            }

            // 获取创意对话内容
            const chat = await this.storageManager.getChat(project.ideaId);
            const conversation = chat ? chat.messages.map(m => `${m.role}: ${m.content}`).join('\n\n') : '';

            // 调用workflowExecutor批量执行
            const result = await window.workflowExecutor.executeBatch(
                projectId,
                pendingStages,
                conversation
            );

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
            console.error('[ProjectManager] 执行工作流失败:', error);
            if (window.modalManager) {
                window.modalManager.close();
                window.modalManager.alert('执行失败: ' + error.message, 'error');
            }
        }
    }

    /**
     * 预览Demo
     * @param {String} projectId - 项目ID
     */
    async previewDemo(projectId) {
        try {
            const project = await this.getProject(projectId);
            if (project.demo && project.demo.previewUrl) {
                window.open(project.demo.previewUrl, '_blank');
            }
        } catch (error) {
            console.error('[ProjectManager] 预览Demo失败:', error);
            alert('预览失败');
        }
    }

    /**
     * 重新生成Demo
     * @param {String} projectId - 项目ID
     */
    regenerateDemo(projectId) {
        console.log('[ProjectManager] 重新生成Demo:', projectId);
        this.startDemoGeneration(projectId);
    }

    /**
     * 开始生成Demo
     * @param {String} projectId - 项目ID
     */
    startDemoGeneration(projectId) {
        console.log('[ProjectManager] 开始生成Demo:', projectId);
        window.currentDemoProjectId = projectId;
        const modal = document.getElementById('demoTypeModal');
        if (modal) {
            modal.classList.add('active');
            return;
        }
        if (typeof window.startDemoGeneration === 'function') {
            window.startDemoGeneration();
            return;
        }
        alert('Demo生成功能暂不可用');
    }

    /**
     * 评估升级协同开发所需角色
     * @param {Object} project - 项目对象
     * @returns {Object} 评估结果
     */
    evaluateUpgradeReadiness(project) {
        const agentMarket = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];
        const assigned = project?.assignedAgents || [];
        const assignedRoles = assigned
            .map(id => agentMarket.find(agent => agent.id === id))
            .filter(Boolean)
            .map(agent => agent.role);

        const requiredRoles = ['产品经理', '技术架构师', 'UI/UX设计师'];
        const missingRoles = requiredRoles.filter(role => !assignedRoles.includes(role));
        const suggestions = agentMarket.filter(agent => missingRoles.includes(agent.role));

        return { missingRoles, suggestions };
    }

    confirmUpgradeWithMissingRoles(projectId, readiness) {
        if (!window.modalManager) {
            const proceed = confirm(`缺少角色：${readiness.missingRoles.join('、')}。\n仍要继续升级吗？`);
            if (!proceed) {
                this.showMemberModal(projectId);
            }
            return Promise.resolve(proceed);
        }

        return new Promise(resolve => {
            this.pendingUpgradeResolver = resolve;
            const suggestionHTML = readiness.suggestions.length > 0
                ? readiness.suggestions.map(agent => `<div>${agent.avatar} ${agent.name} · ${agent.role}</div>`).join('')
                : '<div>暂无匹配的雇佣建议</div>';

            const modalHTML = `
                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">
                    升级为协同开发需要补齐以下角色：
                </div>
                <div style="font-weight: 600; margin-bottom: 12px;">${readiness.missingRoles.join('、')}</div>
                <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: var(--bg-secondary); margin-bottom: 16px;">
                    ${suggestionHTML}
                </div>
                <div style="display: flex; gap: 12px;">
                    <button class="btn-secondary" onclick="projectManager.handleUpgradeDecision(false, '${projectId}')" style="flex: 1;">去雇佣</button>
                    <button class="btn-primary" onclick="projectManager.handleUpgradeDecision(true, '${projectId}')" style="flex: 1;">继续升级</button>
                </div>
            `;

            window.modalManager.showCustomModal('协同升级评估', modalHTML, 'upgradeRoleCheck');
        });
    }

    handleUpgradeDecision(continueUpgrade, projectId) {
        if (window.modalManager) {
            window.modalManager.close('upgradeRoleCheck');
        }
        if (!continueUpgrade) {
            this.showMemberModal(projectId);
        }
        if (this.pendingUpgradeResolver) {
            this.pendingUpgradeResolver(!!continueUpgrade);
            this.pendingUpgradeResolver = null;
        }
    }
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

    console.log('[ProjectManager] 项目管理器已加载');
}
