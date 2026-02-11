/**
 * ProjectManager 初始化与工作流目录模块
 */

const setupLogger = window.createLogger ? window.createLogger('ProjectManagerSetup') : console;

window.projectManagerSetup = {
  async hydrateProjectStageOutputs(pm, project) {
    if (!project?.workflow?.stages?.length) {
      return project;
    }
    const category = project.workflowCategory || 'product-development';
    let catalog = null;
    try {
      catalog = await pm.getWorkflowCatalog(category);
    } catch (error) {
      return project;
    }
    if (!catalog?.stages?.length) {
      return project;
    }

    const catalogMap = new Map(catalog.stages.map(stage => [stage.id, stage]));
    let mutated = false;
    const patchedStages = project.workflow.stages.map(stage => {
      const normalizedId = pm.normalizeStageIdForWorkflow(stage.id);
      let catalogStage = catalogMap.get(stage.id) || catalogMap.get(normalizedId);
      if (!catalogStage) {
        const inferredId = pm.resolveCatalogStageIdByAgents(stage.agents);
        if (inferredId) {
          catalogStage = catalogMap.get(inferredId);
        }
      }
      if (!catalogStage) {
        return stage;
      }

      const currentOutputs = Array.isArray(stage.outputs) ? stage.outputs : [];
      const catalogOutputs = Array.isArray(catalogStage.outputs) ? catalogStage.outputs : [];
      const outputs =
        catalogOutputs.length > 0
          ? Array.from(new Set([...currentOutputs, ...catalogOutputs].filter(Boolean)))
          : currentOutputs;
      const currentDetailed = Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : [];
      const catalogDetailed = Array.isArray(catalogStage.outputsDetailed)
        ? catalogStage.outputsDetailed
        : [];
      const mergedMap = new Map();
      currentDetailed.forEach(item => {
        const key = item?.id || item?.type || item?.name;
        if (key) {
          mergedMap.set(key, item);
        }
      });
      catalogDetailed.forEach(item => {
        const key = item?.id || item?.type || item?.name;
        if (!key) {
          return;
        }
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item);
          return;
        }
        const existing = mergedMap.get(key);
        const existingTemplates = Array.isArray(existing?.promptTemplates)
          ? existing.promptTemplates
          : [];
        const catalogTemplates = Array.isArray(item?.promptTemplates) ? item.promptTemplates : [];
        if (existingTemplates.length === 0 && catalogTemplates.length > 0) {
          mergedMap.set(key, { ...existing, ...item });
        }
      });
      const outputsDetailed = Array.from(mergedMap.values());

      const outputsChanged =
        currentOutputs.length !== outputs.length ||
        currentOutputs.some((item, index) => item !== outputs[index]);
      const outputsDetailedChanged =
        currentDetailed.length !== outputsDetailed.length ||
        currentDetailed.some((item, index) => item !== outputsDetailed[index]);

      if (outputsChanged || outputsDetailedChanged) {
        mutated = true;
        return { ...stage, outputs, outputsDetailed };
      }
      return stage;
    });

    if (mutated) {
      project.workflow.stages = patchedStages;
      await pm.storageManager.saveProject(project);
      await pm.updateProject(project.id, { workflow: project.workflow }, { localOnly: true });
    }

    return project;
  },

  async init(pm) {
    try {
      await pm.loadProjects();
      const container = document.getElementById('projectListContainer');
      if (container) {
        pm.renderProjectList('projectListContainer');
      }
    } catch (error) {
      // ignore init failure and keep UI responsive
    }
  },

  async loadProjects(pm, options = {}) {
    const { force = false } = options;

    if (!pm.storageManager && window.storageManager) {
      pm.storageManager = window.storageManager;
    }

    if (!pm.storageManager) {
      return pm.projects;
    }

    if (!force && pm.projectsLoaded) {
      return pm.projects;
    }

    if (pm.projectsLoadPromise) {
      return pm.projectsLoadPromise;
    }

    pm.projectsLoadPromise = (async () => {
      try {
        const allProjects = await pm.storageManager.getAllProjects();

        pm.projects = allProjects.filter(project => project.status !== 'deleted');
        pm.projectsLoaded = true;

        if (window.setProjects) {
          window.setProjects(pm.projects);
        }

        return pm.projects;
      } catch (error) {
        return pm.projects;
      } finally {
        pm.projectsLoadPromise = null;
      }
    })();

    return pm.projectsLoadPromise;
  },

  buildKnowledgeFromArtifacts(pm, projectId, artifacts) {
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
  },

  getValidAgentIds(_pm) {
    const agentMarket = typeof window.getAgentMarket === 'function' ? window.getAgentMarket() : [];
    const ids = agentMarket.map(agent => agent.id);
    if (ids.length > 0) {
      return new Set(ids);
    }
    return new Set(['agent_001', 'agent_002', 'agent_003', 'agent_004', 'agent_005', 'agent_006']);
  },

  getUserId(_pm) {
    try {
      const raw = sessionStorage.getItem('thinkcraft_user');
      if (raw) {
        const user = JSON.parse(raw);
        const id = user?.userId || user?.id || user?.phone;
        if (id) {
          return String(id);
        }
      }
    } catch (error) {
      // ignore malformed session payload
    }

    const cached = localStorage.getItem('thinkcraft_user_id');
    if (cached) {
      return cached;
    }
    const fallback = `guest_${Date.now()}`;
    localStorage.setItem('thinkcraft_user_id', fallback);
    return fallback;
  },

  async getWorkflowCatalog(pm, category = 'product-development') {
    if (pm.workflowCatalogCache && pm.workflowCatalogCache[category]) {
      return pm.workflowCatalogCache[category];
    }

    try {
      const response = await pm.fetchWithAuth(
        `${pm.apiUrl}/api/projects/workflow-config/${category}`
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
            outputs: s.outputs,
            outputsDetailed: s.outputsDetailed
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

        if (!pm.workflowCatalogCache) {
          pm.workflowCatalogCache = {};
        }
        pm.workflowCatalogCache[category] = catalog;

        return catalog;
      }
      throw new Error(result.message || '加载工作流配置失败');
    } catch (error) {
      setupLogger.error('加载工作流配置失败:', error);
      throw error;
    }
  },

  getWorkflowCategoryLabel(_pm) {
    return '统一产品开发';
  }
};
