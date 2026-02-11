/**
 * ProjectManager 成员管理与雇佣建议模块
 * 说明：仅搬运原有逻辑，不改变业务行为。
 */

const membersLogger = window.createLogger ? window.createLogger('ProjectManagerMembers') : console;

window.projectManagerMembers = {
  async showMemberModal(pm, projectId) {
    if (!window.modalManager) {
      alert('成员管理功能暂不可用');
      return;
    }

    const project = await pm.getProject(projectId);
    if (!project) {
      return;
    }

    pm.memberModalProjectId = projectId;

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
    pm.switchMemberModalTab('market');
  },

  switchMemberModalTab(pm, tab) {
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
      pm.renderMemberMarket();
    } else {
      tabs[1]?.classList.add('active');
      if (marketTab) {
        marketTab.classList.remove('active');
      }
      if (hiredTab) {
        hiredTab.classList.add('active');
      }
      pm.renderMemberHired();
    }
  },

  async renderMemberMarket(pm) {
    const container = document.getElementById('memberMarketList');
    if (!container) {
      return;
    }

    const project = await pm.getProject(pm.memberModalProjectId);
    if (!project) {
      return;
    }

    const catalog = await pm
      .getWorkflowCatalog(project.workflowCategory || 'product-development')
      .catch(() => null);
    if (catalog) {
      if (!pm.workflowCatalogCache) {
        pm.workflowCatalogCache = {};
      }
      pm.workflowCatalogCache[project.workflowCategory || 'product-development'] = catalog;
    }

    const stageIdFallback =
      pm.currentStageId || project.workflow?.currentStage || project.workflow?.stages?.[0]?.id;
    let recommended = catalog
      ? pm.getRecommendedAgentsForStageFromCatalog(catalog, stageIdFallback)
      : [];
    if (recommended.length === 0) {
      recommended = pm.getRecommendedAgentsFromProjectWorkflow(project, stageIdFallback);
    }

    let agentMarket = await pm.getAgentMarketList(
      project.workflowCategory || 'product-development'
    );
    const hiredAgents = await pm.getUserHiredAgents();
    const hiredIds = project.assignedAgents || [];
    const assignedAgents = hiredAgents.filter(agent => hiredIds.includes(agent.id));

    const missingRecommended = recommended.filter(
      id => !agentMarket.some(agent => agent.id === id)
    );
    if (missingRecommended.length > 0) {
      const fallbackAgents = missingRecommended
        .map(id => pm.buildFallbackAgentFromCatalog(catalog, id))
        .filter(Boolean);
      if (fallbackAgents.length > 0) {
        agentMarket = [...fallbackAgents, ...agentMarket];
      }
    }

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
  },

  buildFallbackAgentFromCatalog(pm, catalog, agentId) {
    if (!catalog || !agentId) {
      if (!agentId) {
        return null;
      }
      return {
        id: agentId,
        name: agentId,
        emoji: agentId === 'strategy-design' ? '🎯' : '🤖',
        desc: '推荐岗位',
        skills: [],
        level: 'custom',
        role: agentId
      };
    }
    const roleEntries = Object.values(catalog.agentRoles || {}).flat();
    const match = roleEntries.find(entry => entry.id === agentId);
    if (!match) {
      return {
        id: agentId,
        name: agentId,
        emoji: '🤖',
        desc: '推荐岗位',
        skills: [],
        level: 'custom',
        role: agentId
      };
    }
    return {
      id: agentId,
      name: match.role || agentId,
      emoji: agentId === 'strategy-design' ? '🎯' : '🤖',
      desc: Array.isArray(match.tasks) ? match.tasks.join('；') : '推荐岗位',
      skills: Array.isArray(match.tasks) ? match.tasks.slice(0, 4) : [],
      level: 'custom',
      role: match.role || agentId
    };
  },

  getRecommendedAgentsFromProjectWorkflow(pm, project, stageId) {
    const stages = project?.workflow?.stages || [];
    if (!stageId || stages.length === 0) {
      return [];
    }
    const mapAgents = stage =>
      Array.isArray(stage?.agents) ? stage.agents : (stage?.agentRoles || []).map(r => r.id);
    if (stageId === 'strategy-requirement') {
      const merged = [];
      ['strategy', 'requirement'].forEach(id => {
        const stage = stages.find(s => s.id === id);
        merged.push(...mapAgents(stage));
      });
      return Array.from(new Set(merged.filter(Boolean)));
    }
    const stage = stages.find(s => s.id === stageId);
    return Array.from(new Set(mapAgents(stage).filter(Boolean)));
  },

  async renderMemberHired(pm) {
    const container = document.getElementById('memberHiredList');
    if (!container) {
      return;
    }

    const project = await pm.getProject(pm.memberModalProjectId);
    if (!project) {
      return;
    }

    const hiredAgents = await pm.getUserHiredAgents();
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
  },

  async hireAgentToProject(pm, projectId, agentId) {
    const project = await pm.getProject(projectId);
    if (!project) {
      return;
    }

    const userId = pm.getUserId();
    const response = await pm
      .fetchWithAuth(`${pm.apiUrl}/api/agents/hire`, {
        method: 'POST',
        headers: pm.buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId, agentType: agentId })
      })
      .catch(() => null);
    if (!response || !response.ok) {
      window.modalManager?.alert('雇佣失败，请稍后重试', 'error');
      return;
    }
    const result = await response.json();
    const hiredAgent = result.data;

    if (hiredAgent) {
      const existing = Array.isArray(pm.cachedHiredAgents) ? pm.cachedHiredAgents : [];
      pm.cachedHiredAgents = [...existing, hiredAgent];
      pm.hiredAgentsFetchedAt = Date.now();
      pm.hiredAgentsPromise = null;
    }

    const assignedAgents = Array.from(new Set([...(project.assignedAgents || []), hiredAgent.id]));
    const updatedProject = await pm.updateProject(
      projectId,
      { assignedAgents },
      { allowFallback: true }
    );
    const viewProject = updatedProject || { ...project, assignedAgents };
    pm.renderProjectMembersPanel(viewProject);
    pm.renderMemberMarket();
    pm.renderMemberHired();
  },

  async fireAgentFromProject(pm, projectId, agentId) {
    const project = await pm.getProject(projectId);
    if (!project) {
      return;
    }

    const hiredAgents = await pm.getUserHiredAgents();
    const agent = hiredAgents.find(item => item.id === agentId);

    window.modalManager?.confirm(
      '确认解雇该数字员工？\n\n解雇后该岗位将不再参与当前项目协作。',
      async () => {
        const missingRoles = pm.getMissingRolesAfterRemoval(project, agent);
        if (missingRoles.length > 0) {
          window.modalManager?.confirm(
            `该角色为关键岗位，解雇后缺少：${missingRoles.join('、')}\n\n仍要解雇吗？`,
            () => pm.handleFireAgent(project, agentId),
            null
          );
        } else {
          pm.handleFireAgent(project, agentId);
        }
      }
    );
  },

  async handleFireAgent(pm, project, agentId) {
    const userId = pm.getUserId();
    await pm
      .fetchWithAuth(`${pm.apiUrl}/api/agents/${userId}/${agentId}`, {
        method: 'DELETE',
        headers: pm.buildAuthHeaders()
      })
      .catch(() => null);
    const assignedAgents = (project.assignedAgents || []).filter(id => id !== agentId);
    const updatedProject = await pm.updateProject(
      project.id,
      { assignedAgents },
      { allowFallback: true }
    );
    const viewProject = updatedProject || { ...project, assignedAgents };
    pm.renderProjectMembersPanel(viewProject);
    pm.renderMemberMarket();
    pm.renderMemberHired();
  },

  getMissingRolesAfterRemoval(pm, project, agent) {
    const stageId = pm.currentStageId;
    const recommended = pm.getRecommendedAgentsForStage(project, stageId);
    if (!agent || recommended.length === 0) {
      return [];
    }
    if (!recommended.includes(agent.type)) {
      return [];
    }
    const assignedIds = (project.assignedAgents || []).filter(id => id !== agent.id);
    const hiredAgents = pm.cachedHiredAgents || [];
    const remainingSameType = hiredAgents.some(
      item => assignedIds.includes(item.id) && item.type === agent.type
    );
    return remainingSameType ? [] : [agent.name];
  },

  async getAgentMarketList(pm, workflowCategory) {
    const category = workflowCategory || 'product-development';
    if (pm.agentMarket?.length && pm.agentMarketCategory === category) {
      return pm.agentMarket;
    }
    try {
      const response = await pm.fetchWithAuth(
        `${pm.apiUrl}/api/agents/types-by-workflow?workflowCategory=${encodeURIComponent(category)}`
      );
      let result = null;
      if (response.ok) {
        result = await response.json();
      } else {
        const fallback = await pm.fetchWithAuth(`${pm.apiUrl}/api/agents/types`);
        if (!fallback.ok) {
          return [];
        }
        result = await fallback.json();
      }
      const types = result?.data?.types || [];
      pm.agentMarket = types.map(agent => ({
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
      pm.agentMarketCategory = category;
      return pm.agentMarket;
    } catch (error) {
      return [];
    }
  },

  async getUserHiredAgents(pm) {
    const now = Date.now();
    if (pm.cachedHiredAgents?.length && now - pm.hiredAgentsFetchedAt < 5000) {
      return pm.cachedHiredAgents;
    }
    if (pm.hiredAgentsPromise) {
      return pm.hiredAgentsPromise;
    }

    pm.hiredAgentsPromise = (async () => {
      try {
        const userId = pm.getUserId();
        const response = await pm.fetchWithAuth(`${pm.apiUrl}/api/agents/my/${userId}`);
        if (!response.ok) {
          return pm.cachedHiredAgents || [];
        }
        const result = await response.json();
        const agents = result.data?.agents || [];
        pm.cachedHiredAgents = agents;
        pm.hiredAgentsFetchedAt = Date.now();
        return agents;
      } catch (error) {
        return pm.cachedHiredAgents || [];
      } finally {
        pm.hiredAgentsPromise = null;
      }
    })();

    return pm.hiredAgentsPromise;
  },

  getRecommendedAgentsForStage(pm, project, stageId) {
    const category = project.workflowCategory || 'product-development';
    const workflow = pm.workflowCatalogCache?.[category];
    if (!workflow || !stageId) {
      return [];
    }
    return pm.getRecommendedAgentsForStageFromCatalog(workflow, stageId);
  },

  getRecommendedAgentsForStageFromCatalog(pm, workflow, stageId) {
    if (!workflow || !stageId) {
      return [];
    }
    if (stageId === 'strategy-requirement') {
      const merged = [
        ...(workflow.agents?.strategy || []),
        ...(workflow.agents?.requirement || [])
      ];
      return Array.from(new Set(merged));
    }
    return workflow.agents?.[stageId] || [];
  }
};

membersLogger.debug?.('project-manager-members loaded');
