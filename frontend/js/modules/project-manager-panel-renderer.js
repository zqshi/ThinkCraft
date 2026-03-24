/**
 * ProjectManager panel renderer split module.
 * Extracted from project-manager.js without business logic changes.
 */
(function () {
  const panelRenderer = {
    mergeDisplayStages(pm, project, suggestedStages = []) {
      const normalizedSuggested = pm.normalizeSuggestedStages(suggestedStages || []);
      const workflowStages = Array.isArray(project?.workflow?.stages)
        ? project.workflow.stages
        : [];
      if (workflowStages.length === 0) {
        return normalizedSuggested;
      }

      const runtimeStageMap = new Map(workflowStages.map(stage => [stage.id, stage]));
      const merged = normalizedSuggested.map(stage => {
        const runtime = runtimeStageMap.get(stage.id);
        if (!runtime) {
          return stage;
        }
        return {
          ...stage,
          status: runtime.status || stage.status,
          startedAt: runtime.startedAt ?? stage.startedAt,
          completedAt: runtime.completedAt ?? stage.completedAt,
          executionRuns:
            runtime.executionRuns && typeof runtime.executionRuns === 'object'
              ? runtime.executionRuns
              : stage.executionRuns,
          artifacts: Array.isArray(runtime.artifacts) ? runtime.artifacts : stage.artifacts,
          artifactsUpdatedAt: runtime.artifactsUpdatedAt ?? stage.artifactsUpdatedAt,
          executingArtifactTypes: Array.isArray(runtime.executingArtifactTypes)
            ? runtime.executingArtifactTypes
            : stage.executingArtifactTypes,
          supplementingDeliverableTypes: Array.isArray(runtime.supplementingDeliverableTypes)
            ? runtime.supplementingDeliverableTypes
            : stage.supplementingDeliverableTypes,
          executionProbe: runtime.executionProbe || stage.executionProbe,
          repairNote: runtime.repairNote || stage.repairNote
        };
      });

      const existingIds = new Set(merged.map(stage => stage.id));
      const missingRuntimeStages = workflowStages.filter(stage => !existingIds.has(stage.id));
      return [...merged, ...missingRuntimeStages];
    },

    renderProjectPanel(project) {
      const panel = document.getElementById('projectPanel');
      const title = document.getElementById('projectPanelTitle');
      const body = document.getElementById('projectPanelBody');
      const mainContent = document.querySelector('.main-content');
      const chatContainer = document.getElementById('chatContainer');

      if (!panel || !body || !title) {
        this.renderWorkflowDetails(project);
        return;
      }

      project = this.normalizeExecutionState(project);
      const statusText =
        {
          planning: '规划中',
          active: '进行中',
          in_progress: '进行中',
          testing: '测试中',
          completed: '已完成',
          archived: '已归档',
          on_hold: '已暂停',
          cancelled: '已取消'
        }[project.status] || project.status;

      const updatedAt = project.updatedAt ? this.formatTimeAgo(project.updatedAt) : '刚刚';

      const memberCount = (project.assignedAgents || []).length;
      const ideaCount = project.ideaId ? 1 : 0;
      const statusClass = `status-${project.status || 'planning'}`;

      const workflowCategory = project.workflowCategory || 'product-development';
      const workflowLabel = this.getWorkflowCategoryLabel(workflowCategory);
      const routeHealth = this.workflowRouteHealthByProject?.[project.id] || null;
      const runsOk = routeHealth?.executionRuns?.available === true;
      const chunksOk = routeHealth?.artifactChunks?.available === true;
      const routeHealthLabel = routeHealth
        ? `路由自检 Runs ${runsOk ? '✓' : '✗'} / Chunks ${chunksOk ? '✓' : '✗'}`
        : '路由自检中';

      const collaborationExecuted = project.collaborationExecuted || false;
      const suggestedStages = collaborationExecuted
        ? project.collaborationSuggestion?.stages
        : null;
      const hasSuggestedStages = Array.isArray(suggestedStages) && suggestedStages.length > 0;
      const stages = collaborationExecuted
        ? hasSuggestedStages
          ? panelRenderer.mergeDisplayStages(this, project, suggestedStages)
          : project.workflow?.stages || []
        : [];

      const shouldRenderWorkflow = collaborationExecuted && stages.length > 0;
      const effectiveStages = shouldRenderWorkflow ? stages : [];
      const stageCount = effectiveStages.length;
      const completedStages = effectiveStages.filter(stage => stage.status === 'completed').length;
      const pendingStages = Math.max(stageCount - completedStages, 0);
      const progress = this.calculateWorkflowProgress({ stages: effectiveStages });

      const selectedStageId = this.currentStageId || effectiveStages[0]?.id || null;
      this.currentStageId = selectedStageId;

      // 根据依赖关系对阶段进行拓扑排序
      const sortedStages = collaborationExecuted
        ? this.sortStagesByDependencies(effectiveStages)
        : effectiveStages;
      const lastStage = sortedStages[sortedStages.length - 1] || null;
      const deploymentStage = sortedStages.find(stage => stage.id === 'deployment');
      const canShowPreviewEntry =
        Boolean(lastStage && lastStage.status === 'completed') &&
        (!deploymentStage || deploymentStage.status === 'completed');

      title.textContent = project.name;

      body.innerHTML = `
                <div class="project-panel-hero">
                    <div class="project-panel-badges">
                        <span class="project-pill ${statusClass}">${statusText}</span>
                        <span class="project-pill">${workflowLabel}</span>
                        <span class="project-pill">进度 ${progress}%</span>
                        <span class="project-pill">${routeHealthLabel}</span>
                    </div>
                    <div class="project-panel-meta">
                        <span>更新时间 ${updatedAt}</span>
                        <span>成员 ${memberCount}</span>
                        <span>创意 ${ideaCount}</span>
                        <span>待完成 ${pendingStages}</span>
                    </div>
                    <div class="project-panel-hero-actions">
                        <button class="btn-secondary" onclick="projectManager.showReplaceIdeaDialog('${project.id}')">更换创意</button>
                        <button class="btn-secondary" onclick="projectManager.downloadProjectArtifactBundle('${project.id}')">产物包</button>
                        ${shouldRenderWorkflow && canShowPreviewEntry ? `<button class="btn-secondary" onclick="projectManager.openPreviewEntry('${project.id}')">预览入口</button>` : ''}
                    </div>
                </div>
            <div class="project-panel-layout">
                <div class="project-panel-section project-panel-card">
                    <div class="project-panel-section-title">项目概览</div>
                    <div class="project-panel-summary">
                        <div>
                            <div class="project-panel-summary-label">成员</div>
                            <div class="project-panel-summary-value">${memberCount}</div>
                        </div>
                        <div>
                            <div class="project-panel-summary-label">创意</div>
                            <div class="project-panel-summary-value">${ideaCount}</div>
                        </div>
                        <div>
                            <div class="project-panel-summary-label">阶段</div>
                            <div class="project-panel-summary-value">${stageCount}</div>
                        </div>
                        <div>
                            <div class="project-panel-summary-label">进度</div>
                            <div class="project-panel-summary-value">${progress}%</div>
                        </div>
                    </div>
                    <div class="project-panel-quick-actions">
                        <!-- <button class="btn-secondary" onclick="projectManager.showMemberModal('${project.id}')">添加项目成员</button> -->
                        <button class="btn-secondary" onclick="projectManager.openCollaborationMode('${project.id}')">协同模式</button>
                    </div>
                </div>
                <div class="project-panel-section project-panel-card project-panel-span-2">
                    <div class="project-panel-section-title">流程阶段</div>
                    ${
                      shouldRenderWorkflow
                        ? `
                          <!-- 横向步骤条 -->
                          <div class="project-workflow-steps">
                            ${this.renderWorkflowSteps(sortedStages, selectedStageId)}
                          </div>
                          <!-- 阶段详情展开区域 -->
                          ${sortedStages.map(stage => this.renderStageDetailSection(project, stage)).join('')}
                        `
                        : '<div class="project-panel-empty centered"><div><div style="margin-bottom: 16px;">' +
                          (typeof window.getDefaultIconSvg === 'function'
                            ? window.getDefaultIconSvg(64, 'empty-icon')
                            : '🤝') +
                          '</div><div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">尚未配置协同模式</div><div style="font-size: 14px;">请点击上方"协同模式"按钮，配置项目的协作方式和团队成员</div></div></div>'
                    }
                </div>
                <div class="project-panel-section project-panel-card project-panel-span-2">
                    <div class="project-panel-section-title">项目成员</div>
                    <div class="project-panel-list agent-market-grid" id="projectPanelMembers">加载中...</div>
                </div>
                <div class="project-panel-section project-panel-card project-panel-span-2">
                    <div class="project-panel-section-title">创意详情</div>
                    <div class="project-panel-list" id="projectPanelIdeas">加载中...</div>
                </div>
            </div>
        `;

      panel.style.display = 'flex';
      panel.classList.add('active');
      if (mainContent) {
        mainContent.classList.add('project-panel-open');
      }
      if (chatContainer) {
        chatContainer.style.display = 'none';
      }

      this.startArtifactPolling(project.id);
      this.renderProjectMembersPanel(project);
      this.renderProjectIdeasPanel(project);
      // 不再需要 renderStageContent，因为阶段详情已经在 renderProjectPanel 中渲染
    },
    renderStageContent(project, stageId) {
      const container = document.getElementById('projectStageContent');
      if (!container) {
        return;
      }

      // 检查是否已执行协同模式
      if (!project.collaborationExecuted) {
        container.innerHTML = `
        <div class="project-panel-empty centered">
          <div>
            <div style="margin-bottom: 16px;">${typeof window.getDefaultIconSvg === 'function' ? window.getDefaultIconSvg(64, 'empty-icon') : '📋'}</div>
            <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">阶段内容待配置</div>
            <div style="font-size: 14px;">请先完成协同模式配置，确认后即可查看各阶段详情</div>
          </div>
        </div>
      `;
        return;
      }

      const stage = (project.workflow?.stages || []).find(s => s.id === stageId);
      if (!stage) {
        container.innerHTML = '<div class="project-panel-empty">暂无阶段内容</div>';
        return;
      }

      const definition = window.workflowExecutor?.getStageDefinition(stage.id, stage);
      const artifacts = this.getDisplayArtifacts(stage);
      const tab = this.stageTabState[stageId] || 'document';
      const selectedArtifactId = this.stageArtifactState[stageId] || artifacts[0]?.id || null;
      const selectedArtifact =
        artifacts.find(a => a.id === selectedArtifactId) || artifacts[0] || null;
      if (selectedArtifact?.id) {
        this.stageArtifactState[stageId] = selectedArtifact.id;
      }

      const leftArtifactsHTML = artifacts
        .map(artifact => {
          const typeLabel = this.getArtifactTypeLabel(artifact);
          const isActive = artifact.id === selectedArtifact?.id;
          return `
            <div class="project-deliverable-item ${isActive ? 'active' : ''}" onclick="projectManager.openArtifactPreviewPanel('${project.id}', '${stageId}', '${artifact.id}')">
                <div class="project-panel-item-title">${this.escapeHtml(artifact.name || '未命名交付物')}</div>
                <div class="project-panel-item-sub">${typeLabel}</div>
            </div>
        `;
        })
        .join('');

      const actionHTML = this.renderStageAction(project, stage);
      const humanPanelHTML = this.renderHumanInLoopPanel(stage);

      // 新增：显示阶段依赖
      const dependencies = stage.dependencies || [];
      const dependencyHTML =
        dependencies.length > 0
          ? `<div class="stage-dependencies">
           <div class="stage-info-label">
             <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
             </svg>
             依赖阶段
           </div>
           <div class="stage-dependency-list">
             ${dependencies
               .map(d => {
                 const depStage = project.workflow.stages.find(s => s.id === d);
                 if (!depStage) {
                   return '';
                 }
                 const depStatus = depStage.status || 'pending';
                 const depStatusIcon =
                   depStatus === 'completed' ? '✓' : depStatus === 'active' ? '⚡' : '○';
                 const depStatusClass = `status-${depStatus}`;
                 return `
                 <span class="stage-dependency-tag ${depStatusClass}">
                   <span class="dependency-icon">${depStatusIcon}</span>
                   ${this.escapeHtml(depStage.name)}
                 </span>
               `;
               })
               .join('')}
           </div>
         </div>`
          : '';

      // 新增：显示负责Agent
      const stageAgents = stage.agentRoles || stage.agents || [];
      const agentsHTML =
        stageAgents.length > 0
          ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
           负责成员：${stageAgents
             .map(a => {
               if (typeof a === 'object') {
                 return this.escapeHtml(a.role || a.id);
               }
               return this.escapeHtml(a);
             })
             .join('、')}
         </div>`
          : '';

      // 新增：显示预期交付物
      const outputsDetailed = Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : [];
      const outputs = stage.outputs || [];
      const outputsHTML =
        outputsDetailed.length > 0 || outputs.length > 0
          ? `<div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
           预期交付物：${(outputsDetailed.length > 0 ? outputsDetailed : outputs)
             .map(o => {
               if (typeof o === 'string') {
                 return this.escapeHtml(o);
               }
               const name = this.escapeHtml(o.name || o.id || '未命名交付物');
               const templates =
                 Array.isArray(o.promptTemplates) && o.promptTemplates.length > 0
                   ? `（模板：${o.promptTemplates.map(p => this.escapeHtml(p)).join('，')}）`
                   : '';
               return `${name}${templates}`;
             })
             .join('、')}
         </div>`
          : '';
      const expectedDeliverables = this.getExpectedDeliverables(stage, definition);
      const selectedDeliverables = this.getStageSelectedDeliverables(stageId, expectedDeliverables);
      const selectedSet = new Set(selectedDeliverables);
      const hasArtifacts = Array.isArray(stage?.artifacts) && stage.artifacts.length > 0;
      const allowSupplementSelection =
        stage.status === 'completed' ||
        stage.status === 'active' ||
        stage.status === 'in_progress' ||
        hasArtifacts ||
        (Array.isArray(stage.executingArtifactTypes) && stage.executingArtifactTypes.length > 0);
      const missingDeliverables = this.getMissingDeliverables(stage, definition);
      const isExecuting = stage.status === 'active' || stage.status === 'in_progress';
      const isCompleted = stage.status === 'completed';
      const showSupplementAction = isExecuting || (isCompleted && missingDeliverables.length > 0);
      const canSupplement =
        allowSupplementSelection &&
        (selectedDeliverables.length > 0 || expectedDeliverables.length > 0);
      const isSelectionLocked =
        (stage.status !== 'pending' && !allowSupplementSelection) ||
        (project?.status === 'in_progress' && !allowSupplementSelection);
      const deliverableChecklistHTML =
        expectedDeliverables.length > 0
          ? `
      <div class="project-deliverable-checklist ${isSelectionLocked ? 'is-locked' : ''}" ${isSelectionLocked ? 'title="已开始执行，交付物选择已锁定"' : ''}>
        <div class="project-deliverable-checklist-title">输出交付物（可选）</div>
        <div class="project-deliverable-checklist-list">
            ${expectedDeliverables
              .map((item, index) => {
                const id = item.id || item.key || `deliverable-${index}`;
                const encodedId = encodeURIComponent(id);
                const label = this.escapeHtml(item.label || item.id || id);
                const isChecked = selectedSet.has(id);
                const artifact = this.findArtifactForDeliverable(stage?.artifacts || [], item);
                const disableBecauseGenerated = Boolean(artifact);
                const executingTypeKeys = new Set(
                  (stage?.executingArtifactTypes || [])
                    .map(value => this.normalizeDeliverableKey(value))
                    .filter(Boolean)
                );
                const stageIsGenerating =
                  stage?.status === 'active' || stage?.status === 'in_progress';
                const itemKeys = [id, item?.key, item?.label]
                  .map(value => this.normalizeDeliverableKey(value))
                  .filter(Boolean);
                const isGeneratingTarget =
                  executingTypeKeys.size > 0
                    ? itemKeys.some(key => executingTypeKeys.has(key))
                    : isChecked && stageIsGenerating;
                const disableBecauseGenerating = isGeneratingTarget;
                const forceChecked =
                  isChecked || disableBecauseGenerated || disableBecauseGenerating;
                const checked = forceChecked ? 'checked' : '';
                const supplementingTypes = new Set(
                  (stage?.supplementingDeliverableTypes || [])
                    .map(value => this.normalizeDeliverableKey(value))
                    .filter(Boolean)
                );
                const isSupplementing = supplementingTypes.has(this.normalizeDeliverableKey(id));
                const lockHint = disableBecauseGenerating
                  ? 'title="交付物生成中，暂不可取消勾选"'
                  : '';
                const lockStyle = disableBecauseGenerating
                  ? 'style="opacity: 0.55; cursor: not-allowed;"'
                  : '';
                const templates = Array.isArray(item.promptTemplates) ? item.promptTemplates : [];
                const missingTemplates = Array.isArray(item.missingPromptTemplates)
                  ? item.missingPromptTemplates
                  : [];
                const templateLabel =
                  templates.length > 0
                    ? `模板：${templates.map(t => this.escapeHtml(t)).join('，')}`
                    : '';
                const missingLabel =
                  missingTemplates.length > 0
                    ? `缺失模板：${missingTemplates.map(t => this.escapeHtml(t)).join('，')}`
                    : '';
                const meta =
                  templateLabel || missingLabel
                    ? `<div class="project-deliverable-checklist-meta">${templateLabel}${templateLabel && missingLabel ? '｜' : ''}${missingLabel}</div>`
                    : '';
                return `
              <label class="project-deliverable-checklist-item" ${lockHint} ${lockStyle}>
                <input class="project-deliverable-checklist-input" type="checkbox" ${checked} ${isSelectionLocked || disableBecauseGenerated || isSupplementing || disableBecauseGenerating ? 'disabled' : ''} onchange="projectManager.toggleStageDeliverable('${stageId}', '${encodedId}', this.checked)">
                <span class="project-deliverable-checklist-label">${label}</span>
                ${meta}
              </label>
            `;
              })
              .join('')}
        </div>
        ${
          showSupplementAction
            ? `<div style="margin-top: 6px; width: 100%;">
                 <button class="btn-secondary project-deliverable-supplement-action" style="width: 100%;" ${canSupplement ? '' : 'disabled title="请选择交付物后再生成"'} onclick="projectManager.generateAdditionalDeliverables('${project.id}', '${stage.id}')">追加生成</button>
               </div>`
            : ''
        }
      </div>
    `
          : '';
      const deliverableStatusHTML = this.renderDeliverableStatusPanel(
        stage,
        expectedDeliverables,
        selectedDeliverables,
        project.id
      );
      const missingHTML =
        missingDeliverables.length > 0
          ? `<div style="margin-top: 8px; font-size: 12px; color: #b45309;">
           缺失交付物（${missingDeliverables.length}）：${missingDeliverables.map(name => this.escapeHtml(name)).join('、')}
         </div>`
          : '';

      const stageStatusLabel =
        stage.status === 'pending' && hasArtifacts
          ? '已生成'
          : this.getStageStatusLabel(stage.status || 'pending');

      container.innerHTML = `
        <div class="project-stage-split">
            <div class="project-stage-left">
                <div class="project-stage-meta-row">
                    <div>
                        <div class="project-stage-title">${stage.name || stage.id}</div>
                        <div class="project-stage-sub">状态：${stageStatusLabel}</div>
                        ${dependencyHTML}
                        ${agentsHTML}
                        ${outputsHTML}
                        ${missingHTML}
                        ${deliverableChecklistHTML}
                        ${stage.status !== 'pending' || hasArtifacts ? deliverableStatusHTML : ''}
                    </div>
                    ${actionHTML}
                </div>
                <div class="project-stage-deliverables">
                    ${leftArtifactsHTML || '<div class="project-panel-empty">暂无交付物</div>'}
                </div>
                ${humanPanelHTML}
            </div>
            <div class="project-stage-right">
                <div class="project-stage-tabs">
                    <button class="project-deliverable-tab ${tab === 'document' ? 'active' : ''}" data-tab="document" onclick="projectManager.switchDeliverableTab('${stageId}', 'document')">文档</button>
                    <button class="project-deliverable-tab ${tab === 'code' ? 'active' : ''}" data-tab="code" onclick="projectManager.switchDeliverableTab('${stageId}', 'code')">代码</button>
                    <button class="project-deliverable-tab ${tab === 'preview' ? 'active' : ''}" data-tab="preview" onclick="projectManager.switchDeliverableTab('${stageId}', 'preview')">预览</button>
                </div>
                <div id="projectDeliverableContent" class="project-deliverable-content"></div>
            </div>
        </div>
    `;

      this.renderDeliverableContent(stageId, selectedArtifact, tab);
    },
    renderStageAction(project, stage) {
      const workflowReady = Boolean(window.workflowExecutor);

      // 检查依赖阶段是否完成
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

      const hasArtifacts = Array.isArray(stage?.artifacts) && stage.artifacts.length > 0;

      if (stage.status === 'pending') {
        if (hasArtifacts) {
          return '';
        }
        if (project?.status === 'in_progress') {
          return '<button class="btn-secondary" disabled>执行中...</button>';
        }

        // 如果有未完成的依赖，禁用按钮并显示提示
        if (unmetDependencies.length > 0) {
          const tooltip = `依赖阶段未完成：${unmetDependencies.join('、')}`;
          return `<button class="btn-secondary" disabled title="${tooltip}">依赖未满足</button>`;
        }

        return workflowReady
          ? `<button class="btn-primary" onclick="projectManager.startStageWithSelection('${project.id}', '${stage.id}')">开始执行</button>`
          : '<button class="btn-secondary" disabled title="工作流执行器未就绪">开始执行</button>';
      }
      if (stage.status === 'active') {
        return '<button class="btn-secondary" disabled>执行中...</button>';
      }
      return '';
    },
    renderWorkflowSteps(stages, selectedStageId) {
      return stages
        .map(stage => {
          const definition = window.workflowExecutor?.getStageDefinition(stage.id, stage);
          const isSelected = stage.id === selectedStageId;
          const statusClass = `status-${stage.status || 'pending'}`;
          const selectedClass = isSelected ? 'selected' : '';

          // 状态图标
          const statusIcon =
            {
              pending: '⏸️',
              active: '⚡',
              completed: '✅'
            }[stage.status] || '📋';

          return `
        <div class="workflow-step ${statusClass} ${selectedClass}"
             data-stage-id="${stage.id}"
             onclick="projectManager.selectStage('${stage.id}')">
          <div class="workflow-step-icon">
            <span>${definition?.icon || '📋'}</span>
            <span class="workflow-step-status">${statusIcon}</span>
          </div>
          <div class="workflow-step-title">${stage.name || stage.id}</div>
          <div class="workflow-step-connector"></div>
        </div>
      `;
        })
        .join('');
    },
    renderStageDetailSection(project, stage) {
      const definition = window.workflowExecutor?.getStageDefinition(stage.id, stage);
      const displayArtifacts = this.getDisplayArtifacts(stage);
      const effectiveStage = {
        ...stage,
        artifacts: displayArtifacts
      };
      const hasArtifacts = displayArtifacts.length > 0;
      const statusText =
        stage.status === 'pending' && hasArtifacts
          ? '已生成'
          : this.getStageStatusLabel(stage.status || 'pending');
      const statusColor =
        {
          pending: '#9ca3af',
          active: '#3b82f6',
          completed: '#10b981'
        }[stage.status] || '#9ca3af';

      // 渲染Agent列表
      const agentsHTML =
        (stage.agents || []).length > 0
          ? `
      <div class="workflow-stage-agents">
        <div class="workflow-stage-agents-title">
          <span>🤖</span>
          <span>负责数字员工</span>
        </div>
        <div class="workflow-stage-agents-list">
          ${(stage.agents || [])
            .map(agentType => {
              const agentDef = this.getAgentDefinition(agentType);
              return `
              <div class="workflow-stage-agent-tag">
                <span>${agentDef?.icon || '👤'}</span>
                <span>${agentDef?.name || agentType}</span>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `
          : '';
      const repairNoteHTML = stage.repairNote
        ? `
      <div style="margin-top: 10px; padding: 8px 12px; background: #fef3c7; border-radius: 8px; border-left: 3px solid #f59e0b; font-size: 12px; color: #92400e;">
        ${this.escapeHtml(stage.repairNote)}
      </div>
    `
        : '';

      const expectedDeliverables = this.getExpectedDeliverables(stage, definition);
      const selectedDeliverables = this.getStageSelectedDeliverables(
        stage.id,
        expectedDeliverables
      );
      const selectedSet = new Set(selectedDeliverables);
      const allowSupplementSelection =
        stage.status === 'completed' ||
        stage.status === 'active' ||
        stage.status === 'in_progress' ||
        hasArtifacts ||
        (Array.isArray(stage.executingArtifactTypes) && stage.executingArtifactTypes.length > 0);
      const missingDeliverables = this.getMissingDeliverables(effectiveStage, definition);
      const isExecuting = stage.status === 'active' || stage.status === 'in_progress';
      const isCompleted = stage.status === 'completed';
      const showSupplementAction = isExecuting || (isCompleted && missingDeliverables.length > 0);
      const canSupplement =
        allowSupplementSelection &&
        (selectedDeliverables.length > 0 || expectedDeliverables.length > 0);
      const isSelectionLocked = stage.status !== 'pending' && !allowSupplementSelection;
      const deliverableChecklistHTML =
        expectedDeliverables.length > 0
          ? `
      <div class="project-deliverable-checklist ${isSelectionLocked ? 'is-locked' : ''}" ${isSelectionLocked ? 'title="已开始执行，交付物选择已锁定"' : ''}>
        <div class="project-deliverable-checklist-title">输出交付物（可选）</div>
        <div class="project-deliverable-checklist-list">
          ${expectedDeliverables
            .map((item, index) => {
              const id = item.id || item.key || `deliverable-${index}`;
              const encodedId = encodeURIComponent(id);
              const label = this.escapeHtml(item.label || item.id || id);
              const isChecked = selectedSet.has(id);
              const artifact = this.findArtifactForDeliverable(displayArtifacts, item);
              const disableBecauseGenerated = Boolean(artifact);
              const executingTypeKeys = new Set(
                (stage?.executingArtifactTypes || [])
                  .map(value => this.normalizeDeliverableKey(value))
                  .filter(Boolean)
              );
              const stageIsGenerating =
                stage?.status === 'active' || stage?.status === 'in_progress';
              const itemKeys = [id, item?.key, item?.label]
                .map(value => this.normalizeDeliverableKey(value))
                .filter(Boolean);
              const isGeneratingTarget =
                executingTypeKeys.size > 0
                  ? itemKeys.some(key => executingTypeKeys.has(key))
                  : isChecked && stageIsGenerating;
              const disableBecauseGenerating = isGeneratingTarget;
              const forceChecked = isChecked || disableBecauseGenerated || disableBecauseGenerating;
              const checked = forceChecked ? 'checked' : '';
              const supplementingTypes = new Set(
                (stage?.supplementingDeliverableTypes || [])
                  .map(value => this.normalizeDeliverableKey(value))
                  .filter(Boolean)
              );
              const isSupplementing = supplementingTypes.has(this.normalizeDeliverableKey(id));
              const lockHint = disableBecauseGenerating
                ? 'title="交付物生成中，暂不可取消勾选"'
                : '';
              const lockStyle = disableBecauseGenerating
                ? 'style="opacity: 0.55; cursor: not-allowed;"'
                : '';
              return `
              <label class="project-deliverable-checklist-item" ${lockHint} ${lockStyle}>
                <input class="project-deliverable-checklist-input" type="checkbox" ${checked} ${isSelectionLocked || disableBecauseGenerated || isSupplementing || disableBecauseGenerating ? 'disabled' : ''} onchange="projectManager.toggleStageDeliverable('${stage.id}', '${encodedId}', this.checked)">
                <span class="project-deliverable-checklist-label">${label}</span>
              </label>
            `;
            })
            .join('')}
        </div>
        ${
          showSupplementAction
            ? `<div style="margin-top: 6px; width: 100%;">
                 <button class="btn-secondary project-deliverable-supplement-action" style="width: 100%;" ${canSupplement ? '' : 'disabled title="请选择交付物后再生成"'} onclick="projectManager.generateAdditionalDeliverables('${project.id}', '${stage.id}')">追加生成</button>
               </div>`
            : ''
        }
      </div>
    `
          : '';

      // 渲染预期交付物
      const expectedArtifactsHTML =
        definition?.expectedArtifacts?.length > 0
          ? `
      <div class="workflow-stage-artifacts">
        <div class="workflow-stage-artifacts-title">
          <span>📋</span>
          <span>预期交付物</span>
        </div>
        <div class="workflow-stage-artifacts-grid">
          ${definition.expectedArtifacts
            .map(artifactType => {
              const artifactDef = this.getArtifactTypeDefinition(artifactType);
              return `
              <div class="workflow-stage-artifact-card" style="opacity: 0.6; cursor: default;">
                <span class="workflow-stage-artifact-icon">${artifactDef?.icon || '📄'}</span>
                <div class="workflow-stage-artifact-info">
                  <div class="workflow-stage-artifact-name">${artifactDef?.name || artifactType}</div>
                  <div class="workflow-stage-artifact-type">待生成</div>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `
          : '';

      const sortedArtifacts = displayArtifacts
        .map(artifact => ({
          ...artifact,
          type: artifact.type || 'document'
        }))
        .slice()
        .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
      // 渲染实际交付物（已生成交付物）
      const actualArtifactsHTML =
        sortedArtifacts.length > 0
          ? `
      <div class="workflow-stage-artifacts">
        <div class="workflow-stage-artifacts-title">
          <span>📦</span>
          <span>${stage.status === 'completed' ? '最终交付物' : '已生成交付物'} (${sortedArtifacts.length})</span>
        </div>
        <div class="workflow-stage-artifacts-grid">
          ${sortedArtifacts
            .map(artifact => {
              const icon = this.getArtifactIcon(artifact.type);
              const typeLabel = this.getArtifactTypeLabel(artifact);
              const canDelete = !artifact.assembledFromArtifactIds;
              return `
              <div class="workflow-stage-artifact-card"
                   onclick="projectManager.openArtifactPreviewPanel('${project.id}', '${stage.id}', '${artifact.id}')">
                <span class="workflow-stage-artifact-icon">${icon}</span>
                <div class="workflow-stage-artifact-info">
                  <div class="workflow-stage-artifact-name">${this.escapeHtml(artifact.name || artifact.fileName || '未命名')}</div>
                  <div class="workflow-stage-artifact-type">${typeLabel}</div>
                </div>
                ${
                  canDelete
                    ? `<button
                  class="btn-secondary workflow-artifact-delete"
                  style="margin-left: 8px; padding: 2px 8px; font-size: 11px;"
                  onclick="event.stopPropagation(); projectManager.deleteGeneratedDeliverable('${project.id}', '${stage.id}', '${artifact.id}')"
                  title="删除交付物"
                >删除</button>`
                    : ''
                }
              </div>
            `;
            })
            .join('')}
        </div>
      </div>
    `
          : '';
      const deliverableStatusHTML = this.renderDeliverableStatusPanel(
        effectiveStage,
        expectedDeliverables,
        selectedDeliverables,
        project.id
      );

      // 操作按钮
      let actionsHTML = '';
      if (stage.status === 'pending') {
        if (!hasArtifacts) {
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

          const isBlocked = unmetDependencies.length > 0;
          const workflowReady = Boolean(window.workflowExecutor);
          const blockedReason = isBlocked ? `依赖阶段未完成：${unmetDependencies.join('、')}` : '';

          if (blockedReason) {
            actionsHTML = `
          <button class="btn-secondary" disabled title="${blockedReason}" style="opacity: 0.5;">
            🔒 依赖未满足
          </button>
        `;
          } else if (workflowReady) {
            actionsHTML = `
          <button class="btn-primary" onclick="projectManager.startStageWithSelection('${project.id}', '${stage.id}', true)">
            ▶️ 开始执行
          </button>
        `;
          }
        }
      } else if (stage.status === 'completed') {
        // 已完成阶段不显示按钮，用户可以直接点击交付物卡片查看详情
        actionsHTML = '';
      } else if (stage.status === 'active') {
        actionsHTML = `
        <div style="display: flex; align-items: center; gap: 8px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
          <div style="width: 16px; height: 16px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span style="font-size: 14px; font-weight: 500; color: #3b82f6;">正在执行中...</span>
        </div>
      `;
      }

      return `
      <div class="workflow-stage-detail ${stage.id === this.currentStageId ? 'active' : ''}"
           data-stage-id="${stage.id}">
        <div class="workflow-stage-detail-header">
          <div class="workflow-stage-detail-title">
            <span style="font-size: 36px;">${definition?.icon || '📋'}</span>
            <div>
              <h3>${definition?.name || stage.name}</h3>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">${definition?.description || ''}</p>
            </div>
          </div>
          <div class="workflow-stage-detail-badge" style="background: ${statusColor};">
            ${statusText}
          </div>
        </div>
        <div class="workflow-stage-detail-content">
          ${agentsHTML}
          ${repairNoteHTML}
          ${deliverableChecklistHTML}
          ${stage.status === 'pending' && !hasArtifacts ? expectedArtifactsHTML : ''}
          ${stage.status !== 'pending' || hasArtifacts ? deliverableStatusHTML : ''}
          ${actualArtifactsHTML}
        </div>
        ${actionsHTML ? `<div class="workflow-stage-detail-actions">${actionsHTML}</div>` : ''}
      </div>
    `;
    }
  };

  window.projectManagerPanelRenderer = panelRenderer;
})();
