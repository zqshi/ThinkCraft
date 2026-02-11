/**
 * ProjectManager 项目入口与导航模块
 */

window.projectManagerEntrypoints = {
  async openProject(pm, projectId) {
    try {
      const backendHealthy = await pm.checkBackendHealth();
      if (!backendHealthy) {
        const msg = pm.lastHealthError === 'unauthorized' ? '请先登录后再试' : '服务异常，稍候再试';
        if (window.modalManager) {
          window.modalManager.alert(msg, 'warning');
        } else {
          alert(msg);
        }
        return;
      }

      const project = await pm.getProject(projectId, { requireRemote: true });
      if (!project) {
        throw new Error('项目不存在');
      }

      await pm.hydrateProjectStageOutputs(project);
      await pm.syncWorkflowArtifactsFromServer(project);

      pm.currentProjectId = projectId;
      pm.currentProject = project;
      pm.stageDeliverableSelection = pm.stageDeliverableSelectionByProject[projectId] || {};

      if (window.setCurrentProject) {
        window.setCurrentProject(project);
      }

      pm.ensureProjectPanelStyles();
      pm.renderProjectPanel(project);
      pm.updateProjectSelection(projectId);
      pm.startArtifactPolling(projectId);
    } catch (error) {
      if (window.modalManager) {
        window.modalManager.alert('打开项目失败: ' + error.message, 'error');
      } else {
        alert('打开项目失败: ' + error.message);
      }
    }
  },

  async openCollaborationMode(pm, projectId) {
    if (!window.agentCollaboration) {
      window.modalManager?.alert('协同编辑模式暂不可用', 'info');
      return;
    }

    const project = await pm.getProject(projectId, { requireRemote: true });
    if (!project) {
      return;
    }

    const hiredAgents = await pm.getUserHiredAgents().catch(() => []);
    const assignedIds = project.assignedAgents || [];
    const agents = hiredAgents.filter(agent => assignedIds.includes(agent.id));

    const rawIdeaId = project.ideaId ?? project.linkedIdeas?.[0];
    let chat = null;
    if (rawIdeaId !== undefined) {
      const normalizedIdeaId = pm.normalizeIdeaId(rawIdeaId);
      chat =
        (await pm.storageManager.getChat(normalizedIdeaId)) ||
        (await pm.storageManager.getChat(rawIdeaId));
      if (!chat) {
        const chats = await pm.storageManager.getAllChats().catch(() => []);
        const rawKey = pm.normalizeIdeaIdForCompare(rawIdeaId);
        chat = chats.find(item => pm.normalizeIdeaIdForCompare(item.id) === rawKey);
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
  },

  openProjectKnowledgePanel(pm, projectId = null) {
    const targetProjectId = projectId || pm.currentProjectId || pm.currentProject?.id;
    if (!targetProjectId) {
      window.modalManager?.alert('请先选择项目', 'info');
      return;
    }

    if (typeof window.showKnowledgeBase === 'function') {
      window.showKnowledgeBase('project', targetProjectId);
      return;
    }

    if (window.knowledgeBase?.showKnowledgeBase) {
      window.knowledgeBase.showKnowledgeBase('project', targetProjectId);
      return;
    }

    window.modalManager?.alert('知识库模块未初始化，请刷新后重试', 'warning');
  }
};
