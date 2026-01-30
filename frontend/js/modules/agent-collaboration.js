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
          <div style="font-weight: 600; margin-bottom: 6px;">已雇佣成员</div>
          <div id="collaborationMemberList" class="${collaborationExecuted ? 'readonly-mode' : ''}" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; max-height: 400px; overflow-y: auto;">
            ${agentCards}
          </div>
          <div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
            根据创意深度思考给出雇佣建议，本期暂不支持对雇佣成员组合进行调整。
          </div>
        </div>
        <div style="display: flex; gap: 12px; position: sticky; bottom: 0; background: white; padding-top: 12px; border-top: 1px solid var(--border);">
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
                        <span>${this.escapeHtml(roleName)}</span>
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

      // 刷新项目面板（确保成员卡片显示）
      if (window.projectManager?.currentProject?.id === this.currentContext.projectId) {
        const updatedProject = await window.storageManager?.getProject(this.currentContext.projectId);
        window.projectManager.currentProject = updatedProject;
        await window.projectManager.renderProjectMembersPanel(updatedProject);
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
}

if (typeof window !== 'undefined') {
  window.agentCollaboration = new AgentCollaboration();
}
