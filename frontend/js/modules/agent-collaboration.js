/**
 * Agent collaboration planner
 */
class AgentCollaboration {
  constructor() {
    const defaultApiUrl =
      window.location.hostname === 'localhost' && window.location.port === '8000'
        ? 'http://localhost:3000'
        : window.location.origin;
    this.apiUrl = window.appState?.settings?.apiUrl || defaultApiUrl;
    this.storageKeyPrefix = 'collaboration:plan';
  }

  escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  buildConversationText(messages = []) {
    return messages
      .filter(m => m && typeof m.content === 'string')
      .map(m => `${m.role || 'user'}: ${m.content}`)
      .join('\n\n')
      .trim();
  }

  normalizeIdeaId(value) {
    if (value === null || value === undefined) {
      return value;
    }
    const raw = String(value).trim();
    if (/^\d+$/.test(raw)) {
      return Number(raw);
    }
    return value;
  }

  extractIdeaHint(text) {
    const patterns = [
      /(?:创意|想法|项目|产品|计划)\s*(?:是|为|叫|名称|命名|名为)\s*[:：]?(.{4,40}?)(?:[。！？!?\n]|$)/,
      /(?:我想做|我要做|我希望做|我们要做|我们想做)\s*[:：]?(.{4,40}?)(?:[。！？!?\n]|$)/,
      /(?:目标|目的|核心)\s*(?:是|为)\s*[:：]?(.{4,40}?)(?:[。！？!?\n]|$)/
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  }

  generateIdeaNameFromConversation(messages = []) {
    const combined = messages
      .filter(m => m && typeof m.content === 'string')
      .map(m => m.content)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!combined) {
      return '未命名创意';
    }

    const hint = this.extractIdeaHint(combined);
    const source = hint || combined;
    const maxLength = 24;
    if (source.length <= maxLength) {
      return source;
    }
    return `${source.slice(0, maxLength)}...`;
  }

  generateIdeaNameFromText(text = '') {
    const combined = String(text || '').replace(/\s+/g, ' ').trim();
    if (!combined) {
      return '';
    }
    const hint = this.extractIdeaHint(combined);
    const source = hint || combined;
    const maxLength = 24;
    if (source.length <= maxLength) {
      return source;
    }
    return `${source.slice(0, maxLength)}...`;
  }

  resolveIdeaContext({ idea, chat, conversation }) {
    const hasManualTitle = chat?.titleEdited === true;
    const autoName =
      this.generateIdeaNameFromConversation(chat?.messages || []) ||
      this.generateIdeaNameFromText(conversation || '');
    const displayName = hasManualTitle
      ? chat?.title || idea || '未命名创意'
      : autoName || idea || '未命名创意';
    const isAuto = !hasManualTitle;
    const conversationText =
      conversation ||
      this.buildConversationText(chat?.messages || []) ||
      idea ||
      displayName;
    return {
      displayName,
      isAuto,
      conversationText
    };
  }

  getSuggestionStorageKey({ projectId, idea }) {
    const fallback = String(idea || '').trim() || 'unknown';
    const keyPart = projectId ? `project:${projectId}` : `idea:${fallback}`;
    return `${this.storageKeyPrefix}:${keyPart}`;
  }

  loadSuggestion(storageKey) {
    if (!storageKey || !window.localStorage) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  saveSuggestion(storageKey, payload) {
    if (!storageKey || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {}
  }

  formatUpdatedAt(timestamp) {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleString('zh-CN');
    } catch (error) {
      return '';
    }
  }

  renderSuggestionContent(markdown, updatedAt, collaborationMode = '') {
    const suggestionBox = document.getElementById('collaborationSuggestion');
    const metaBox = document.getElementById('collaborationSuggestionMeta');
    if (!suggestionBox) {
      return;
    }

    const text = String(markdown || '').trim();
    const rendered = window.markdownRenderer
      ? window.markdownRenderer.render(text)
      : this.escapeHtml(text).replace(/\n/g, '<br>');

    suggestionBox.classList.add('markdown-content');
    suggestionBox.innerHTML =
      text
        ? rendered
        : '<div style="color: var(--text-secondary); font-size: 13px;">暂无协作建议</div>';

    if (metaBox) {
      const updatedText = updatedAt ? `上次更新：${this.formatUpdatedAt(updatedAt)}` : '等待生成';
      metaBox.textContent = collaborationMode ? `协作模式：${collaborationMode} · ${updatedText}` : updatedText;
    }
  }

  renderSuggestionLoading() {
    const suggestionBox = document.getElementById('collaborationSuggestion');
    const metaBox = document.getElementById('collaborationSuggestionMeta');
    if (suggestionBox) {
      suggestionBox.classList.remove('markdown-content');
      suggestionBox.innerHTML =
        '<div style="color: var(--text-secondary); font-size: 13px;">正在生成协作建议...</div>';
    }
    if (metaBox) {
      metaBox.textContent = '生成中...';
    }
  }

  getWorkflowCatalog() {
    return window.projectManager?.getWorkflowCatalog?.() || {
      'product-development': {
        id: 'product-development',
        name: '统一产品开发流程',
        stages: [
          { id: 'strategy', name: '战略设计阶段' },
          { id: 'requirement', name: '需求阶段' },
          { id: 'design', name: '设计阶段' },
          { id: 'architecture', name: '架构阶段' },
          { id: 'development', name: '开发阶段' },
          { id: 'testing', name: '测试阶段' },
          { id: 'deployment', name: '部署阶段' },
          { id: 'operation', name: '运营阶段' }
        ],
        agents: {
          strategy: ['strategy-design'],
          requirement: ['product-manager'],
          design: ['ui-ux-designer'],
          architecture: ['tech-lead'],
          development: ['frontend-developer', 'backend-developer'],
          testing: ['qa-engineer'],
          deployment: ['devops'],
          operation: ['marketing', 'operations']
        }
      }
    };
  }

  getDefaultRecommendedAgentIds(workflowCategory) {
    const category = workflowCategory || 'product-development';
    const workflow = this.getWorkflowCatalog()?.[category];
    if (!workflow || !workflow.agents) {
      return [];
    }
    const ids = Object.values(workflow.agents).flat();
    return Array.from(new Set(ids.filter(Boolean)));
  }

  async open({ idea, agents = [], projectId, chat, conversation, workflowCategory, collaborationExecuted = false }) {
    if (!window.modalManager) {
      return;
    }

    let project = null;
    if (projectId && window.storageManager?.getProject) {
      try {
        project = await window.storageManager.getProject(projectId);
      } catch (error) {}
    }

    let resolvedChat = chat;
    if (!resolvedChat && projectId && window.storageManager?.getProject) {
      try {
        const rawIdeaId = project?.ideaId ?? project?.linkedIdeas?.[0];
        if (rawIdeaId !== undefined) {
          const normalizedIdeaId = this.normalizeIdeaId(rawIdeaId);
          resolvedChat =
            (await window.storageManager.getChat(normalizedIdeaId)) ||
            (await window.storageManager.getChat(rawIdeaId));
        }
      } catch (error) {}
    }

    this.currentContext = {
      idea,
      agents,
      projectId,
      chat: resolvedChat,
      conversation,
      workflowCategory,
      collaborationExecuted
    };
    const ideaContext = this.resolveIdeaContext({
      idea,
      chat: resolvedChat,
      conversation
    });
    const ideaDisplayHtml = `${this.escapeHtml(ideaContext.displayName)}${
      ideaContext.isAuto ? '<span title="自动生成" style="margin-left: 6px;">🤖</span>' : ''
    }`;

    // 初始显示：如果有缓存的推荐成员，显示推荐成员；否则显示加载提示
    const cached = project?.collaborationSuggestion || this.loadSuggestion(this.getSuggestionStorageKey({
      projectId,
      idea: ideaContext.displayName
    }));
    const initialAgents = cached?.recommendedAgents?.length > 0 ? cached.recommendedAgents : [];
    const agentCards = initialAgents.length > 0
      ? this.renderMemberCards(await this.resolveMemberList(initialAgents, agents), true)
      : '<div style="color: var(--text-secondary); font-size: 13px;">正在生成雇佣建议...</div>';

    const contentHTML = `
      <div style="display: grid; gap: 16px; max-height: 70vh; overflow-y: auto;">
        ${collaborationExecuted ? '<div style="padding: 8px 12px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; color: #0369a1; font-size: 14px; display: flex; align-items: center; gap: 6px;"><span>✓</span><span>已确认执行</span></div>' : ''}
        <div>
          <div style="font-weight: 600; margin-bottom: 6px;">创意</div>
          <div style="color: var(--text-secondary);">${ideaDisplayHtml}</div>
        </div>
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="font-weight: 600;">协作模式建议</div>
            <div id="collaborationSuggestionMeta" style="font-size: 12px; color: var(--text-tertiary);">等待生成</div>
          </div>
          <div id="collaborationSuggestion" style="padding: 14px; border: 1px solid var(--border); border-radius: 12px; min-height: 140px; max-height: 300px; overflow-y: auto; background: #fff; box-shadow: 0 1px 2px rgba(15,23,42,0.05); line-height: 1.7;"></div>
        </div>
        <div>
          <div style="font-weight: 600; margin-bottom: 6px;">雇佣建议</div>
          <div id="collaborationMemberList" class="${collaborationExecuted ? 'readonly-mode' : ''}" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; max-height: 400px; overflow-y: auto;">
            ${agentCards}
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
            根据创意深度思考给出雇佣建议，本期暂不支持对雇佣成员组合进行调整。
          </div>
        </div>
        <div style="display: flex; gap: 12px; position: sticky; bottom: -24px; background: white; padding: 16px 0; margin: 0 -24px; padding-left: 24px; padding-right: 24px; border-top: 1px solid var(--border); box-shadow: 0 -4px 12px rgba(0,0,0,0.08);">
          ${collaborationExecuted
            ? '<button class="btn-primary" id="collaborationClose" style="flex: 1;">关闭</button>'
            : `
          <button class="btn-secondary" id="collaborationCancel" style="flex: 1;">取消</button>
          <button class="btn-primary" id="collaborationConfirm" style="flex: 1;">确认进入执行</button>
            `
          }
        </div>
      </div>
    `;

    window.modalManager.showCustomModal('协同模式', contentHTML, 'collaborationModeModal');

    const storageKey = this.getSuggestionStorageKey({
      projectId,
      idea: ideaContext.displayName
    });
    const cachedSuggestion = project?.collaborationSuggestion || this.loadSuggestion(storageKey);

    if (cachedSuggestion && cachedSuggestion.plan) {
      this.renderSuggestionContent(cachedSuggestion.plan, cachedSuggestion.updatedAt, cachedSuggestion.collaborationMode);
      const cachedList = Array.isArray(cachedSuggestion.recommendedAgents) ? cachedSuggestion.recommendedAgents : [];
      const fallbackList =
        cachedList.length > 0 ? cachedList : this.getDefaultRecommendedAgentIds(workflowCategory);
      const memberList = fallbackList.length ? fallbackList : agents;
      const resolved = await this.resolveMemberList(memberList, agents);
      this.renderMemberList(resolved, fallbackList.length > 0);
    } else {
      this.renderSuggestionLoading();
      await this.requestSuggestion(
        ideaContext.displayName,
        agents,
        '',
        ideaContext.conversationText,
        storageKey,
        projectId,
        project,
        workflowCategory
      );
    }

    setTimeout(() => {
      const collaborationExecuted = this.currentContext?.collaborationExecuted || false;

      if (collaborationExecuted) {
        // 已执行状态：只显示关闭按钮
        document.getElementById('collaborationClose')?.addEventListener('click', () => {
          window.modalManager?.close('collaborationModeModal');
        });
      } else {
        // 未执行状态：显示取消和确认按钮
        document.getElementById('collaborationCancel')?.addEventListener('click', () => {
          window.modalManager?.close('collaborationModeModal');
        });
        document.getElementById('collaborationConfirm')?.addEventListener('click', async () => {
          await this.confirmExecution();
        });
      }
    }, 0);
  }

  async requestSuggestion(
    idea,
    agents,
    instruction = '',
    conversation = '',
    storageKey = '',
    projectId = '',
    project = null,
    workflowCategory = ''
  ) {
    try {
      const response = await fetch(`${this.apiUrl}/api/agents/collaboration-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          agents: agents.map(a => ({ id: a.id, name: a.nickname || a.name, type: a.type || a.name })),
          instruction,
          conversation,
          workflowCategory
        })
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.code === -1) {
        const message = result.error || '生成失败';
        throw new Error(message);
      }
      const plan = result.data?.plan || '暂无建议';
      const recommendedAgents = Array.isArray(result.data?.recommendedAgents)
        ? result.data.recommendedAgents
        : [];
      const collaborationMode = result.data?.collaborationMode || '';
      const updatedAt = Date.now();
      const payload = {
        plan,
        updatedAt,
        idea,
        instruction,
        recommendedAgents,
        collaborationMode
      };

      if (projectId && window.storageManager?.saveProject) {
        try {
          const target = project || (await window.storageManager.getProject(projectId));
          if (target) {
            target.collaborationSuggestion = payload;
            await window.storageManager.saveProject(target);
          }
        } catch (error) {
          this.saveSuggestion(storageKey, payload);
        }
      } else {
        this.saveSuggestion(storageKey, payload);
      }
      this.renderSuggestionContent(plan, updatedAt, collaborationMode);
      const fallbackList =
        recommendedAgents.length > 0
          ? recommendedAgents
          : this.getDefaultRecommendedAgentIds(this.currentContext?.workflowCategory);
      const memberList = fallbackList.length ? fallbackList : agents;
      const resolved = await this.resolveMemberList(memberList, agents);
      // 只有当recommendedAgents有值时才标记为推荐
      const isRecommendation = recommendedAgents.length > 0;
      this.renderMemberList(resolved, isRecommendation);
    } catch (error) {
      const suggestionBox = document.getElementById('collaborationSuggestion');
      const metaBox = document.getElementById('collaborationSuggestionMeta');
      if (suggestionBox) {
        suggestionBox.classList.remove('markdown-content');
        suggestionBox.textContent = error?.message ? `生成失败：${error.message}` : '生成失败，请稍后重试';
      }
      if (metaBox) {
        metaBox.textContent = '生成失败';
      }
    }
  }

  renderMemberCards(agents = [], isRecommendation = false) {
    const list = Array.isArray(agents) ? agents : [];
    if (list.length === 0) {
      return `<div style="color: var(--text-secondary); font-size: 13px;">暂无成员</div>`;
    }
    return list
      .map(agent => {
        const displayName = agent.nickname || agent.name || '未命名成员';
        const roleName = agent.type || agent.name || '数字员工';
        const avatarSeed = agent.avatar || agent.emoji || roleName || displayName;
        const avatar =
          typeof window.getAgentIconSvg === 'function'
            ? window.getAgentIconSvg(avatarSeed, 30, 'agent-card-icon')
            : agent.emoji || '🧠';
        const skills = Array.isArray(agent.skills) ? agent.skills : [];
        const skillTags = skills.length
          ? skills
              .slice(0, 4)
              .map(
                skill =>
                  `<span style="padding: 2px 8px; border-radius: 999px; background: rgba(59,130,246,0.12); color: #1d4ed8; font-size: 11px;">${this.escapeHtml(skill)}</span>`
              )
              .join('')
          : '<span style="font-size: 11px; color: var(--text-tertiary);">暂无标签</span>';
        const badge = isRecommendation
          ? '<span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 999px; font-size: 10px;">推荐</span>'
          : '';
        const promptName = agent.promptName || agent.promptTitle || '';
        const promptDescription = agent.promptDescription || agent.desc || '';
        const promptLine = promptName
          ? `<div style="font-size: 12px; color: var(--text-secondary);">Prompt：${this.escapeHtml(promptName)}</div>`
          : '';
        const descriptionLine = promptDescription
          ? `<div style="font-size: 12px; color: var(--text-secondary);">${this.escapeHtml(promptDescription)}</div>`
          : '';
        return `
                <div style="display: grid; grid-template-columns: 40px 1fr; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; background: #fff;">
                  <div style="width: 40px; height: 40px; display: grid; place-items: center; border-radius: 10px; background: linear-gradient(135deg, rgba(59,130,246,0.18), rgba(16,185,129,0.18));">
                    ${avatar}
                  </div>
                  <div style="display: grid; gap: 6px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                      <div style="font-weight: 600; font-size: 14px;">${this.escapeHtml(displayName)}</div>
                      <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary);">
                        ${badge}
                      </div>
                    </div>
                    ${promptLine}
                    ${descriptionLine}
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                      ${skillTags}
                    </div>
                  </div>
                </div>
              `;
      })
      .join('');
  }

  renderMemberList(agents = [], isRecommendation = false) {
    const container = document.getElementById('collaborationMemberList');
    if (!container) {
      return;
    }
    container.innerHTML = this.renderMemberCards(agents, isRecommendation);
  }

  async resolveMemberList(list = [], fallbackAgents = []) {
    if (!Array.isArray(list) || list.length === 0) {
      return Array.isArray(fallbackAgents) ? fallbackAgents : [];
    }
    const looksLikeIds = typeof list[0] === 'string';
    if (!looksLikeIds) {
      return list;
    }
    const fallback = Array.isArray(fallbackAgents) ? fallbackAgents : [];
    const fallbackMap = new Map(fallback.map(agent => [agent.id, agent]));
    let market = [];
    try {
      market = await window.projectManager?.getAgentMarketList?.(
        this.currentContext?.workflowCategory || 'product-development'
      );
    } catch (error) {}
    const marketMap = new Map((market || []).map(agent => [agent.id, agent]));
    return list.map(id => marketMap.get(id) || fallbackMap.get(id) || { id, name: id, type: id });
  }

  async confirmExecution() {
    if (!this.currentContext?.projectId) {
      window.modalManager?.close('collaborationModeModal');
      return;
    }

    try {
      // 获取当前项目
      const project = await window.storageManager?.getProject(
        this.currentContext.projectId
      );
      const suggestion = project?.collaborationSuggestion;

      // 检查并自动雇佣推荐成员
      if (suggestion?.recommendedAgents?.length > 0) {
        const hiredAgents = (await window.projectManager?.getUserHiredAgents?.()) || [];
        const hiredIds = hiredAgents.map(a => a.id);
        const unhiredIds = suggestion.recommendedAgents.filter(id => !hiredIds.includes(id));

        if (unhiredIds.length > 0) {
          // 自动雇佣推荐成员
          for (const agentId of unhiredIds) {
            try {
              await window.projectManager?.hireAgent?.(agentId);
            } catch (error) {
              console.warn(`自动雇佣成员 ${agentId} 失败:`, error);
            }
          }
        }
      }

      // 标记项目为已执行状态
      await window.storageManager?.saveProject({
        ...project,
        collaborationExecuted: true
      });

      // 应用协同建议到项目阶段
      if (suggestion && window.projectManager?.applyCollaborationSuggestion) {
        await window.projectManager.applyCollaborationSuggestion(
          this.currentContext.projectId,
          suggestion
        );
      }

      // 关闭弹窗
      window.modalManager?.close('collaborationModeModal');

      // 刷新整个项目面板（确保阶段和成员都显示）
      if (window.projectManager?.currentProject?.id === this.currentContext.projectId) {
        const updatedProject = await window.storageManager?.getProject(this.currentContext.projectId);
        window.projectManager.currentProject = updatedProject;
        window.projectManager.renderProjectPanel(updatedProject);
      }

      // 执行工作流
      if (window.projectManager?.executeAllStages) {
        await window.projectManager.executeAllStages(this.currentContext.projectId, {
          skipConfirm: true
        });
      }
    } catch (error) {
      console.error('确认执行失败:', error);
      window.modalManager?.alert('执行失败，请重试', 'error');
    }
  }

  // ==================== Agent System Management ====================

  /**
   * 获取用户ID（用于Agent系统）
   * @returns {String} 用户ID
   */
  getAgentUserId() {
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

  /**
   * 初始化Agent系统
   */
  async initAgentSystem() {
    try {
      // 获取可用的Agent类型
      const response = await fetch(`${this.apiUrl}/api/agents/types`);
      if (response.ok) {
        const result = await response.json();
        if (result.code === 0) {
          this.availableAgentTypes = result.data.types;
        }
      }

      // 获取用户已雇佣的Agent
      await this.loadMyAgents();

      // 更新侧边栏显示
      this.updateAgentTeamSummary();
    } catch (error) {
      console.error('[Agent系统] 初始化失败:', error);
    }
  }

  /**
   * 加载用户已雇佣的Agent
   */
  async loadMyAgents() {
    try {
      const response = await fetch(`${this.apiUrl}/api/agents/my/${this.getAgentUserId()}`);
      if (response.ok) {
        const result = await response.json();
        if (result.code === 0) {
          this.myAgents = result.data.agents || [];
        }
      }
    } catch (error) {
      console.error('[Agent系统] 加载我的Agent失败:', error);
    }
  }

  /**
   * 更新Agent团队摘要显示
   */
  updateAgentTeamSummary() {
    const summaryEl = document.getElementById('agentTeamSummary');
    if (summaryEl) {
      if (!this.myAgents || this.myAgents.length === 0) {
        summaryEl.textContent = '点击管理你的AI员工团队';
      } else {
        summaryEl.textContent = `已雇佣 ${this.myAgents.length} 名员工`;
      }
    }
  }

  /**
   * 雇佣Agent
   * @param {String} agentType - Agent类型
   * @param {String} agentName - Agent名称
   */
  async hireAgent(agentType, agentName) {
    try {
      const response = await fetch(`${this.apiUrl}/api/agents/hire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.getAgentUserId(),
          agentType: agentType
        })
      });

      if (!response.ok) {
        throw new Error('雇佣失败');
      }

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(result.error || '雇佣失败');
      }

      if (window.modalManager) {
        window.modalManager.alert(`✅ 成功雇佣 ${agentName}！`, 'success');
      } else {
        alert(`✅ 成功雇佣 ${agentName}！`);
      }

      // 重新加载数据
      await this.loadMyAgents();
      this.updateAgentTeamSummary();

      // 刷新当前视图
      const contentEl = document.getElementById('agentContent');
      if (contentEl) {
        this.renderHireHall(contentEl);
      }
    } catch (error) {
      if (window.modalManager) {
        window.modalManager.alert(`❌ 雇佣失败: ${error.message}`, 'error');
      } else {
        alert(`❌ 雇佣失败: ${error.message}`);
      }
    }
  }

  /**
   * 解雇Agent
   * @param {String} agentId - Agent ID
   */
  async fireAgent(agentId) {
    const agent = this.myAgents?.find(a => a.id === agentId);
    if (!agent) return;

    if (!confirm(`确定要解雇 ${agent.nickname} 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/agents/${this.getAgentUserId()}/${agentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('解雇失败');
      }

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(result.error || '解雇失败');
      }

      if (window.modalManager) {
        window.modalManager.alert(`✅ 已解雇 ${agent.nickname}`, 'success');
      } else {
        alert(`✅ 已解雇 ${agent.nickname}`);
      }

      // 重新加载数据
      await this.loadMyAgents();
      this.updateAgentTeamSummary();

      // 刷新当前视图
      const contentEl = document.getElementById('agentContent');
      if (contentEl) {
        this.renderMyTeam(contentEl);
      }
    } catch (error) {
      if (window.modalManager) {
        window.modalManager.alert(`❌ 解雇失败: ${error.message}`, 'error');
      } else {
        alert(`❌ 解雇失败: ${error.message}`);
      }
    }
  }

  /**
   * 分配任务给Agent
   * @param {String} agentId - Agent ID
   */
  async assignTaskToAgent(agentId) {
    const agent = this.myAgents?.find(a => a.id === agentId);
    if (!agent) return;

    const task = prompt(`请输入要分配给 ${agent.nickname} 的任务：\n\n例如：分析竞品的优势和劣势`);
    if (!task || task.trim() === '') {
      return;
    }

    try {
      alert(`${agent.nickname} 开始工作中，请稍候...`);

      const response = await fetch(`${this.apiUrl}/api/agents/assign-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.getAgentUserId(),
          agentId: agentId,
          task: task,
          context: window.state?.userData?.idea || ''
        })
      });

      if (!response.ok) {
        throw new Error('任务分配失败');
      }

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(result.error || '任务分配失败');
      }

      // 显示结果
      const taskResult = result.data;
      if (typeof window.showTaskResult === 'function') {
        window.showTaskResult(taskResult);
      }

      // 重新加载团队数据
      await this.loadMyAgents();
    } catch (error) {
      alert(`❌ 任务分配失败: ${error.message}`);
    }
  }

  // ==================== Agent UI Management ====================

  /**
   * 显示Agent管理面板
   */
  showAgentManagement() {
    // 创建模态框HTML
    const modalHTML = `
      <div class="modal" id="agentManagementModal">
        <div class="modal-content" style="max-width: 900px; height: 80vh;">
          <div class="modal-header">
            <h2>👥 数字员工团队管理</h2>
            <button class="close-btn" onclick="window.agentCollaboration.closeAgentManagement()">×</button>
          </div>
          <div class="modal-body" style="padding: 0; height: calc(100% - 60px);">
            <div style="display: flex; height: 100%; border-top: 1px solid var(--border);">
              <!-- 左侧导航 -->
              <div style="width: 200px; border-right: 1px solid var(--border); background: #f9fafb; overflow-y: auto;">
                <div class="agent-nav-item active" onclick="window.agentCollaboration.switchAgentTab('my-team')" data-tab="my-team">
                  <span style="margin-right: 8px;">👥</span>
                  我的团队
                </div>
                <div class="agent-nav-item" onclick="window.agentCollaboration.switchAgentTab('hire')" data-tab="hire">
                  <span style="margin-right: 8px;">🎯</span>
                  招聘大厅
                </div>
                <div class="agent-nav-item" onclick="window.agentCollaboration.switchAgentTab('tasks')" data-tab="tasks">
                  <span style="margin-right: 8px;">📋</span>
                  任务管理
                </div>
                <div class="agent-nav-item" onclick="window.agentCollaboration.switchAgentTab('collaboration')" data-tab="collaboration">
                  <span style="margin-right: 8px;">🤝</span>
                  团队协同
                </div>
              </div>

              <!-- 右侧内容区 -->
              <div style="flex: 1; overflow-y: auto; padding: 24px;" id="agentContent">
                <!-- 动态内容 -->
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        .agent-nav-item {
          padding: 16px 20px;
          cursor: pointer;
          font-size: 14px;
          color: var(--text-secondary);
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }
        .agent-nav-item:hover {
          background: white;
          color: var(--text-primary);
        }
        .agent-nav-item.active {
          background: white;
          color: var(--primary);
          font-weight: 600;
          border-left-color: var(--primary);
        }
        .agent-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          transition: all 0.3s;
        }
        .agent-card:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(79,70,229,0.1);
        }
        .agent-skill-tag {
          display: inline-block;
          background: #f3f4f6;
          color: #6b7280;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          margin: 4px 4px 4px 0;
        }
        .hire-btn {
          background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%);
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
        }
        .hire-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(79,70,229,0.3);
        }
        .fire-btn {
          background: #ef4444;
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 8px;
        }
        .assign-task-btn {
          background: var(--primary);
          color: white;
          border: none;
          padding: 6px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
        }
      </style>
    `;

    // 检查是否已存在模态框，如果存在则移除
    const existingModal = document.getElementById('agentManagementModal');
    if (existingModal) {
      existingModal.remove();
    }

    // 添加到body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 显示模态框
    setTimeout(() => {
      document.getElementById('agentManagementModal').classList.add('active');
      // 默认显示"我的团队"
      this.switchAgentTab('my-team');
    }, 10);
  }

  /**
   * 关闭Agent管理面板
   */
  closeAgentManagement() {
    const modal = document.getElementById('agentManagementModal');
    if (modal) {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    }
  }

  /**
   * 切换Agent标签页
   * @param {String} tab - 标签页名称
   */
  switchAgentTab(tab) {
    // 更新导航样式
    document.querySelectorAll('.agent-nav-item').forEach(item => {
      if (item.dataset.tab === tab) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 更新内容
    const content = document.getElementById('agentContent');
    switch (tab) {
      case 'my-team':
        this.renderMyTeam(content);
        break;
      case 'hire':
        this.renderHireHall(content);
        break;
      case 'tasks':
        this.renderTasks(content);
        break;
      case 'collaboration':
        this.renderCollaboration(content);
        break;
    }
  }

  /**
   * 渲染"我的团队"标签页
   * @param {HTMLElement} container - 容器元素
   */
  renderMyTeam(container) {
    if (!this.myAgents || this.myAgents.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
          <h3 style="color: var(--text-secondary); margin-bottom: 8px;">还没有雇佣员工</h3>
          <p style="color: var(--text-tertiary); margin-bottom: 24px;">去"招聘大厅"雇佣你的第一个数字员工</p>
          <button class="btn-primary" onclick="window.agentCollaboration.switchAgentTab('hire')">
            前往招聘大厅
          </button>
        </div>
      `;
      return;
    }

    const agentsHTML = this.myAgents.map(agent => {
      const skillsHTML = (agent.skills || []).map(skill =>
        `<span class="agent-skill-tag">${this.escapeHtml(skill)}</span>`
      ).join('');

      return `
        <div class="agent-card">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="font-size: 32px; margin-right: 12px;">${agent.emoji || '🧠'}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 16px;">${this.escapeHtml(agent.nickname || agent.name)}</div>
              <div style="color: var(--text-secondary); font-size: 14px;">${this.escapeHtml(agent.type || '数字员工')}</div>
            </div>
          </div>
          <div style="color: var(--text-secondary); margin-bottom: 12px; font-size: 14px;">
            ${this.escapeHtml(agent.description || '暂无描述')}
          </div>
          <div style="margin-bottom: 12px;">
            ${skillsHTML}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="assign-task-btn" onclick="window.agentCollaboration.assignTaskToAgent('${agent.id}')">
              分配任务
            </button>
            <button class="fire-btn" onclick="window.agentCollaboration.fireAgent('${agent.id}')">
              解雇
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <h3 style="margin-bottom: 20px;">我的团队 (${this.myAgents.length})</h3>
      ${agentsHTML}
    `;
  }

  /**
   * 渲染"招聘大厅"标签页
   * @param {HTMLElement} container - 容器元素
   */
  renderHireHall(container) {
    const availableAgents = this.availableAgentTypes || [];
    const hiredIds = (this.myAgents || []).map(a => a.id);

    if (availableAgents.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
          <h3 style="color: var(--text-secondary);">暂无可雇佣的员工</h3>
        </div>
      `;
      return;
    }

    const agentsHTML = availableAgents.map(agent => {
      const isHired = hiredIds.includes(agent.id);
      const skillsHTML = (agent.skills || []).map(skill =>
        `<span class="agent-skill-tag">${this.escapeHtml(skill)}</span>`
      ).join('');

      return `
        <div class="agent-card ${isHired ? 'hired' : ''}">
          <div style="display: flex; align-items: center; margin-bottom: 12px;">
            <div style="font-size: 32px; margin-right: 12px;">${agent.emoji || '🧠'}</div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 16px;">${this.escapeHtml(agent.name)}</div>
              <div style="color: var(--text-secondary); font-size: 14px;">${this.escapeHtml(agent.type || '数字员工')}</div>
            </div>
          </div>
          <div style="color: var(--text-secondary); margin-bottom: 12px; font-size: 14px;">
            ${this.escapeHtml(agent.description || '暂无描述')}
          </div>
          <div style="margin-bottom: 12px;">
            ${skillsHTML}
          </div>
          <button class="hire-btn ${isHired ? 'hired' : ''}"
                  onclick="window.agentCollaboration.hireAgent('${agent.type}', '${this.escapeHtml(agent.name)}')"
                  ${isHired ? 'disabled' : ''}>
            ${isHired ? '✓ 已雇佣' : '雇佣'}
          </button>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <h3 style="margin-bottom: 20px;">招聘大厅</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px;">
        ${agentsHTML}
      </div>
    `;
  }

  /**
   * 渲染"任务管理"标签页
   * @param {HTMLElement} container - 容器元素
   */
  renderTasks(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
        <h3 style="color: var(--text-secondary);">任务管理功能开发中</h3>
        <p style="color: var(--text-tertiary); margin-top: 8px;">敬请期待</p>
      </div>
    `;
  }

  /**
   * 渲染"团队协同"标签页
   * @param {HTMLElement} container - 容器元素
   */
  renderCollaboration(container) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🤝</div>
        <h3 style="color: var(--text-secondary);">团队协同功能开发中</h3>
        <p style="color: var(--text-tertiary); margin-top: 8px;">敬请期待</p>
      </div>
    `;
  }

  // ==================== Team Space Agent Management ====================

  /**
   * 雇佣团队Agent（用于团队空间）
   * @param {String} agentId - Agent ID
   */
  hireTeamAgent(agentId) {
    const AVAILABLE_AGENTS = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];
    const agent = AVAILABLE_AGENTS.find(a => a.id === agentId);
    if (!agent) return;

    // 检查是否已经雇佣
    const teamAgents = window.state?.teamSpace?.agents || [];
    if (teamAgents.find(a => a.id === agentId)) {
      alert('该员工已经被雇佣');
      return;
    }

    // 添加到已雇佣列表
    if (window.state?.teamSpace) {
      window.state.teamSpace.agents.push({
        ...agent,
        hiredAt: new Date().toISOString()
      });

      if (typeof window.saveTeamSpace === 'function') {
        window.saveTeamSpace();
      }

      // 刷新视图
      if (typeof window.renderAgentMarket === 'function') {
        window.renderAgentMarket();
      }

      alert(`✅ 成功雇佣 ${agent.name}`);
    }
  }

  /**
   * 解雇团队Agent（用于团队空间）
   * @param {String} agentId - Agent ID
   */
  fireTeamAgent(agentId) {
    const teamAgents = window.state?.teamSpace?.agents || [];
    const agent = teamAgents.find(a => a.id === agentId);
    if (!agent) return;

    if (!confirm(`确定要解雇 ${agent.name} 吗？`)) return;

    // 从所有项目中移除该员工
    if (window.state?.teamSpace?.projects) {
      window.state.teamSpace.projects.forEach(project => {
        project.assignedAgents = (project.assignedAgents || []).filter(id => id !== agentId);
      });
    }

    // 从已雇佣列表中移除
    if (window.state?.teamSpace) {
      window.state.teamSpace.agents = teamAgents.filter(a => a.id !== agentId);

      if (typeof window.saveTeamSpace === 'function') {
        window.saveTeamSpace();
      }

      // 刷新视图
      if (typeof window.renderHiredAgents === 'function') {
        window.renderHiredAgents();
      }
      if (window.projectManager?.renderProjectList) {
        window.projectManager.renderProjectList('projectListContainer');
      }

      alert(`${agent.name} 已被解雇`);
    }
  }

  /**
   * 从项目模态框解雇Agent
   * @param {String} agentId - Agent ID
   */
  fireAgentFromModal(agentId) {
    const project = window.currentProject;
    if (!project) return;

    const agentMarket = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];
    const agent = agentMarket.find(item => item.id === agentId);
    const agentName = agent?.name || '该成员';

    if (!confirm(`确定要将 ${agentName} 从项目中移除吗？`)) {
      return;
    }

    const assignedAgents = project.assignedAgents || [];
    const index = assignedAgents.indexOf(agentId);
    if (index > -1) {
      assignedAgents.splice(index, 1);
      project.assignedAgents = assignedAgents;

      // 保存到 localStorage
      if (typeof window.saveTeamSpace === 'function') {
        window.saveTeamSpace();
      }

      // 刷新视图
      if (typeof window.renderProjectHiredAgents === 'function') {
        window.renderProjectHiredAgents();
      }
      if (typeof window.renderAvailableAgents === 'function') {
        window.renderAvailableAgents();
      }
      if (typeof window.renderProjectMembers === 'function') {
        window.renderProjectMembers(project);
      }

      const memberCountEl = document.getElementById('projectMemberCount');
      if (memberCountEl) {
        memberCountEl.textContent = (project.members?.length || 0) + (project.assignedAgents?.length || 0);
      }
    }
  }

  /**
   * 切换Agent雇佣状态（用于项目）
   * @param {String} agentId - Agent ID
   */
  toggleAgentHire(agentId) {
    const project = window.currentProject;
    if (!project) return;

    const hiredAgents = project.assignedAgents || [];
    const index = hiredAgents.indexOf(agentId);

    if (index > -1) {
      // 已雇佣的情况不应该走到这里，因为按钮已经disabled
      return;
    }

    // 执行雇佣
    hiredAgents.push(agentId);
    project.assignedAgents = hiredAgents;

    // 保存到 localStorage
    if (typeof window.saveTeamSpace === 'function') {
      window.saveTeamSpace();
    }

    // 重新渲染
    if (typeof window.renderAvailableAgents === 'function') {
      window.renderAvailableAgents();
    }
    if (typeof window.renderProjectHiredAgents === 'function') {
      window.renderProjectHiredAgents();
    }
    if (typeof window.renderProjectMembers === 'function') {
      window.renderProjectMembers(project);
    }
    if (window.projectManager?.renderProjectList) {
      window.projectManager.renderProjectList('projectListContainer');
    }

    // 刷新主内容区的项目详情页面
    if (typeof window.renderProjectDetail === 'function') {
      window.renderProjectDetail(project);
    }

    const memberCountEl = document.getElementById('projectMemberCount');
    if (memberCountEl) {
      memberCountEl.textContent = (project.members?.length || 0) + (project.assignedAgents?.length || 0);
    }
  }
}

if (typeof window !== 'undefined') {
  window.agentCollaboration = new AgentCollaboration();

  // 全局函数桥接（保持向后兼容）
  window.initAgentSystem = () => window.agentCollaboration?.initAgentSystem();
  window.loadMyAgents = () => window.agentCollaboration?.loadMyAgents();
  window.updateAgentTeamSummary = () => window.agentCollaboration?.updateAgentTeamSummary();
  window.showAgentManagement = () => window.agentCollaboration?.showAgentManagement();
  window.closeAgentManagement = () => window.agentCollaboration?.closeAgentManagement();
  window.switchAgentTab = (tab) => window.agentCollaboration?.switchAgentTab(tab);
  window.getAgentUserId = () => window.agentCollaboration?.getAgentUserId();
}
