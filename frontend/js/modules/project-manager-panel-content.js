/**
 * ProjectManager 项目面板内容模块（成员/创意/知识库/报告索引）
 */

const panelLogger = window.createLogger
  ? window.createLogger('ProjectManagerPanelContent')
  : console;

window.projectManagerPanelContent = {
  resolveMemberRoleProfile(pm, agent) {
    const roleCandidates = [
      agent?.type,
      agent?.agentType,
      agent?.id,
      agent?.role
    ]
      .map(value => (value === undefined || value === null ? '' : String(value).trim()))
      .filter(Boolean);

    for (const roleKey of roleCandidates) {
      const profile = pm.getAgentDefinition(roleKey);
      if (profile) {
        return profile;
      }
    }

    const normalizedName = String(agent?.name || '')
      .trim()
      .toLowerCase();
    const aliases = {
      '产品经理': 'product-manager',
      'ui/ux设计师': 'ui-ux-designer',
      '前端开发': 'frontend-developer',
      '后端开发': 'backend-developer',
      '测试工程师': 'qa-engineer',
      '运维工程师': 'devops',
      '市场营销': 'marketing',
      '运营专员': 'operations',
      '战略设计师': 'strategy-design',
      '技术负责人': 'tech-lead'
    };
    const aliasKey = Object.entries(aliases).find(([name]) => name.toLowerCase() === normalizedName);
    return aliasKey ? pm.getAgentDefinition(aliasKey[1]) : null;
  },

  async renderProjectMembersPanel(pm, project) {
    const container = document.getElementById('projectPanelMembers');
    if (!container) {
      panelLogger.warn('[项目成员面板] 容器不存在');
      return;
    }

    if (!project?.collaborationExecuted) {
      container.classList.add('is-empty');
      container.innerHTML =
        '<div class="project-panel-empty centered">协同模式未确认，暂不展示成员</div>';
      return;
    }

    const assignedIds = project.assignedAgents || [];
    panelLogger.info('[项目成员面板] 分配的成员ID:', assignedIds);

    if (assignedIds.length === 0) {
      container.classList.add('is-empty');
      container.innerHTML = '<div class="project-panel-empty centered">暂未添加成员</div>';
      return;
    }

    const hiredAgents = await pm.getUserHiredAgents();
    panelLogger.info('[项目成员面板] 已雇佣的成员:', hiredAgents.length);

    let members = hiredAgents.filter(agent => assignedIds.includes(agent.id));
    panelLogger.info('[项目成员面板] 从已雇佣列表匹配的成员:', members.length);

    if (members.length === 0) {
      panelLogger.info('[项目成员面板] 使用成员类型生成虚拟成员卡片');
      members = assignedIds.map(agentType => {
        const agentDef = pm.getAgentDefinition(agentType);
        return {
          id: agentType,
          type: agentType,
          name: agentDef?.name || agentType,
          nickname: agentDef?.name || agentType,
          emoji: agentDef?.icon || agentDef?.emoji || '👤',
          desc: agentDef?.persona || `负责${agentDef?.name || agentType}相关工作`,
          skills: []
        };
      });
    }

    container.classList.remove('is-empty');
    container.innerHTML = members
      .map(agent => {
        const roleProfile = this.resolveMemberRoleProfile(pm, agent);
        const roleTag = roleProfile?.roleTag || agent.role || '协作成员';
        const personaText = roleProfile?.persona || agent.desc || '擅长当前项目的核心任务执行';
        const roleName = roleProfile?.name || agent.name;
        const skillTags = (agent.skills || []).slice(0, 3);
        const mergedTags = [roleTag, ...skillTags].filter(Boolean);

        return `
            <div class="agent-card hired">
                <div class="agent-card-header">
                    <div class="agent-card-avatar">${typeof window.getAgentIconSvg === 'function' ? window.getAgentIconSvg(agent.emoji || agent.name, 32, 'agent-card-icon') : agent.emoji}</div>
                    <div class="agent-card-info">
                        <div class="agent-card-name">${pm.escapeHtml(agent.nickname || roleName || '未命名成员')}</div>
                        <div class="agent-card-role">${pm.escapeHtml(roleName || '项目成员')}</div>
                    </div>
                </div>
                <div class="agent-card-desc">${pm.escapeHtml(personaText)}</div>
                <div class="agent-card-skills">
                    ${mergedTags.map(tag => `<span class="skill-tag">${pm.escapeHtml(tag)}</span>`).join('')}
                </div>
            </div>
        `;
      })
      .join('');
  },

  async renderProjectIdeasPanel(pm, project) {
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
      const ideaId = pm.normalizeIdeaId(rawIdeaId);
      let chat = await pm.storageManager.getChat(ideaId);
      if (!chat && ideaId !== rawIdeaId) {
        chat = await pm.storageManager.getChat(rawIdeaId);
      }
      if (!chat) {
        const chats = await pm.storageManager.getAllChats().catch(() => []);
        const rawKey = pm.normalizeIdeaIdForCompare(rawIdeaId);
        chat = chats.find(item => pm.normalizeIdeaIdForCompare(item.id) === rawKey);
      }
      if (!chat) {
        container.innerHTML = '<div class="project-panel-empty">创意信息缺失</div>';
        return;
      }

      const reports = await pm.getReportsByChatId(chat.id ?? ideaId ?? rawIdeaId);
      const analysis = reports.analysis;
      const business = reports.business;
      const proposal = reports.proposal;

      const analysisSummary = analysis?.data?.coreDefinition || analysis?.data?.problem || '';

      container.innerHTML = `
            <div class="project-idea-card">
                <div class="project-idea-title">💡 ${pm.escapeHtml(chat.title || '未命名创意')}</div>
                <div class="project-idea-meta">${pm.formatTimeAgo(chat.updatedAt || Date.now())}</div>
                <div class="project-idea-summary">${pm.escapeHtml(analysisSummary || '暂无分析报告摘要')}</div>
                <div class="project-idea-actions">
                    <button class="btn-secondary" onclick="projectManager.openIdeaChat('${chat.id}')">查看对话</button>
                    <button class="btn-secondary" onclick="projectManager.viewIdeaReport('${chat.id}', 'analysis')" title="${analysis ? '查看分析报告' : '暂无分析报告，先在对话中生成'}">分析报告</button>
                    <button class="btn-secondary" onclick="projectManager.viewIdeaReport('${chat.id}', 'business')" title="${business ? '查看商业计划书' : '暂无商业计划书，先在对话中生成'}">商业计划书</button>
                    <button class="btn-secondary" onclick="projectManager.viewIdeaReport('${chat.id}', 'proposal')" title="${proposal ? '查看立项材料' : '暂无立项材料，先在对话中生成'}">立项材料</button>
                </div>
            </div>
        `;
    } catch (error) {
      container.innerHTML = '<div class="project-panel-empty">创意加载失败</div>';
    }
  },

  async renderProjectKnowledgePanel(pm, project) {
    const container = document.getElementById('projectPanelKnowledge');
    if (!container || !pm.storageManager) {
      return;
    }

    try {
      const items = await pm.storageManager.getKnowledgeByProject(project.id);
      if (!items || items.length === 0) {
        container.innerHTML = '<div class="project-panel-empty">暂无知识沉淀</div>';
        return;
      }

      const previewItems = items.slice(0, 4).map(
        item => `
                <div class="project-panel-item">
                    <div class="project-panel-item-main">
                        <div class="project-panel-item-title">${pm.escapeHtml(item.title || '未命名内容')}</div>
                        <div class="project-panel-item-sub">${pm.formatTimeAgo(item.createdAt || Date.now())}</div>
                    </div>
                </div>
            `
      );

      container.innerHTML = previewItems.join('');
    } catch (error) {
      container.innerHTML = '<div class="project-panel-empty">加载失败</div>';
    }
  },

  async getReportsByChatId(pm, chatId) {
    if (!pm.storageManager) {
      return {};
    }
    try {
      const reports = await pm.storageManager.getAllReports();
      const result = {};
      const rankStatus = status => {
        if (status === 'completed') {
          return 4;
        }
        if (status === 'generating') {
          return 3;
        }
        if (status === 'error') {
          return 2;
        }
        if (status === 'idle') {
          return 1;
        }
        return 0;
      };
      const hasData = report => {
        if (!report?.data) {
          return false;
        }
        if (typeof report.data.document === 'string' && report.data.document.trim().length > 0) {
          return true;
        }
        if (Array.isArray(report.data.chapters) && report.data.chapters.length > 0) {
          return true;
        }
        return false;
      };
      reports
        .filter(
          r => pm.normalizeIdeaIdForCompare(r.chatId) === pm.normalizeIdeaIdForCompare(chatId)
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
};
