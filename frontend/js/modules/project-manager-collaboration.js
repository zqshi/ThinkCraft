/**
 * ProjectManager 协作建议与工作流编排模块
 * 说明：从 project-manager.js 拆分，保持原业务行为。
 */

const collaborationLogger = window.createLogger
  ? window.createLogger('ProjectManagerCollaboration')
  : console;

window.projectManagerCollaboration = {
  async applyWorkflowCategory(pm, projectId, workflowCategory) {
    const project = await pm.getProject(projectId);
    if (!project || !project.workflow) {
      return;
    }
    if (project.collaborationSuggestion?.stages?.length) {
      return;
    }
    const stages = await pm.buildWorkflowStages(workflowCategory);
    if (!stages || stages.length === 0) {
      return;
    }
    project.workflow.stages = stages;
    project.workflow.currentStage = stages[0]?.id || null;
    await pm.storageManager.saveProject(project);
    await pm.updateProject(projectId, { workflow: project.workflow }, { localOnly: true });
  },

  async customizeWorkflow(pm, projectId, stages) {
    if (!projectId || !Array.isArray(stages) || stages.length === 0) {
      return null;
    }
    const response = await pm.fetchWithAuth(`${pm.apiUrl}/api/projects/${projectId}/workflow`, {
      method: 'PUT',
      headers: pm.buildAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ stages })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || '更新工作流失败');
    }
    const result = await response.json();
    return result.data?.workflow || null;
  },

  async applyCollaborationSuggestion(pm, projectId, suggestion) {
    const project = await pm.getProject(projectId);
    if (!project || !suggestion) {
      return;
    }

    collaborationLogger.info('[应用协作建议] 开始应用', { projectId, suggestion });

    const recommendedAgents = suggestion.recommendedAgents || [];
    const suggestedStages = suggestion.stages || [];
    collaborationLogger.info('[应用协作建议] 推荐的Agent类型:', recommendedAgents);
    collaborationLogger.info('[应用协作建议] AI建议的阶段:', suggestedStages);

    let adjustedStages = [];

    if (suggestedStages.length > 0) {
      adjustedStages = suggestedStages.map((stage, index) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description || '',
        agents: stage.agents || [],
        dependencies: stage.dependencies || [],
        outputs: stage.outputs || [],
        outputsDetailed: stage.outputsDetailed || [],
        status: 'pending',
        order: index + 1,
        priority: 'high',
        recommended: true
      }));
      collaborationLogger.info('[应用协作建议] 使用AI生成的阶段，数量:', adjustedStages.length);
    } else {
      collaborationLogger.info('[应用协作建议] AI未返回阶段，使用降级方案');
      const stages = project.workflow?.stages || [];
      adjustedStages = stages
        .map(stage => {
          const stageAgents = stage.agents || [];
          const recommendedForStage = stageAgents.filter(a => recommendedAgents.includes(a));
          return recommendedForStage.length > 0
            ? {
              ...stage,
              agents: recommendedForStage,
              priority: 'high',
              recommended: true
            }
            : null;
        })
        .filter(Boolean)
        .map((stage, index) => ({ ...stage, order: index + 1 }));
    }

    const stageIds = new Set(adjustedStages.map(s => s.id));
    adjustedStages.forEach(stage => {
      if (stage.dependencies && stage.dependencies.length > 0) {
        stage.dependencies = stage.dependencies.filter(depId => stageIds.has(depId));
      }
    });

    collaborationLogger.info('[应用协作建议] 最终阶段数量:', adjustedStages.length);
    collaborationLogger.info(
      '[应用协作建议] 阶段列表:',
      adjustedStages.map(s => ({ id: s.id, name: s.name, agents: s.agents }))
    );

    const userId = pm.getUserId();
    const response = await pm.fetchWithAuth(`${pm.apiUrl}/api/agents/my/${userId}`);
    if (!response.ok) {
      throw new Error('获取已雇佣Agent失败');
    }
    const result = await response.json();
    const hiredAgents = result.data?.agents || [];
    collaborationLogger.info(
      '[应用协作建议] 已雇佣的Agent (直接从API):',
      hiredAgents.map(a => ({ id: a.id, type: a.type, name: a.name }))
    );

    const currentAssignedAgents = project.assignedAgents || [];
    collaborationLogger.info('[应用协作建议] 当前项目已分配的Agent ID:', currentAssignedAgents);

    const recommendedAgentInstances = [];
    const missingAgentTypes = [];

    for (const agentType of recommendedAgents) {
      const hiredAgent = hiredAgents.find(agent => agent.type === agentType);
      if (hiredAgent) {
        collaborationLogger.info('[应用协作建议] 找到匹配的Agent:', {
          type: agentType,
          id: hiredAgent.id,
          name: hiredAgent.name
        });
        recommendedAgentInstances.push(hiredAgent.id);
      } else {
        collaborationLogger.warn('[应用协作建议] 未找到匹配的Agent:', agentType);
        missingAgentTypes.push(agentType);
      }
    }

    collaborationLogger.info('[应用协作建议] 推荐的Agent实例ID:', recommendedAgentInstances);
    collaborationLogger.info('[应用协作建议] 缺失的Agent类型:', missingAgentTypes);

    const mergedAgents = Array.from(
      new Set([...currentAssignedAgents, ...recommendedAgentInstances])
    );
    collaborationLogger.info('[应用协作建议] 合并后的Agent ID:', mergedAgents);

    let updatedWorkflow = null;
    try {
      updatedWorkflow = await pm.customizeWorkflow(projectId, adjustedStages);
    } catch (error) {
      collaborationLogger.warn('[应用协作建议] 工作流远端更新失败，使用本地覆盖:', error);
    }
    project.workflow = updatedWorkflow || { ...project.workflow, stages: adjustedStages };
    await pm.hydrateProjectStageOutputs(project);

    const updateData = {
      workflow: {
        ...project.workflow
      },
      collaborationSuggestion: suggestion,
      assignedAgents: mergedAgents
    };

    if (missingAgentTypes.length > 0) {
      updateData.missingRecommendedAgents = missingAgentTypes;
    }

    await pm.updateProject(projectId, updateData, { forceRemote: true });

    if (pm.currentProject?.id === projectId) {
      pm.currentProject = await pm.getProject(projectId);
      pm.refreshProjectPanel(pm.currentProject);
    }

    collaborationLogger.info('[应用协作建议] 应用完成，推荐成员已添加到项目');
  },

  sortStagesByDependencies(pm, stages) {
    if (!stages || stages.length === 0) {
      return [];
    }

    const stageMap = new Map();
    stages.forEach(stage => {
      stageMap.set(stage.id, stage);
    });

    const inDegree = new Map();
    stages.forEach(stage => {
      inDegree.set(stage.id, 0);
    });

    stages.forEach(stage => {
      const dependencies = stage.dependencies || [];
      dependencies.forEach(depId => {
        if (inDegree.has(depId)) {
          inDegree.set(stage.id, inDegree.get(stage.id) + 1);
        }
      });
    });

    const result = [];
    const queue = [];

    inDegree.forEach((degree, stageId) => {
      if (degree === 0) {
        queue.push(stageId);
      }
    });

    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentStage = stageMap.get(currentId);
      if (currentStage) {
        result.push(currentStage);
      }

      stages.forEach(stage => {
        const dependencies = stage.dependencies || [];
        if (dependencies.includes(currentId)) {
          const newDegree = inDegree.get(stage.id) - 1;
          inDegree.set(stage.id, newDegree);
          if (newDegree === 0) {
            queue.push(stage.id);
          }
        }
      });
    }

    if (result.length < stages.length) {
      stages.forEach(stage => {
        if (!result.find(s => s.id === stage.id)) {
          result.push(stage);
        }
      });
    }

    return result;
  },

  async buildWorkflowStages(pm, category) {
    const catalog = await pm.getWorkflowCatalog(category);

    if (!catalog || !catalog.stages) {
      return null;
    }

    return catalog.stages.map((stage, index) => ({
      id: stage.id,
      name: stage.name,
      description: stage.description || '',
      status: 'pending',
      order: index + 1,
      artifacts: [],
      agents: catalog.agents?.[stage.id] || [],
      agentRoles: catalog.agentRoles?.[stage.id] || [],
      dependencies: stage.dependencies || [],
      outputs: stage.outputs || [],
      outputsDetailed: stage.outputsDetailed || []
    }));
  },

  normalizeSuggestedStages(pm, suggestedStages = []) {
    const list = Array.isArray(suggestedStages) ? suggestedStages : [];
    return list.map((stage, index) => ({
      id: stage.id || `stage-${index + 1}`,
      name: stage.name || `阶段${index + 1}`,
      description: stage.description || '',
      status: stage.status || 'pending',
      order: Number.isFinite(stage.order) ? stage.order : index + 1,
      artifacts: Array.isArray(stage.artifacts) ? stage.artifacts : [],
      agents: Array.isArray(stage.agents) ? stage.agents : [],
      agentRoles: Array.isArray(stage.agentRoles) ? stage.agentRoles : [],
      dependencies: Array.isArray(stage.dependencies) ? stage.dependencies : [],
      outputs: Array.isArray(stage.outputs) ? stage.outputs : [],
      outputsDetailed: Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : [],
      recommended: true
    }));
  }
};
