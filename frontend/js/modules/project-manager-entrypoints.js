/**
 * ProjectManager 项目入口与导航模块
 */

window.projectManagerEntrypoints = {
  async openProject(pm, projectId) {
    try {
      const bundle = await pm.resolveProjectBundle(projectId);
      const project = bundle.project;
      pm.currentProjectId = project.id;
      pm.currentProject = project;
      pm.currentProjectBundle = bundle;
      pm.stageDeliverableSelection = pm.stageDeliverableSelectionByProject[project.id] || {};

      if (window.setCurrentProject) {
        window.setCurrentProject(project);
      }

      pm.ensureProjectPanelStyles();
      pm.renderProjectPanel(project);
      pm.updateProjectSelection(project.id);
      pm.startArtifactPolling(project.id);
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

    const bundle = await pm.resolveProjectBundle(projectId).catch(() => null);
    const project = bundle?.project || null;
    if (!project) {
      return;
    }

    const hiredAgents = Array.isArray(pm.cachedHiredAgents) ? pm.cachedHiredAgents : [];
    pm.getUserHiredAgents?.().catch(() => []);
    const assignedIds = project.assignedAgents || [];
    const agents = hiredAgents.filter(agent => assignedIds.includes(agent.id));

    const chat = bundle?.ideaChat || null;

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

  async openProjectKnowledgePanel(pm, projectId = null) {
    const targetProjectId = projectId || pm.currentProjectId || pm.currentProject?.id;
    if (!targetProjectId) {
      window.modalManager?.alert('请先选择项目', 'info');
      return;
    }

    const bundle = await pm.resolveProjectBundle(targetProjectId).catch(() => null);
    if (bundle?.project) {
      pm.currentProjectId = bundle.project.id;
      pm.currentProject = bundle.project;
      pm.currentProjectBundle = bundle;
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
