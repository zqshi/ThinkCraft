/**
 * ProjectManager 工作流详情与执行模块
 * 说明：仅抽离原逻辑，不改业务行为。
 */

const workflowRunnerLogger = window.createLogger
  ? window.createLogger('ProjectManagerWorkflowRunner')
  : console;

window.projectManagerWorkflowRunner = {
  ensureProjectPanelStyles(pm) {
    if (pm.projectPanelStyleEnsured) {
      return;
    }
    pm.projectPanelStyleEnsured = true;

    const hasMainCss = Array.from(document.styleSheets || []).some(sheet => {
      try {
        return sheet?.href && sheet.href.includes('/css/main.css');
      } catch (error) {
        return false;
      }
    });

    if (!hasMainCss) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/main.css';
      link.dataset.tc = 'project-panel-css';
      document.head.appendChild(link);
    }

    const probe = document.createElement('div');
    probe.className = 'project-deliverable-checklist';
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    document.body.appendChild(probe);
    const style = window.getComputedStyle(probe);
    const hasChecklistStyle =
      style.borderRadius !== '0px' && style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    document.body.removeChild(probe);

    if (hasChecklistStyle) {
      return;
    }

    if (document.getElementById('project-panel-style-fallback')) {
      return;
    }
    const styleTag = document.createElement('style');
    styleTag.id = 'project-panel-style-fallback';
    styleTag.textContent = `
      .project-deliverable-checklist {
        margin-top: 10px;
        padding: 10px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #fafafa;
      }
      .project-deliverable-checklist-title {
        font-size: 12px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 6px;
      }
      .project-deliverable-checklist-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .project-deliverable-checklist-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: #374151;
        padding: 4px 8px;
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        background: #fff;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .project-deliverable-checklist-input {
        accent-color: #10b981;
      }
      .project-deliverable-checklist-label {
        line-height: 1.2;
      }
      .project-deliverable-checklist-item:hover {
        border-color: #a7f3d0;
        background: #ecfdf5;
        color: #065f46;
      }
      .project-deliverable-checklist-input:checked + .project-deliverable-checklist-label {
        color: #065f46;
        font-weight: 600;
      }
    `;
    document.head.appendChild(styleTag);
  },

  async checkBackendHealth(pm) {
    try {
      pm.lastHealthError = null;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      let response = await fetch(`${pm.apiUrl}/api/health`, { signal: controller.signal });
      if (!response.ok) {
        response = await pm.fetchWithAuth(`${pm.apiUrl}/api/projects/health`, {
          signal: controller.signal
        });
      }
      clearTimeout(timeoutId);
      if (!response.ok) {
        if (response.status === 401) {
          pm.lastHealthError = 'unauthorized';
        }
        return false;
      }
      const result = await response.json().catch(() => ({}));
      if (result?.code === 0) {
        return true;
      }
      if (result?.status === 'ok') {
        return true;
      }
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  async syncWorkflowArtifactsFromServer(pm, project) {
    if (!project || !project.workflow || !window.workflowExecutor) {
      return;
    }
    const artifacts = await window.workflowExecutor.getAllArtifacts(project.id);
    const byStage = new Map();
    (artifacts || []).forEach(artifact => {
      if (!artifact?.stageId) {
        return;
      }
      if (!byStage.has(artifact.stageId)) {
        byStage.set(artifact.stageId, []);
      }
      byStage.get(artifact.stageId).push(artifact);
    });
    const stages = project.workflow.stages || [];
    stages.forEach(stage => {
      const incoming = byStage.get(stage.id) || [];
      if (incoming.length > 0) {
        stage.artifacts = incoming;
        stage.artifactsUpdatedAt = Date.now();
      } else {
        stage.artifacts = [];
      }
    });

    pm.normalizeExecutionState(project);
  },

  renderWorkflowDetails(pm, project) {
    if (!window.modalManager) {
      return;
    }

    const workflowReady = Boolean(window.workflowExecutor);
    if (!project.workflow || !project.workflow.stages) {
      window.modalManager.alert('项目工作流不存在或未加载', 'warning');
      return;
    }

    const progress = pm.calculateWorkflowProgress(project.workflow);

    const stagesHTML = project.workflow.stages
      .map((stage, index) => {
        const definition = window.workflowExecutor?.getStageDefinition(stage.id, stage);
        const statusText =
          {
            pending: '待执行',
            active: '执行中',
            completed: '已完成'
          }[stage.status] || stage.status;

        const statusColor =
          {
            pending: '#9ca3af',
            active: '#3b82f6',
            completed: '#10b981'
          }[stage.status] || '#9ca3af';

        const artifactCount = stage.artifacts?.length || 0;
        const isLastStage = index === project.workflow.stages.length - 1;

        const dependencies = stage.dependencies || [];
        const unmetDependencies = [];
        if (dependencies.length > 0) {
          const stages = project.workflow?.stages || [];
          for (const depId of dependencies) {
            const depStage = stages.find(s => s.id === depId);
            if (depStage && depStage.status !== 'completed') {
              unmetDependencies.push(depStage.name);
            }
          }
        }

        const isExecutable =
          stage.status === 'pending' && unmetDependencies.length === 0 && workflowReady;
        const isBlocked = stage.status === 'pending' && unmetDependencies.length > 0;

        let cardStyle = '';
        const cardClass = 'stage-card';

        if (stage.status === 'completed') {
          cardStyle = `
            border: 1px solid #d1fae5;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-left: 4px solid #10b981;
          `;
        } else if (stage.status === 'active') {
          cardStyle = `
            border: 1px solid #dbeafe;
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-left: 4px solid #3b82f6;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
          `;
        } else if (isExecutable) {
          cardStyle = `
            border: 1px solid #e0e7ff;
            background: white;
            border-left: 4px solid #667eea;
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
          `;
        } else if (isBlocked) {
          cardStyle = `
            border: 1px solid #f3f4f6;
            background: #fafafa;
            border-left: 4px solid #d1d5db;
            opacity: 0.7;
          `;
        } else {
          cardStyle = `
            border: 1px solid var(--border);
            background: white;
            border-left: 4px solid ${definition?.color || '#667eea'};
          `;
        }

        const statusIcon =
          {
            pending: isBlocked ? '🔒' : '⏸️',
            active: '⚡',
            completed: '✅'
          }[stage.status] || '📋';

        let artifactsHTML = '';
        if (artifactCount > 0) {
          const artifactsList = (stage.artifacts || [])
            .slice(0, 3)
            .map(artifact => {
              const fileName = artifact.fileName || artifact.title || '未命名文件';
              const fileType = artifact.type || '文档';
              return `
              <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
                <span style="font-size: 16px;">📄</span>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 13px; font-weight: 500; color: #374151; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${pm.escapeHtml(fileName)}</div>
                  <div style="font-size: 11px; color: #9ca3af;">${fileType}</div>
                </div>
              </div>
            `;
            })
            .join('');

          const moreCount = artifactCount > 3 ? artifactCount - 3 : 0;
          artifactsHTML = `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05);">
              <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">📦 交付物 (${artifactCount})</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${artifactsList}
                ${moreCount > 0 ? `<div style="font-size: 12px; color: #9ca3af; text-align: center;">还有 ${moreCount} 个交付物...</div>` : ''}
              </div>
            </div>
          `;
        }

        let dependencyHTML = '';
        if (isBlocked) {
          dependencyHTML = `
            <div style="margin-top: 12px; padding: 8px 12px; background: #fef3c7; border-radius: 8px; border-left: 3px solid #f59e0b;">
              <div style="font-size: 12px; color: #92400e;">
                <span style="font-weight: 600;">⚠️ 依赖未满足：</span>
                <span>${unmetDependencies.join('、')}</span>
              </div>
            </div>
          `;
        }

        let actionHTML = '';
        if (stage.status === 'pending') {
          if (isBlocked) {
            actionHTML = `
              <button class="btn-secondary" disabled title="依赖阶段未完成：${unmetDependencies.join('、')}" style="opacity: 0.5;">
                🔒 依赖未满足
              </button>
            `;
          } else if (workflowReady) {
            actionHTML = `
              <button class="btn-primary" onclick="projectManager.startStageWithSelection('${project.id}', '${stage.id}', true)" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);">
                ▶️ 开始执行
              </button>
            `;
          } else {
            actionHTML = `
              <button class="btn-secondary" disabled title="工作流执行器未就绪">
                开始执行
              </button>
            `;
          }
        } else if (stage.status === 'completed') {
          actionHTML = '';
        } else {
          actionHTML = `
            <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
              <div style="width: 16px; height: 16px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <span style="font-size: 14px; font-weight: 500; color: #3b82f6;">正在执行中...</span>
            </div>
          `;
        }

        const connectorHTML = !isLastStage
          ? `
          <div style="display: flex; justify-content: center; margin: -8px 0;">
            <div style="width: 2px; height: 24px; background: linear-gradient(to bottom, ${statusColor}, #e5e7eb); opacity: 0.5;"></div>
          </div>
        `
          : '';

        return `
          <div class="${cardClass}" style="${cardStyle} border-radius: 12px; padding: 20px; margin-bottom: 8px; transition: all 0.3s ease;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <div style="font-size: 36px; line-height: 1;">${definition?.icon || '📋'}</div>
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${definition?.name || stage.name}</h3>
                    <span style="font-size: 18px;">${statusIcon}</span>
                  </div>
                  <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.5;">${definition?.description || ''}</p>
                </div>
              </div>
              <div style="padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: white; background: ${statusColor}; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                ${statusText}
              </div>
            </div>
            ${dependencyHTML}
            ${artifactsHTML}
            <div style="margin-top: ${artifactsHTML || dependencyHTML ? '12' : '16'}px;">
              ${actionHTML}
            </div>
          </div>
          ${connectorHTML}
        `;
      })
      .join('');

    const contentHTML = `
            <div style="max-height: 70vh; overflow-y: auto; padding: 4px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; color: white;">
                    <h2 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600;">${pm.escapeHtml(project.name)}</h2>
                    <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span>📊</span>
                            <span>进度: ${progress}%</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span>⏱️</span>
                            <span>${pm.formatTimeAgo(project.updatedAt)}</span>
                        </div>
                    </div>
                    <div style="background: rgba(255,255,255,0.2); height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: white; height: 100%; width: ${progress}%; transition: width 0.3s;"></div>
                    </div>
                </div>

                <div style="margin-bottom: 16px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">工作流阶段</h3>
                    ${stagesHTML}
                </div>

                <div style="display: flex; gap: 12px; padding-top: 16px; border-top: 1px solid var(--border);">
                    <button class="btn-secondary" onclick="window.modalManager.close('workflowDetails')" style="flex: 1;">
                        返回项目列表
                    </button>
                    <button class="btn-primary" onclick="projectManager.executeAllStages('${project.id}')" style="flex: 1;" ${workflowReady ? '' : 'disabled title="工作流执行器未就绪"'}>
                        一键执行全部
                    </button>
                </div>
            </div>
        `;

    window.modalManager.showCustomModal('🎯 项目工作流', contentHTML, 'workflowDetails');
  },

  async executeAllStages(pm, projectId, options = {}) {
    try {
      const skipConfirm = Boolean(options.skipConfirm);
      if (!window.workflowExecutor) {
        if (window.modalManager) {
          window.modalManager.alert('工作流执行器未就绪，请稍后重试', 'warning');
        }
        return;
      }

      const project = await pm.getProject(projectId);
      if (!project || !project.workflow) {
        throw new Error('项目工作流不存在');
      }

      await pm.updateProject(projectId, { status: 'in_progress' }, { allowFallback: true });

      const pendingStages = project.workflow.stages
        .filter(s => s.status === 'pending')
        .map(s => s.id);

      if (pendingStages.length === 0) {
        if (window.modalManager) {
          window.modalManager.alert('所有阶段已完成！', 'success');
        }
        return;
      }

      if (!skipConfirm) {
        const confirmed = confirm(
          `将执行 ${pendingStages.length} 个阶段，这可能需要一些时间，是否继续？`
        );
        if (!confirmed) {
          return;
        }
      }

      if (window.modalManager) {
        window.modalManager.close('workflowDetails');
      }

      if (window.modalManager) {
        window.modalManager.alert('正在批量执行工作流，请稍候...', 'info');
      }

      const ideaId = pm.normalizeIdeaId(project.ideaId);
      const chat =
        (await pm.storageManager.getChat(ideaId)) ||
        (await pm.storageManager.getChat(project.ideaId));
      const conversation = chat
        ? chat.messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
        : '';

      const result = await window.workflowExecutor.executeBatch(
        projectId,
        pendingStages,
        conversation,
        async (stageId, status) => {
          if (pm.currentProjectId !== projectId) {
            return;
          }
          if (status === 'active' || status === 'completed') {
            const refreshed = await pm.getProject(projectId);
            if (refreshed) {
              pm.refreshProjectPanel(refreshed);
            }
          }
        },
        { skipRoleCheck: skipConfirm }
      );

      const refreshedProject = await pm.getProject(projectId);
      const allCompleted = refreshedProject?.workflow?.stages?.every(
        stage => stage.status === 'completed'
      );
      if (allCompleted) {
        await pm.updateProject(projectId, { status: 'completed' }, { allowFallback: true });
      }

      if (window.modalManager) {
        window.modalManager.close();
        window.modalManager.alert(
          `工作流执行完成！<br><br>完成了 ${pendingStages.length} 个阶段<br>消耗 ${result.totalTokens} tokens`,
          'success'
        );
      }

      await pm.loadProjects();
      pm.renderProjectList('projectListContainer');
      pm.refreshProjectPanel(await pm.getProject(projectId));
    } catch (error) {
      if (window.modalManager) {
        window.modalManager.close();
        window.modalManager.alert('执行失败: ' + error.message, 'error');
      }
      await pm
        .updateProject(projectId, { status: 'active' }, { allowFallback: true })
        .catch(() => {});
    }
  },

  async startWorkflowExecution(pm, projectId) {
    workflowRunnerLogger.info('[开始执行] ========== 开始工作流执行 ==========');
    workflowRunnerLogger.info('[开始执行] 项目ID:', projectId);

    try {
      const project = await pm.getProject(projectId);
      if (!project) {
        throw new Error('项目不存在');
      }

      workflowRunnerLogger.info('[开始执行] 项目信息:', {
        name: project.name,
        status: project.status,
        stageCount:
          project.workflow && project.workflow.stages ? project.workflow.stages.length : 0,
        memberCount: project.assignedAgents ? project.assignedAgents.length : 0
      });

      if (!project.collaborationExecuted) {
        if (window.ErrorHandler) {
          window.ErrorHandler.showToast('请先确认协作模式', 'warning');
        }
        return;
      }

      if (!project.workflow || !project.workflow.stages || project.workflow.stages.length === 0) {
        if (window.ErrorHandler) {
          window.ErrorHandler.showToast('项目没有工作流阶段', 'warning');
        }
        return;
      }

      const memberCount = project.assignedAgents ? project.assignedAgents.length : 0;
      const confirmed = confirm(
        '确定要开始执行工作流吗？\n\n' +
          '项目：' +
          project.name +
          '\n' +
          '阶段数：' +
          project.workflow.stages.length +
          '\n' +
          '成员数：' +
          memberCount +
          '\n\n' +
          '执行过程可能需要较长时间，请耐心等待。'
      );

      if (!confirmed) {
        workflowRunnerLogger.info('[开始执行] 用户取消执行');
        return;
      }

      workflowRunnerLogger.info('[开始执行] 用户确认执行，开始调用 executeAllStages');

      if (pm.executeAllStages) {
        await pm.executeAllStages(projectId, {
          skipConfirm: true
        });
      } else {
        throw new Error('executeAllStages 方法不存在');
      }

      workflowRunnerLogger.info('[开始执行] ========== 工作流执行完成 ==========');
    } catch (error) {
      workflowRunnerLogger.error('[开始执行] 执行失败:', error);
      if (window.ErrorHandler) {
        window.ErrorHandler.showToast('执行失败：' + error.message, 'error');
      }
    }
  }
};
