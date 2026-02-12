/**
 * ProjectManager 数据访问模块
 */

const projectDataLogger = window.createLogger ? window.createLogger('ProjectManagerData') : console;

window.projectManagerData = {
  async createProject(pm, ideaId, name) {
    projectDataLogger.info('[createProject] 输入参数:', {
      ideaId,
      name,
      ideaIdType: typeof ideaId
    });

    const normalizedIdeaId = pm.normalizeIdeaId(ideaId);
    projectDataLogger.info('[createProject] 规范化后:', {
      normalizedIdeaId,
      type: typeof normalizedIdeaId
    });

    if (window.requireAuth) {
      const ok = await window.requireAuth({ redirect: true, prompt: true });
      if (!ok) {
        throw new Error('未提供访问令牌');
      }
    } else if (!pm.getAuthToken()) {
      const message = '请先登录后再创建项目';
      if (window.modalManager) {
        window.modalManager.alert(message, 'warning');
      } else {
        alert(message);
      }
      window.location.href = 'login.html';
      throw new Error('未提供访问令牌');
    }

    if (!normalizedIdeaId && normalizedIdeaId !== 0) {
      throw new Error('创意ID无效');
    }

    const ideaIdString = String(normalizedIdeaId);
    projectDataLogger.info('[createProject] 发送给后端:', { ideaIdString });

    try {
      const byIdeaResp = await pm.fetchWithAuth(
        `${pm.apiUrl}/api/projects/by-idea/${encodeURIComponent(ideaIdString)}`
      );
      projectDataLogger.info('[createProject] by-idea 状态:', { status: byIdeaResp.status });
      if (byIdeaResp.ok) {
        const byIdeaResult = await byIdeaResp.json();
        const existingProject = byIdeaResult?.data?.project || byIdeaResult?.data || null;
        if (existingProject?.id) {
          existingProject.ideaId = String(existingProject.ideaId).trim();
          await pm.storageManager.saveProject(existingProject);
          if (!pm.projects.find(p => p.id === existingProject.id)) {
            pm.projects.unshift(existingProject);
          }
          if (window.addProject) {
            window.addProject(existingProject);
          }
          return existingProject;
        }
      }
    } catch (error) {
      // ignore by-idea lookup failures, continue to create
    }

    const response = await pm.fetchWithAuth(`${pm.apiUrl}/api/projects`, {
      method: 'POST',
      headers: pm.buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ideaId: ideaIdString, name })
    });
    projectDataLogger.info('[createProject] POST /api/projects 状态:', { status: response.status });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      projectDataLogger.warn('[createProject] 创建失败响应:', {
        status: response.status,
        error: error?.error || null
      });
      if (error?.error === '该创意已创建项目') {
        try {
          const byIdeaResp = await pm.fetchWithAuth(
            `${pm.apiUrl}/api/projects/by-idea/${encodeURIComponent(ideaIdString)}`
          );
          if (byIdeaResp.ok) {
            const byIdeaResult = await byIdeaResp.json();
            const existingProject = byIdeaResult?.data?.project || byIdeaResult?.data || null;
            if (existingProject?.id) {
              existingProject.ideaId = String(existingProject.ideaId).trim();
              await pm.storageManager.saveProject(existingProject);
              if (!pm.projects.find(p => p.id === existingProject.id)) {
                pm.projects.unshift(existingProject);
              }
              if (window.addProject) {
                window.addProject(existingProject);
              }
              return existingProject;
            }
          }
        } catch (fetchError) {
          // ignore fallback lookup failures and throw create error below
        }
      }
      throw new Error(error.error || '创建项目失败');
    }

    const result = await response.json();
    const project = result.data.project;

    project.ideaId = String(project.ideaId).trim();

    await pm.storageManager.saveProject(project);
    pm.projects.unshift(project);

    if (window.addProject) {
      window.addProject(project);
    }

    return project;
  },

  async getProject(pm, projectId, options = {}) {
    const requireRemote = Boolean(options.requireRemote);
    const localProject = pm.storageManager?.getProject
      ? await pm.storageManager.getProject(projectId).catch(() => null)
      : null;
    if (!requireRemote) {
      const project = localProject;
      if (project) {
        const patched = await pm.ensureProjectWorkflow(project);
        if (patched !== project) {
          await pm.storageManager.saveProject(patched);
        }
        return patched;
      }
    }

    const response = await pm.fetchWithAuth(`${pm.apiUrl}/api/projects/${projectId}`);
    if (!response.ok) {
      throw new Error('项目不存在');
    }

    const result = await response.json();
    const remoteProject = result.data.project;
    const mergedRemote = pm.mergeExecutionState(remoteProject, localProject);
    const patchedRemote = await pm.ensureProjectWorkflow(mergedRemote);
    if (patchedRemote !== remoteProject) {
      await pm.storageManager.saveProject(patchedRemote);
    }
    return patchedRemote;
  },

  async getProjectByIdeaId(pm, ideaId) {
    return await pm.storageManager.getProjectByIdeaId(ideaId);
  },

  async updateProject(pm, projectId, updates, options = {}) {
    let normalizedUpdates = updates;
    try {
      if (
        !options.forceRemote &&
        options.allowFallback &&
        !options.localOnly &&
        pm.storageManager?.getProject
      ) {
        const localProject = await pm.storageManager.getProject(projectId).catch(() => null);
        if (localProject) {
          return await pm.updateProject(projectId, updates, { ...options, localOnly: true });
        }
      }

      const normalizedIdeaUpdate =
        updates && Object.prototype.hasOwnProperty.call(updates, 'ideaId')
          ? { ...updates, ideaId: String(pm.normalizeIdeaId(updates.ideaId)).trim() }
          : updates;

      normalizedUpdates =
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
        const existing = await pm.storageManager.getProject(projectId);
        const project = {
          ...(existing || { id: projectId }),
          ...(normalizedUpdates || {}),
          updatedAt: Date.now()
        };
        await pm.storageManager.saveProject(project);
        const index = pm.projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
          pm.projects[index] = project;
        }
        if (window.updateProject) {
          window.updateProject(projectId, normalizedUpdates);
        }
        pm.refreshProjectPanel(project);
        return project;
      }

      const response = await pm.fetchWithAuth(`${pm.apiUrl}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: pm.buildAuthHeaders({ 'Content-Type': 'application/json' }),
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

      await pm.storageManager.saveProject(project);

      const index = pm.projects.findIndex(p => p.id === projectId);
      if (index !== -1) {
        pm.projects[index] = project;
      }

      if (window.updateProject) {
        window.updateProject(projectId, normalizedUpdates);
      }

      pm.refreshProjectPanel(project);

      return project;
    } catch (error) {
      if (options.allowFallback) {
        const existing = await pm.storageManager.getProject(projectId);
        if (existing) {
          const project = { ...existing, ...(normalizedUpdates || {}), updatedAt: Date.now() };
          await pm.storageManager.saveProject(project);
          const index = pm.projects.findIndex(p => p.id === projectId);
          if (index !== -1) {
            pm.projects[index] = project;
          }
          if (window.updateProject) {
            window.updateProject(projectId, normalizedUpdates);
          }
          pm.refreshProjectPanel(project);
          return project;
        }
      }
      const existing = await pm.storageManager.getProject(projectId);
      if (!existing) {
        throw error;
      }
      const project = { ...existing, ...(normalizedUpdates || {}), updatedAt: Date.now() };
      await pm.storageManager.saveProject(project);

      const index = pm.projects.findIndex(p => p.id === projectId);
      if (index !== -1) {
        pm.projects[index] = project;
      }
      if (window.updateProject) {
        window.updateProject(projectId, normalizedUpdates);
      }
      pm.refreshProjectPanel(project);
      return project;
    }
  }
};
