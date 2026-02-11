/**
 * ProjectManager 项目操作模块
 */

const projectActionsLogger = window.createLogger
  ? window.createLogger('ProjectManagerProjectActions')
  : console;

window.projectManagerProjectActions = {
  async deleteProject(pm, projectId) {
    try {
      const projectIdText = String(projectId || '');
      const isServerId =
        projectIdText.startsWith('project_') || /^[a-f0-9]{24}$/i.test(projectIdText);
      projectActionsLogger.debug('[DEBUG] deleteProject - projectId:', projectId);
      projectActionsLogger.debug('[DEBUG] deleteProject - isServerId:', isServerId);

      if (isServerId) {
        let response;
        try {
          projectActionsLogger.debug('[DEBUG] deleteProject - calling DELETE API');
          response = await pm.fetchWithAuth(`${pm.apiUrl}/api/projects/${projectId}`, {
            method: 'DELETE',
            headers: pm.buildAuthHeaders()
          });
          projectActionsLogger.debug('[DEBUG] deleteProject - response.ok:', response.ok);
          projectActionsLogger.debug('[DEBUG] deleteProject - response.status:', response.status);
        } catch (error) {
          projectActionsLogger.error('[DEBUG] deleteProject - fetch error:', error);
          window.modalManager?.alert(`删除项目失败: ${error.message}`, 'error');
          return;
        }

        if (!response.ok) {
          let message = '删除项目失败';
          try {
            const error = await response.json();
            message = error.error || message;
            projectActionsLogger.debug('[DEBUG] deleteProject - error response:', error);
          } catch (parseError) {
            // ignore parse error and keep default message
          }

          const localExisting = await pm.storageManager.getProject(projectId);
          if (!localExisting) {
            window.modalManager?.alert(`删除项目失败: ${message}`, 'error');
            return;
          }
          projectActionsLogger.debug(
            '[DEBUG] deleteProject - continuing despite API error, local project exists'
          );
        }
      }

      projectActionsLogger.debug('[DEBUG] deleteProject - deleting from local storage');
      await pm.storageManager.deleteProject(projectId);

      pm.projects = pm.projects.map(project =>
        project.id === projectId
          ? { ...project, status: 'deleted', updatedAt: Date.now() }
          : project
      );

      if (window.updateProject) {
        window.updateProject(projectId, { status: 'deleted', updatedAt: Date.now() });
      }

      if (pm.currentProjectId === projectId) {
        pm.closeProjectPanel();
      }

      pm.renderProjectList('projectListContainer');
      projectActionsLogger.debug('[DEBUG] deleteProject - completed');
    } catch (error) {
      projectActionsLogger.error('[DEBUG] deleteProject - error:', error);
      throw error;
    }
  },

  confirmDeleteCurrentProject(pm) {
    if (!pm.currentProjectId) {
      return;
    }
    const projectName = pm.currentProject?.name || '该项目';
    const confirmed = window.confirm(`确定要删除 "${projectName}" 吗？\n\n此操作不可恢复。`);
    if (!confirmed) {
      return;
    }
    pm.deleteProject(pm.currentProjectId);
  },

  editCurrentProjectName(pm) {
    if (!pm.currentProjectId || !pm.currentProject) {
      return;
    }
    const newName = window.prompt('修改项目名称：', pm.currentProject.name || '');
    if (!newName || !newName.trim()) {
      return;
    }
    if (newName.trim() === pm.currentProject.name) {
      return;
    }
    pm.updateProject(pm.currentProjectId, { name: newName.trim() })
      .then(updated => {
        const viewProject = updated || { ...pm.currentProject, name: newName.trim() };
        pm.currentProject = viewProject;
        pm.renderProjectList('projectListContainer');
        pm.refreshProjectPanel(viewProject);
      })
      .catch(() => {});
  },

  openIdeaChat(pm, chatId) {
    if (!chatId) {
      return;
    }
    pm.closeProjectPanel();

    if (typeof window.switchSidebarTab === 'function') {
      window.switchSidebarTab('chats');
    }

    if (typeof window.loadChatFromProject === 'function') {
      window.loadChatFromProject(chatId);
      return;
    }
    if (typeof window.loadChat === 'function') {
      window.loadChat(chatId);
    }
  }
};
