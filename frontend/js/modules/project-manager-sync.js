/**
 * ProjectManager 状态同步与轮询模块
 */

window.projectManagerSync = {
  async probeWorkflowRouteHealth(pm, projectId) {
    if (!projectId || !pm?.fetchWithAuth) {
      return null;
    }
    const toHealth = response => {
      const status = Number(response?.status || 0);
      if (status === 404) {
        return { available: false, status };
      }
      if (status === 200 || status === 401) {
        return { available: true, status };
      }
      return { available: false, status };
    };

    let executionRuns = { available: false, status: 0 };
    let artifactChunks = { available: false, status: 0 };
    try {
      const runsResp = await pm.fetchWithAuth(
        `${pm.apiUrl}/api/workflow/${projectId}/execution-runs?limit=1`
      );
      executionRuns = toHealth(runsResp);
      if (runsResp.status === 404) {
        if (!pm.executionRunsUnavailableByProject) {
          pm.executionRunsUnavailableByProject = {};
        }
        pm.executionRunsUnavailableByProject[projectId] = true;
      }
    } catch (_error) {
      // ignore health probe errors and fall back to default unavailable status
    }
    try {
      const chunksResp = await pm.fetchWithAuth(
        `${pm.apiUrl}/api/workflow/${projectId}/artifact-chunks?limit=1&includeContent=0`
      );
      artifactChunks = toHealth(chunksResp);
      if (chunksResp.status === 404) {
        if (!pm.artifactChunksUnavailableByProject) {
          pm.artifactChunksUnavailableByProject = {};
        }
        pm.artifactChunksUnavailableByProject[projectId] = true;
      }
    } catch (_error) {
      // ignore health probe errors and fall back to default unavailable status
    }

    if (!pm.workflowRouteHealthByProject) {
      pm.workflowRouteHealthByProject = {};
    }
    const health = {
      projectId,
      checkedAt: Date.now(),
      executionRuns,
      artifactChunks
    };
    pm.workflowRouteHealthByProject[projectId] = health;
    return health;
  },

  resolveMergedStageStatus(remoteStage, localStage) {
    const remoteStatus = String(remoteStage?.status || '').toLowerCase();
    const localStatus = String(localStage?.status || '').toLowerCase();
    if (!localStatus) {
      return remoteStage?.status;
    }
    if (!remoteStatus) {
      return localStage?.status;
    }

    // 远端已完成时，不允许本地旧 active/in_progress 覆盖，避免界面永久“执行中”
    if (
      remoteStatus === 'completed' &&
      (localStatus === 'active' || localStatus === 'in_progress')
    ) {
      return remoteStage.status;
    }

    // 远端失败/阻塞也应优先展示，避免本地状态掩盖真实执行结果
    if (remoteStatus === 'failed' || remoteStatus === 'blocked') {
      return remoteStage.status;
    }

    return localStage.status || remoteStage.status;
  },

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
      const resolveStageStatus = (remoteStage, localStage) => {
        if (window.projectManagerSync?.resolveMergedStageStatus) {
          return window.projectManagerSync.resolveMergedStageStatus(remoteStage, localStage);
        }
        return localStage?.status || remoteStage?.status;
      };
      const localMap = new Map(localStages.map(stage => [stage.id, stage]));
      return remoteStages.map(stage => {
        const localStage = localMap.get(stage.id);
        if (!localStage) {
          return stage;
        }
        return {
          ...stage,
          status: resolveStageStatus(stage, localStage),
          startedAt: localStage.startedAt ?? stage.startedAt,
          completedAt: localStage.completedAt ?? stage.completedAt,
          artifactsUpdatedAt: localStage.artifactsUpdatedAt ?? stage.artifactsUpdatedAt,
          executionRuns:
            localStage.executionRuns && typeof localStage.executionRuns === 'object'
              ? localStage.executionRuns
              : stage.executionRuns,
          executingArtifactTypes: Array.isArray(localStage.executingArtifactTypes)
            ? localStage.executingArtifactTypes
            : stage.executingArtifactTypes,
          supplementingDeliverableTypes: Array.isArray(localStage.supplementingDeliverableTypes)
            ? localStage.supplementingDeliverableTypes
            : stage.supplementingDeliverableTypes,
          executionProbe: localStage.executionProbe || stage.executionProbe,
          repairNote: localStage.repairNote || stage.repairNote,
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
    window.projectManagerSync
      .probeWorkflowRouteHealth(pm, projectId)
      .then(() => {
        if (pm.currentProjectId === projectId && pm.currentProject) {
          pm.refreshProjectPanel(pm.currentProject);
        }
      })
      .catch(() => {});
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
      let runRecords = [];
      const hasRunningStages = Array.isArray(pm.currentProject?.workflow?.stages)
        ? pm.currentProject.workflow.stages.some(stage => {
            const status = String(stage?.status || '').toLowerCase();
            if (status === 'active' || status === 'in_progress') {
              return true;
            }
            return (
              Array.isArray(stage?.executingArtifactTypes) &&
              stage.executingArtifactTypes.length > 0
            );
          })
        : false;
      const runEndpointUnavailable =
        pm.executionRunsUnavailableByProject &&
        pm.executionRunsUnavailableByProject[projectId] === true;
      const chunkEndpointUnavailable =
        pm.artifactChunksUnavailableByProject &&
        pm.artifactChunksUnavailableByProject[projectId] === true;
      if (pm.enableExecutionRunsPolling === true && hasRunningStages && !runEndpointUnavailable) {
        try {
          const runResp = await pm.fetchWithAuth(
            `${pm.apiUrl}/api/workflow/${projectId}/execution-runs?limit=200`
          );
          if (runResp.ok) {
            const runJson = await runResp.json().catch(() => null);
            runRecords = Array.isArray(runJson?.data?.runs) ? runJson.data.runs : [];
          } else if (runResp.status === 404) {
            if (!pm.executionRunsUnavailableByProject) {
              pm.executionRunsUnavailableByProject = {};
            }
            pm.executionRunsUnavailableByProject[projectId] = true;
          }
        } catch (_error) {
          // ignore temporary polling failures
        }
      }
      if (
        pm.enableExecutionRunsPolling === true &&
        hasRunningStages &&
        !chunkEndpointUnavailable &&
        (runEndpointUnavailable || !Array.isArray(runRecords) || runRecords.length === 0)
      ) {
        try {
          const chunkResp = await pm.fetchWithAuth(
            `${pm.apiUrl}/api/workflow/${projectId}/artifact-chunks?limit=200&includeContent=0`
          );
          if (chunkResp.ok) {
            const chunkJson = await chunkResp.json().catch(() => null);
            const sessions = Array.isArray(chunkJson?.data?.sessions)
              ? chunkJson.data.sessions
              : [];
            runRecords = sessions.map(session => ({
              runId: session?.runId,
              projectId,
              stageId: session?.stageId,
              artifactType: session?.artifactType,
              status: session?.status || 'queued',
              updatedAt: session?.updatedAt || session?.createdAt,
              createdAt: session?.createdAt,
              error: session?.error || null,
              result:
                session?.assembled && typeof session.assembled === 'object'
                  ? {
                      artifactId: session.assembled.artifactId || null,
                      contentChars: Number(session.assembled.contentChars || 0),
                      contentHash: session.assembled.contentHash || null
                    }
                  : null
            }));
          } else if (chunkResp.status === 404) {
            if (!pm.artifactChunksUnavailableByProject) {
              pm.artifactChunksUnavailableByProject = {};
            }
            pm.artifactChunksUnavailableByProject[projectId] = true;
          }
        } catch (_error) {
          // ignore temporary polling failures
        }
      }
      const runByStage = new Map();
      runRecords.forEach(run => {
        const stageId = String(run?.stageId || '').trim();
        const artifactType = String(run?.artifactType || '').trim();
        if (!stageId || !artifactType) {
          return;
        }
        if (!runByStage.has(stageId)) {
          runByStage.set(stageId, {});
        }
        const stageRuns = runByStage.get(stageId);
        const existing = stageRuns[artifactType];
        const candidateTime = Number(
          new Date(run?.updatedAt || run?.createdAt || 0).getTime() || 0
        );
        const existingTime = Number(
          new Date(existing?.updatedAt || existing?.createdAt || 0).getTime() || 0
        );
        if (!existing || candidateTime >= existingTime) {
          stageRuns[artifactType] = run;
        }
      });
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
        const latestRuns = runByStage.get(stage.id) || null;
        if (
          JSON.stringify(
            (stage.executionRuns && typeof stage.executionRuns === 'object'
              ? stage.executionRuns
              : null) || {}
          ) !== JSON.stringify(latestRuns || {})
        ) {
          stage.executionRuns = latestRuns;
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

        if (stage.status === 'active' || stage.status === 'in_progress') {
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
          const stageRuns =
            stage.executionRuns && typeof stage.executionRuns === 'object'
              ? stage.executionRuns
              : {};
          const hasRunningRun = Object.values(stageRuns).some(run => {
            const runStatus = String(run?.status || '').toLowerCase();
            return runStatus === 'running' || runStatus === 'queued';
          });
          const executingTypes = Array.isArray(stage.executingArtifactTypes)
            ? stage.executingArtifactTypes.filter(Boolean)
            : [];
          const hasGeneratedArtifacts = Array.isArray(merged) && merged.length > 0;
          const selectedAllGenerated =
            progress.selectedCount > 0 && progress.generatedCount >= progress.selectedCount;
          const noSelectionButFinished =
            progress.selectedCount === 0 &&
            hasGeneratedArtifacts &&
            executingTypes.length === 0 &&
            !hasRunningRun;
          if ((selectedAllGenerated || noSelectionButFinished) && !hasRunningRun) {
            stage.status = 'completed';
            stage.completedAt = now;
            stage.executingArtifactTypes = [];
            changed = true;
          }

          const normalizedStageId =
            window.workflowExecutor?.normalizeStageId?.(stage.id) || stage.id;
          const inferredModelRequired =
            window.workflowExecutor?.createExecutionProbeMeta?.(normalizedStageId)?.modelRequired ??
            true;
          const executionProbe = stage.executionProbe || {};
          const probeStartedAt = Number(executionProbe.requestStartedAt || stage.startedAt || 0);
          const modelRequired =
            typeof executionProbe.modelRequired === 'boolean'
              ? executionProbe.modelRequired
              : Boolean(inferredModelRequired);
          if (!stage.executionProbe || typeof executionProbe.modelRequired !== 'boolean') {
            stage.executionProbe = {
              ...executionProbe,
              requestStartedAt: probeStartedAt || now,
              modelRequired,
              source: executionProbe.source || 'project-manager-sync',
              updatedAt: now
            };
            changed = true;
          }
          const modelCallVerified = Boolean(executionProbe.modelCallVerified);
          const modelArtifacts = (Array.isArray(merged) ? merged : []).filter(artifact => {
            const sourceKey = String(artifact?.source || '')
              .trim()
              .toLowerCase();
            const tokens = Number(artifact?.tokens || 0);
            return sourceKey === 'model' || tokens > 0;
          });
          if (modelArtifacts.length > 0 && !modelCallVerified) {
            const modelTokenTotal = modelArtifacts.reduce(
              (sum, artifact) => sum + Number(artifact?.tokens || 0),
              0
            );
            console.info('[ProjectManagerSync] 检测到大模型调用', {
              projectId: project.id,
              stageId: stage.id,
              modelArtifactCount: modelArtifacts.length,
              modelTokenTotal
            });
            stage.executionProbe = {
              ...(stage.executionProbe || {}),
              modelCallVerified: true,
              modelArtifactCount: modelArtifacts.length,
              modelTokenTotal,
              verifiedBy: 'artifact-polling',
              updatedAt: now
            };
            changed = true;
          }
          const noModelProbeTimeoutMs = 3 * 60 * 1000;
          if (
            modelRequired &&
            !modelCallVerified &&
            probeStartedAt > 0 &&
            now - probeStartedAt > noModelProbeTimeoutMs
          ) {
            stage.status = 'pending';
            stage.startedAt = null;
            stage.completedAt = null;
            stage.executingArtifactTypes = [];
            stage.repairNote = '长时间未检测到大模型调用，已自动恢复为待执行';
            stage.executionProbe = {
              ...executionProbe,
              modelCallVerified: false,
              timedOutNoModelCall: true,
              updatedAt: now
            };
            changed = true;
            return stage;
          }

          const persistedLastProgressAt = Number(
            stage.artifactsUpdatedAt ||
              probeStartedAt ||
              stage.startedAt ||
              tracker.lastUpdatedAt ||
              0
          );
          const idleFor = now - persistedLastProgressAt;
          const timeoutMs = 12 * 60 * 1000;
          if (idleFor > timeoutMs) {
            stage.status = 'pending';
            stage.startedAt = null;
            stage.completedAt = null;
            stage.executingArtifactTypes = [];
            stage.repairNote = '检测到执行卡住，已自动恢复为待执行';
            stage.executionProbe = {
              ...executionProbe,
              timedOutNoProgress: true,
              updatedAt: now
            };
            changed = true;
          }
        }
        return stage;
      });

      if (Array.isArray(project.collaborationSuggestion?.stages)) {
        const workflowStageMap = new Map(
          (project.workflow.stages || []).map(stage => [stage.id, stage])
        );
        project.collaborationSuggestion.stages = project.collaborationSuggestion.stages.map(
          stage => {
            const runtime = workflowStageMap.get(stage.id);
            if (!runtime) {
              return stage;
            }
            const nextStage = {
              ...stage,
              status: runtime.status || stage.status,
              startedAt: runtime.startedAt ?? stage.startedAt,
              completedAt: runtime.completedAt ?? stage.completedAt,
              artifacts: Array.isArray(runtime.artifacts) ? runtime.artifacts : stage.artifacts,
              artifactsUpdatedAt: runtime.artifactsUpdatedAt ?? stage.artifactsUpdatedAt,
              executionRuns:
                runtime.executionRuns && typeof runtime.executionRuns === 'object'
                  ? runtime.executionRuns
                  : stage.executionRuns,
              executingArtifactTypes: Array.isArray(runtime.executingArtifactTypes)
                ? runtime.executingArtifactTypes
                : stage.executingArtifactTypes,
              supplementingDeliverableTypes: Array.isArray(runtime.supplementingDeliverableTypes)
                ? runtime.supplementingDeliverableTypes
                : stage.supplementingDeliverableTypes,
              executionProbe: runtime.executionProbe || stage.executionProbe,
              repairNote: runtime.repairNote || stage.repairNote
            };
            if (
              nextStage.status !== stage.status ||
              nextStage.startedAt !== stage.startedAt ||
              nextStage.completedAt !== stage.completedAt ||
              nextStage.repairNote !== stage.repairNote ||
              JSON.stringify(nextStage.executingArtifactTypes || []) !==
                JSON.stringify(stage.executingArtifactTypes || []) ||
              JSON.stringify(nextStage.supplementingDeliverableTypes || []) !==
                JSON.stringify(stage.supplementingDeliverableTypes || []) ||
              JSON.stringify(nextStage.executionProbe || {}) !==
                JSON.stringify(stage.executionProbe || {}) ||
              JSON.stringify(nextStage.executionRuns || {}) !==
                JSON.stringify(stage.executionRuns || {}) ||
              (Array.isArray(nextStage.artifacts) ? nextStage.artifacts.length : 0) !==
                (Array.isArray(stage.artifacts) ? stage.artifacts.length : 0)
            ) {
              changed = true;
            }
            return nextStage;
          }
        );
      }

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
            completedAt: null,
            executingArtifactTypes: []
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
