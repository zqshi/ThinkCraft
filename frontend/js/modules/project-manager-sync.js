/**
 * ProjectManager 状态同步与轮询模块
 */

window.projectManagerSync = {
  patchWorkflowArtifacts(pm, workflow, templateWorkflow) {
    if (!workflow || !Array.isArray(workflow.stages)) {
      return templateWorkflow;
    }
    if (!templateWorkflow || !Array.isArray(templateWorkflow.stages)) {
      return workflow;
    }

    const templateMap = new Map(templateWorkflow.stages.map(stage => [stage.id, stage]));
    const patchedStages = workflow.stages.map(stage => {
      const templateStage = templateMap.get(stage.id);
      if (!templateStage || !Array.isArray(stage.artifacts)) {
        return stage;
      }
      const patchedArtifacts = stage.artifacts.map(artifact => {
        if (artifact.type) {
          return artifact;
        }
        const templateArtifact = templateStage.artifacts?.find(item => item.id === artifact.id);
        return templateArtifact
          ? { ...artifact, type: templateArtifact.type }
          : { ...artifact, type: 'document' };
      });
      return { ...stage, artifacts: patchedArtifacts };
    });

    return { ...workflow, stages: patchedStages };
  },

  mergeExecutionState(pm, remoteProject, localProject) {
    if (!remoteProject || !localProject) {
      return remoteProject;
    }

    const mergeStages = (remoteStages = [], localStages = []) => {
      if (!Array.isArray(remoteStages) || !Array.isArray(localStages)) {
        return remoteStages;
      }
      const localMap = new Map(localStages.map(stage => [stage.id, stage]));
      return remoteStages.map(stage => {
        const localStage = localMap.get(stage.id);
        if (!localStage) {
          return stage;
        }
        return {
          ...stage,
          status: localStage.status || stage.status,
          startedAt: localStage.startedAt ?? stage.startedAt,
          completedAt: localStage.completedAt ?? stage.completedAt,
          artifacts:
            Array.isArray(localStage.artifacts) && localStage.artifacts.length > 0
              ? localStage.artifacts
              : stage.artifacts
        };
      });
    };

    const merged = { ...remoteProject };

    if (localProject.workflow && remoteProject.workflow) {
      merged.workflow = {
        ...remoteProject.workflow,
        stages: mergeStages(remoteProject.workflow.stages, localProject.workflow.stages),
        currentStage: remoteProject.workflow.currentStage || localProject.workflow.currentStage
      };
    } else if (!remoteProject.workflow && localProject.workflow) {
      merged.workflow = localProject.workflow;
    }

    if (remoteProject.collaborationSuggestion || localProject.collaborationSuggestion) {
      const remoteSuggestion = remoteProject.collaborationSuggestion
        ? { ...remoteProject.collaborationSuggestion }
        : null;
      if (remoteSuggestion?.stages && localProject.collaborationSuggestion?.stages) {
        remoteSuggestion.stages = mergeStages(
          remoteSuggestion.stages,
          localProject.collaborationSuggestion.stages
        );
      } else if (!remoteSuggestion && localProject.collaborationSuggestion) {
        return {
          ...merged,
          collaborationSuggestion: localProject.collaborationSuggestion
        };
      }
      merged.collaborationSuggestion = remoteSuggestion;
    }

    if (localProject.collaborationExecuted && !remoteProject.collaborationExecuted) {
      merged.collaborationExecuted = true;
    }

    return merged;
  },

  async ensureProjectWorkflow(pm, project) {
    if (!project) {
      return project;
    }
    if (project.workflow && Array.isArray(project.workflow.stages)) {
      return project;
    }
    if (!project.collaborationExecuted) {
      return project;
    }
    const suggestedStages = project.collaborationSuggestion?.stages;
    if (Array.isArray(suggestedStages) && suggestedStages.length > 0) {
      const stages = pm.normalizeSuggestedStages(suggestedStages);
      if (stages.length > 0) {
        return {
          ...project,
          workflow: {
            stages,
            currentStage: stages[0]?.id || null
          }
        };
      }
    }
    return project;
  },

  startArtifactPolling(pm, projectId) {
    if (!projectId || !window.workflowExecutor) {
      return;
    }
    if (pm.artifactPollingProjectId === projectId && pm.artifactPollingTimer) {
      return;
    }
    pm.stopArtifactPolling();
    pm.artifactPollingProjectId = projectId;
    pm.artifactPollingTimer = setInterval(() => {
      pm.pollProjectArtifacts().catch(() => {});
    }, 5000);
    pm.pollProjectArtifacts().catch(() => {});
  },

  stopArtifactPolling(pm) {
    if (pm.artifactPollingTimer) {
      clearInterval(pm.artifactPollingTimer);
    }
    pm.artifactPollingTimer = null;
    pm.artifactPollingProjectId = null;
    pm.artifactPollingInFlight = false;
  },

  async pollProjectArtifacts(pm) {
    if (pm.artifactPollingInFlight) {
      return;
    }
    if (!pm.currentProjectId || !pm.currentProject || !window.workflowExecutor) {
      return;
    }
    pm.artifactPollingInFlight = true;
    try {
      const projectId = pm.currentProjectId;
      const artifacts = await window.workflowExecutor.getAllArtifacts(projectId);
      if (!Array.isArray(artifacts)) {
        return;
      }
      const byStage = new Map();
      artifacts.forEach(artifact => {
        if (!artifact?.stageId) {
          return;
        }
        if (!byStage.has(artifact.stageId)) {
          byStage.set(artifact.stageId, []);
        }
        byStage.get(artifact.stageId).push(artifact);
      });
      if (pm.storageManager?.saveArtifacts) {
        await pm.storageManager.saveArtifacts(artifacts);
      }

      const project = pm.currentProject;
      if (!project?.workflow?.stages) {
        return;
      }
      const now = Date.now();
      let changed = false;

      project.workflow.stages = project.workflow.stages.map(stage => {
        const incoming = byStage.get(stage.id) || [];
        const merged = pm.mergeArtifacts(stage.artifacts || [], incoming);
        const artifactCountChanged = merged.length !== (stage.artifacts || []).length;
        if (artifactCountChanged) {
          stage.artifacts = merged;
          stage.artifactsUpdatedAt = now;
          changed = true;
        }

        const trackerKey = `${project.id}:${stage.id}`;
        const tracker = pm.stageProgressTracker[trackerKey] || {
          lastCount: (stage.artifacts || []).length,
          lastUpdatedAt: stage.artifactsUpdatedAt || stage.startedAt || now
        };
        if (artifactCountChanged) {
          tracker.lastCount = merged.length;
          tracker.lastUpdatedAt = now;
        }
        pm.stageProgressTracker[trackerKey] = tracker;

        if (stage.status === 'active') {
          const definition = window.workflowExecutor?.getStageDefinition(stage.id, stage);
          const expectedDeliverables = pm.getExpectedDeliverables(stage, definition);
          const selectedDeliverables = pm.getStageSelectedDeliverables(
            stage.id,
            expectedDeliverables
          );
          const progress = pm.getDeliverableProgressSummary(
            stage,
            expectedDeliverables,
            selectedDeliverables
          );
          if (progress.selectedCount > 0 && progress.generatedCount >= progress.selectedCount) {
            stage.status = 'completed';
            stage.completedAt = now;
            changed = true;
          }

          const idleFor = now - tracker.lastUpdatedAt;
          const timeoutMs = 12 * 60 * 1000;
          if (idleFor > timeoutMs) {
            stage.status = 'pending';
            stage.startedAt = null;
            stage.completedAt = null;
            stage.repairNote = '检测到执行卡住，已自动恢复为待执行';
            changed = true;
          }
        }
        return stage;
      });

      if (changed) {
        await pm.storageManager.saveProject(project);
        await pm.updateProject(
          project.id,
          { workflow: project.workflow, status: project.status },
          { localOnly: true }
        );
        pm.refreshProjectPanel(project);
      }
    } finally {
      pm.artifactPollingInFlight = false;
    }
  },

  normalizeExecutionState(pm, project) {
    if (!project || !project.workflow || !Array.isArray(project.workflow.stages)) {
      return project;
    }

    const now = Date.now();
    const normalizeTimestamp = value => {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const stages = project.workflow.stages;
    const activeStages = stages.filter(stage => ['active', 'in_progress'].includes(stage.status));
    const allCompleted = stages.length > 0 && stages.every(stage => stage.status === 'completed');
    const timeoutMs = 30 * 60 * 1000;

    let updated = false;
    let nextStatus = project.status;
    let nextStages = stages;

    if (allCompleted && project.status !== 'completed') {
      nextStatus = 'completed';
      updated = true;
    }

    if (activeStages.length === 0 && project.status === 'in_progress') {
      nextStatus = allCompleted ? 'completed' : 'active';
      updated = true;
    }

    if (activeStages.length > 0) {
      const projectUpdatedAt = normalizeTimestamp(project.updatedAt);
      const staleActive = activeStages.every(stage => {
        const startedAt = normalizeTimestamp(stage.startedAt);
        const fallbackAt = startedAt ?? projectUpdatedAt;
        if (!fallbackAt) {
          return true;
        }
        return now - fallbackAt > timeoutMs;
      });
      if (staleActive) {
        nextStages = stages.map(stage => {
          if (!['active', 'in_progress'].includes(stage.status)) {
            return stage;
          }
          return {
            ...stage,
            status: 'pending',
            startedAt: null,
            completedAt: null
          };
        });
        nextStatus = allCompleted ? 'completed' : 'active';
        updated = true;
      }
    }

    if (!updated) {
      return project;
    }

    const updatedProject = {
      ...project,
      status: nextStatus,
      workflow: {
        ...project.workflow,
        stages: nextStages
      }
    };

    setTimeout(() => {
      pm.updateProject(
        project.id,
        { status: nextStatus, workflow: updatedProject.workflow },
        { localOnly: true }
      ).catch(() => {});
    }, 0);

    return updatedProject;
  }
};
