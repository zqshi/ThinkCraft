/**
 * ProjectManager deliverables split module.
 * Extracts deliverable selection/progress/retry logic from project-manager.js.
 */
(function () {
  const deliverablesLogger = window.createLogger
    ? window.createLogger('ProjectDeliverables')
    : console;

  const api = {
    notify(message, level = 'info') {
      const text = String(message || '').trim();
      if (!text) {
        return;
      }
      if (window.modalManager?.alert) {
        window.modalManager.alert(text, level);
        return;
      }
      if (window.ErrorHandler?.showToast) {
        window.ErrorHandler.showToast(text, level);
        return;
      }
      if (typeof window.alert === 'function') {
        window.alert(text);
      }
    },

    isValidGeneratedArtifact(artifact) {
      if (!artifact || typeof artifact !== 'object') {
        return false;
      }
      const status = String(artifact.status || '').toLowerCase();
      if (status === 'error' || status === 'failed') {
        return false;
      }
      const contentReady =
        typeof artifact.content === 'string' && artifact.content.trim().length > 0;
      const fileReady =
        (typeof artifact.downloadUrl === 'string' && artifact.downloadUrl.trim().length > 0) ||
        (typeof artifact.relativePath === 'string' && artifact.relativePath.trim().length > 0);
      const doneByStatus = status === 'completed' || status === 'done' || status === 'success';
      return contentReady || fileReady || doneByStatus;
    },

    normalizeDeliverableKey(value) {
      if (!value || typeof value !== 'string') {
        return '';
      }
      return value.trim().toLowerCase();
    },

    orderTypesByDependency(types = []) {
      const ordered = Array.isArray(types) ? [...types] : [];
      const normalize = value => api.normalizeDeliverableKey(value);
      const prdIndex = ordered.findIndex(type => normalize(type) === 'prd');
      const strategyIndex = ordered.findIndex(type => normalize(type) === 'strategy-doc');
      if (prdIndex !== -1 && strategyIndex !== -1 && prdIndex > strategyIndex) {
        const [prdType] = ordered.splice(prdIndex, 1);
        ordered.splice(strategyIndex, 0, prdType);
      }
      return ordered;
    },

    getExpectedDeliverables(pm, stage, definition) {
      if (!stage) {
        return [];
      }
      const outputsDetailed = Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : [];
      const outputs = Array.isArray(stage.outputs) ? stage.outputs : [];
      let expected = [];
      if (outputsDetailed.length > 0) {
        expected = outputsDetailed;
      } else if (outputs.length > 0) {
        expected = outputs;
      } else if (definition?.expectedArtifacts?.length > 0) {
        expected = definition.expectedArtifacts;
      }

      return expected.map(item => {
        if (typeof item === 'string') {
          const resolvedId = pm.normalizeArtifactTypeId(item) || item;
          const def = pm.getArtifactTypeDefinition(resolvedId);
          return {
            id: resolvedId,
            key: api.normalizeDeliverableKey(resolvedId),
            label: def?.name || resolvedId,
            promptTemplates: [],
            missingPromptTemplates: []
          };
        }
        const idRaw = item?.id || item?.type || item?.key || item?.name || '';
        const resolvedId =
          pm.normalizeArtifactTypeId(idRaw) || pm.normalizeArtifactTypeId(item?.name) || idRaw;
        const label = item?.name || item?.label || item?.id || item?.type || '未命名交付物';
        return {
          id: resolvedId,
          key: api.normalizeDeliverableKey(resolvedId || idRaw),
          label,
          promptTemplates: Array.isArray(item?.promptTemplates) ? item.promptTemplates : [],
          missingPromptTemplates: Array.isArray(item?.missingPromptTemplates)
            ? item.missingPromptTemplates
            : []
        };
      });
    },

    resolveSelectedArtifactTypes(pm, stage, expectedDeliverables = [], selectedIds = []) {
      const artifactTypes = Array.isArray(stage?.artifactTypes) ? stage.artifactTypes : [];
      if (artifactTypes.length === 0) {
        const resolved = (selectedIds || [])
          .map(value => pm.normalizeArtifactTypeId(value))
          .filter(Boolean);
        if (resolved.length > 0) {
          return Array.from(new Set(resolved));
        }
      }

      const normalizedMap = new Map();
      artifactTypes.forEach(type => {
        const normalized = api.normalizeDeliverableKey(type);
        if (normalized) {
          normalizedMap.set(normalized, type);
        }
        const def = pm.getArtifactTypeDefinition(type);
        if (def?.name) {
          const defKey = api.normalizeDeliverableKey(def.name);
          if (defKey && !normalizedMap.has(defKey)) {
            normalizedMap.set(defKey, type);
          }
        }
      });

      const selectedKeys = new Set(
        (selectedIds || []).map(value => api.normalizeDeliverableKey(value)).filter(Boolean)
      );
      const resolved = [];

      const pushResolved = value => {
        const normalizedId = pm.normalizeArtifactTypeId(value);
        if (normalizedId) {
          resolved.push(normalizedId);
          return;
        }
        const key = api.normalizeDeliverableKey(value);
        if (key && normalizedMap.has(key)) {
          resolved.push(normalizedMap.get(key));
        }
      };

      expectedDeliverables.forEach(item => {
        const keys = [item?.id, item?.key, item?.label].filter(Boolean);
        const matchesSelected = keys.some(key =>
          selectedKeys.has(api.normalizeDeliverableKey(key))
        );
        if (!matchesSelected) {
          return;
        }
        keys.forEach(pushResolved);
      });

      if (resolved.length === 0) {
        selectedKeys.forEach(key => {
          const type = normalizedMap.get(key);
          if (type) {
            resolved.push(type);
          }
        });
      }

      return Array.from(new Set(resolved));
    },

    findArtifactForDeliverable(pm, artifacts = [], deliverable = {}) {
      const keys = new Set();
      const pushKey = val => {
        const key = api.normalizeDeliverableKey(val);
        if (key) {
          keys.add(key);
        }
      };
      pushKey(deliverable.id);
      pushKey(deliverable.key);
      pushKey(deliverable.label);

      for (const artifact of artifacts) {
        if (!artifact) {
          continue;
        }
        const typeDef = pm.getArtifactTypeDefinition(artifact.type);
        const artifactKeys = [
          artifact.type,
          artifact.name,
          artifact.fileName,
          artifact.id,
          typeDef?.name
        ]
          .map(value => api.normalizeDeliverableKey(value))
          .filter(Boolean);
        if (artifactKeys.some(key => keys.has(key))) {
          return artifact;
        }
      }
      return null;
    },

    getDeliverableStatusItems(pm, stage, expectedDeliverables = [], selectedDeliverables = []) {
      const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
      const hasArtifacts = artifacts.length > 0;
      const selectedSet = new Set((selectedDeliverables || []).filter(Boolean));
      const selectedNormalizedSet = new Set(
        (selectedDeliverables || [])
          .map(value => api.normalizeDeliverableKey(value))
          .filter(Boolean)
      );
      const executingKeys = new Set(
        (stage?.executingArtifactTypes || [])
          .map(val => api.normalizeDeliverableKey(val))
          .filter(Boolean)
      );
      const runMap =
        stage?.executionRuns && typeof stage.executionRuns === 'object' ? stage.executionRuns : {};
      const resolveRunInfo = item => {
        const keys = [item?.id, item?.key, item?.label]
          .map(value => api.normalizeDeliverableKey(value))
          .filter(Boolean);
        const matchedType = Object.keys(runMap).find(type =>
          keys.includes(api.normalizeDeliverableKey(type))
        );
        if (!matchedType) {
          return { status: '', run: null };
        }
        const run = runMap?.[matchedType] || null;
        return {
          status: String(run?.status || '').toLowerCase(),
          run
        };
      };

      return expectedDeliverables.map(item => {
        const id = item.id || item.key || item.label || '';
        const label = item.label || item.id || item.key || '未命名交付物';
        const itemKeys = [item?.id, item?.key, item?.label, id]
          .map(value => api.normalizeDeliverableKey(value))
          .filter(Boolean);
        const selected =
          selectedSet.has(id) || itemKeys.some(key => selectedNormalizedSet.has(key));
        const artifact = api.findArtifactForDeliverable(pm, artifacts, item);
        const runInfo = resolveRunInfo(item);
        const runStatus = runInfo.status;
        const run = runInfo.run;
        const runMessage = String(
          run?.error?.message || run?.error?.code || run?.statusMessage || ''
        ).trim();
        let status = 'pending';
        if (artifact) {
          status = 'generated';
        } else if (runStatus === 'blocked') {
          status = 'blocked';
        } else if (runStatus === 'failed') {
          status = 'failed';
        } else if (runStatus === 'queued') {
          status = 'queued';
        } else if (runStatus === 'running') {
          status = 'generating';
        } else if (!selected) {
          status = 'unselected';
        } else if (stage.status === 'pending' && hasArtifacts) {
          status = 'missing';
        } else if (stage.status === 'active' || stage.status === 'in_progress') {
          if (executingKeys.size === 0) {
            status = 'generating';
          } else {
            const itemKey = api.normalizeDeliverableKey(id);
            status = itemKey && executingKeys.has(itemKey) ? 'generating' : 'missing';
          }
        } else if (stage.status === 'completed') {
          status = 'missing';
        }
        return { id, label, status, selected, artifact, runStatus, runMessage };
      });
    },

    getDeliverableProgressSummary(pm, stage, expectedDeliverables = [], selectedDeliverables = []) {
      const items = api.getDeliverableStatusItems(
        pm,
        stage,
        expectedDeliverables,
        selectedDeliverables
      );
      const selectedItems = items.filter(item => item.selected);
      const selectedCount = selectedItems.length;
      const generatedCount = selectedItems.filter(item => item.status === 'generated').length;
      const generatingCount = selectedItems.filter(item => item.status === 'generating').length;
      return {
        items,
        selectedItems,
        selectedCount,
        generatedCount,
        generatingCount,
        totalCount: expectedDeliverables.length
      };
    },

    renderDeliverableStatusPanel(pm, stage, expectedDeliverables, selectedDeliverables, projectId) {
      if (!expectedDeliverables || expectedDeliverables.length === 0) {
        return '';
      }
      const progress = api.getDeliverableProgressSummary(
        pm,
        stage,
        expectedDeliverables,
        selectedDeliverables
      );
      const visibleItems = (progress.items || []).filter(item => {
        if (item.selected) {
          return true;
        }
        if (item.status === 'generated') {
          return true;
        }
        return ['failed', 'blocked', 'queued', 'generating'].includes(item.status);
      });
      if (visibleItems.length === 0) {
        return '';
      }
      const statusMap = {
        generated: '已生成',
        generating: '生成中',
        queued: '排队中',
        blocked: '依赖阻塞',
        failed: '生成失败',
        pending: '待执行',
        unselected: '未选择',
        missing: '未生成'
      };
      const visibleGeneratedCount = visibleItems.filter(item => item.status === 'generated').length;
      const progressPercent =
        visibleItems.length > 0
          ? Math.min(100, Math.round((visibleGeneratedCount / visibleItems.length) * 100))
          : 0;
      return `
      <div class="project-deliverable-status">
        <div class="project-deliverable-status-header">
          <div class="project-deliverable-status-title">交付物进度</div>
          <div class="project-deliverable-status-summary">已生成 ${visibleGeneratedCount} / 显示 ${visibleItems.length}</div>
        </div>
        <div class="project-deliverable-progress">
          <div class="project-deliverable-progress-bar" style="width: ${progressPercent}%;"></div>
        </div>
        <div class="project-deliverable-status-list">
          ${visibleItems
    .map(item => {
      const statusLabel = statusMap[item.status] || statusMap.pending;
      const runHint =
                item.runMessage && (item.status === 'failed' || item.status === 'blocked')
                  ? `<div class="project-deliverable-status-meta" style="color:#b45309;">${pm.escapeHtml(item.runMessage)}</div>`
                  : '';
      const retryBtn =
                item.status === 'missing' || item.status === 'failed' || item.status === 'blocked'
                  ? `<button class="btn-secondary" onclick="event.stopPropagation(); projectManager.retryStageDeliverable('${projectId}', '${stage.id}', '${pm.escapeHtml(item.id)}')" style="padding: 4px 8px; font-size: 11px;">重试</button>`
                  : '';
      return `
              <div class="project-deliverable-status-item status-${item.status}">
                <div class="project-deliverable-status-info">
                  <div class="project-deliverable-status-name">${pm.escapeHtml(item.label)}</div>
                  <div class="project-deliverable-status-meta">${statusLabel}</div>
                  ${runHint}
                </div>
                <div class="project-deliverable-status-actions">
                  <span class="project-deliverable-status-pill">${statusLabel}</span>
                  ${retryBtn}
                </div>
              </div>`;
    })
    .join('')}
        </div>
      </div>`;
    },

    async generateAdditionalDeliverables(pm, projectId, stageId) {
      try {
        const project = pm.currentProject || (await pm.getProject(projectId).catch(() => null));
        const stage = project?.workflow?.stages?.find(s => s.id === stageId);
        if (!stage) {
          api.notify('未找到阶段信息', 'warning');
          return;
        }
        if (!window.workflowExecutor) {
          api.notify('工作流执行器未就绪', 'warning');
          return;
        }

        const expected = api.getExpectedDeliverables(pm, stage, null);
        if (!expected.length) {
          api.notify('该阶段未配置可追加的交付物', 'warning');
          return;
        }

        const existingTypes = new Set(
          (stage.artifacts || [])
            .filter(artifact => api.isValidGeneratedArtifact(artifact))
            .map(artifact => api.normalizeDeliverableKey(artifact?.type))
            .filter(Boolean)
        );
        const inferMissingFromExpected = expected.filter(
          item => !api.findArtifactForDeliverable(pm, stage.artifacts || [], item)
        );
        const inferredSelectedIds = inferMissingFromExpected
          .map(item => item.id || item.key)
          .filter(Boolean);
        const inferredMissingTypes = api.orderTypesByDependency(
          inferMissingFromExpected
            .map(item => pm.normalizeArtifactTypeId(item.id || item.key || item.label))
            .filter(Boolean)
        );

        let selected = api.getStageSelectedDeliverables(pm, stageId, expected);
        if (!selected.length && inferredSelectedIds.length > 0) {
          selected = inferredSelectedIds;
        }
        const dependencyResult = await api.resolveDependenciesWithConfirm(
          pm,
          stage,
          expected,
          selected
        );
        if (!dependencyResult.confirmed) {
          return;
        }
        selected = dependencyResult.selectedIds;

        let resolvedArtifactTypes = api.orderTypesByDependency(
          api.resolveSelectedArtifactTypes(pm, stage, expected, selected)
        );
        if (resolvedArtifactTypes.length === 0 && inferredMissingTypes.length > 0) {
          resolvedArtifactTypes = inferredMissingTypes;
        }
        if (resolvedArtifactTypes.length === 0) {
          api.notify('未找到可追加生成的交付物，请先勾选或检查阶段配置', 'warning');
          return;
        }

        const missingTypes = resolvedArtifactTypes.filter(
          type => !existingTypes.has(api.normalizeDeliverableKey(type))
        );
        const executingTypes = new Set(
          (stage.executingArtifactTypes || [])
            .map(type => api.normalizeDeliverableKey(type))
            .filter(Boolean)
        );
        const hasExecutingSelected = resolvedArtifactTypes.some(type =>
          executingTypes.has(api.normalizeDeliverableKey(type))
        );
        if (!api.validateStrategyDocDependency(pm, project, missingTypes)) {
          return;
        }
        if (!missingTypes.length) {
          if (hasExecutingSelected) {
            api.notify('已选交付物正在生成中，请稍候', 'info');
            return;
          }
          api.notify('已选交付物均已生成', 'info');
          return;
        }

        stage.selectedDeliverables = selected;
        stage.supplementingDeliverableTypes = missingTypes;
        if (pm.currentProjectId) {
          pm.stageDeliverableSelection[stageId] = selected;
          pm.stageDeliverableSelectionByProject[pm.currentProjectId] = pm.stageDeliverableSelection;
          pm.persistStageDeliverableSelectionStore();
        }
        try {
          await pm.updateProject(projectId, { workflow: project.workflow }, { allowFallback: true });
          pm.refreshProjectPanel(project);
        } catch (error) {
          deliverablesLogger.warn('[ProjectManager] 保存交付物选择失败，继续追加生成', error);
        }

        try {
          await window.workflowExecutor.startStage(projectId, stageId, {
            selectedArtifactTypes: missingTypes,
            mergeArtifacts: true,
            queueWhileExecuting: true
          });
        } finally {
          const updated = await pm.getProject(projectId).catch(() => null);
          if (updated) {
            const nextStage = updated.workflow?.stages?.find(s => s.id === stageId);
            if (nextStage?.supplementingDeliverableTypes) {
              delete nextStage.supplementingDeliverableTypes;
              await pm
                .updateProject(projectId, { workflow: updated.workflow }, { allowFallback: true })
                .catch(() => {});
            }
            pm.refreshProjectPanel(updated);
          }
        }
      } catch (error) {
        deliverablesLogger.error('[ProjectManager] 追加生成失败', error);
        api.notify(`追加生成失败：${error.message || error}`, 'error');
      }
    },

    async regenerateStageDeliverable(pm, projectId, stageId, artifactId) {
      if (!window.workflowExecutor) {
        return window.modalManager?.alert('工作流执行器未就绪', 'warning');
      }
      const project = pm.currentProject || (await pm.getProject(projectId).catch(() => null));
      const stage = project?.workflow?.stages?.find(s => s.id === stageId);
      const artifact = stage?.artifacts?.find(a => a.id === artifactId);
      if (!artifact) {
        return window.modalManager?.alert('未找到对应交付物', 'warning');
      }
      const confirmed = confirm(`确定要重新生成「${artifact.name || artifact.type}」吗？`);
      if (!confirmed) {
        return;
      }
      await window.workflowExecutor.regenerateArtifact(projectId, stageId, artifact);
      const updated = await pm.getProject(projectId).catch(() => null);
      if (updated) {
        pm.refreshProjectPanel(updated);
      }
    },

    async retryStageDeliverable(pm, projectId, stageId, deliverableType) {
      if (!deliverableType) {
        return window.modalManager?.alert('交付物类型缺失，无法重试', 'warning');
      }
      if (!window.workflowExecutor) {
        return window.modalManager?.alert('工作流执行器未就绪', 'warning');
      }
      if (pm.isRetryingDeliverable) {
        return window.modalManager?.alert('正在重试生成，请稍后', 'info');
      }

      pm.isRetryingDeliverable = true;
      const project = pm.currentProject || (await pm.getProject(projectId).catch(() => null));
      const stage = project?.workflow?.stages?.find(s => s.id === stageId);
      const expected = stage ? api.getExpectedDeliverables(pm, stage, null) : [];
      const resolved = api.resolveSelectedArtifactTypes(pm, stage, expected, [deliverableType]);
      let selectedForRetry = resolved.length > 0 ? resolved : [deliverableType];
      const dependencyResult = await api.resolveDependenciesWithConfirm(
        pm,
        stage,
        expected,
        selectedForRetry
      );
      if (!dependencyResult.confirmed) {
        pm.isRetryingDeliverable = false;
        return;
      }
      selectedForRetry = dependencyResult.selectedIds;
      const selectedTypesForRetry = api.orderTypesByDependency(
        api.resolveSelectedArtifactTypes(pm, stage, expected, selectedForRetry)
      );
      if (stage) {
        stage.executingArtifactTypes =
          selectedTypesForRetry.length > 0 ? selectedTypesForRetry : [deliverableType];
        await pm.updateProject(projectId, { workflow: project.workflow }, { allowFallback: true });
      }
      try {
        const artifactType = selectedTypesForRetry[0] || deliverableType;
        if (
          !api.validateStrategyDocDependency(
            pm,
            project,
            selectedTypesForRetry.length > 0 ? selectedTypesForRetry : [artifactType]
          )
        ) {
          return;
        }
        if (
          !artifactType &&
          Array.isArray(stage?.artifactTypes) &&
          stage.artifactTypes.length > 0
        ) {
          return window.modalManager?.alert('未选择有效的交付物类型', 'warning');
        }
        await window.workflowExecutor.startStage(projectId, stageId, {
          selectedArtifactTypes:
            selectedTypesForRetry.length > 0 ? selectedTypesForRetry : [artifactType],
          mergeArtifacts: true,
          silent: true,
          queueWhileExecuting: true
        });
        const updated = await pm.getProject(projectId).catch(() => null);
        if (updated) {
          pm.refreshProjectPanel(updated);
        }
      } finally {
        pm.isRetryingDeliverable = false;
      }
    },

    getMissingDeliverables(pm, stage, definition) {
      const expected = api.getExpectedDeliverables(pm, stage, definition);
      return api.getMissingDeliverablesFromExpected(pm, stage, expected);
    },

    getMissingSelectedDeliverables(pm, stage, definition, selectedIds = []) {
      const expected = api.getExpectedDeliverables(pm, stage, definition);
      if (expected.length === 0) {
        return [];
      }
      const selectedSet = new Set(selectedIds.filter(Boolean));
      const filteredExpected =
        selectedSet.size > 0
          ? expected.filter(item => selectedSet.has(item.id || item.key))
          : expected;
      return api.getMissingDeliverablesFromExpected(pm, stage, filteredExpected);
    },

    getMissingDeliverablesFromExpected(pm, stage, expected = []) {
      if (!expected || expected.length === 0) {
        return [];
      }
      const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
      const actualKeys = new Set();
      artifacts.forEach(artifact => {
        const type = artifact?.type || 'document';
        const typeDef = pm.getArtifactTypeDefinition(type);
        [type, artifact?.name, artifact?.fileName, artifact?.id, typeDef?.name].forEach(val => {
          const key = api.normalizeDeliverableKey(val);
          if (key) {
            actualKeys.add(key);
          }
        });
      });
      const missing = [];
      const seen = new Set();
      expected.forEach(item => {
        const key = api.normalizeDeliverableKey(item.key);
        const labelKey = api.normalizeDeliverableKey(item.label);
        const matched = (key && actualKeys.has(key)) || (labelKey && actualKeys.has(labelKey));
        if (!matched) {
          const label = item.label || item.key || '未命名交付物';
          const labelKeyFinal = api.normalizeDeliverableKey(label);
          if (!seen.has(labelKeyFinal)) {
            missing.push(label);
            seen.add(labelKeyFinal);
          }
        }
      });
      return missing;
    },

    getMissingDeliverablesWithReason(pm, stage, expected = [], selectedIds = []) {
      if (!expected || expected.length === 0) {
        return [];
      }
      const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
      const actualKeys = new Set();
      artifacts.forEach(artifact => {
        const type = artifact?.type || 'document';
        const typeDef = pm.getArtifactTypeDefinition(type);
        [type, artifact?.name, artifact?.fileName, artifact?.id, typeDef?.name].forEach(val => {
          const key = api.normalizeDeliverableKey(val);
          if (key) {
            actualKeys.add(key);
          }
        });
      });
      const selectedSet = new Set((selectedIds || []).filter(Boolean));
      const missing = [];
      const seen = new Set();
      expected.forEach(item => {
        const key = api.normalizeDeliverableKey(item.key);
        const labelKey = api.normalizeDeliverableKey(item.label);
        const matched = (key && actualKeys.has(key)) || (labelKey && actualKeys.has(labelKey));
        if (!matched) {
          const label = item.label || item.key || '未命名交付物';
          const id = item.id || item.key || label;
          const labelKeyFinal = api.normalizeDeliverableKey(label);
          if (!seen.has(labelKeyFinal)) {
            const isSelected = selectedSet.size === 0 ? true : selectedSet.has(id);
            missing.push({ label, reason: isSelected ? '生成失败' : '未勾选' });
            seen.add(labelKeyFinal);
          }
        }
      });
      return missing;
    },

    hasGeneratedPrd(_pm, project) {
      const stages = project?.workflow?.stages || [];
      for (const stage of stages) {
        const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
        for (const artifact of artifacts) {
          const typeKey = api.normalizeDeliverableKey(artifact?.type);
          if (typeKey === 'prd') {
            return true;
          }
          const nameKey = api.normalizeDeliverableKey(artifact?.name);
          if (nameKey === 'prd' || nameKey === '产品需求文档') {
            return true;
          }
        }
      }
      return false;
    },

    validateStrategyDocDependency(pm, project, selectedArtifactTypes = []) {
      const normalized = (selectedArtifactTypes || [])
        .map(type => api.normalizeDeliverableKey(type))
        .filter(Boolean);
      if (!normalized.includes('strategy-doc')) {
        return true;
      }
      const includesPrdThisRun = normalized.includes('prd');
      if (includesPrdThisRun || api.hasGeneratedPrd(pm, project)) {
        return true;
      }
      window.modalManager?.alert('战略设计文档依赖 PRD，请先生成产品需求文档（PRD）', 'warning');
      return false;
    },

    getDeliverableDependenciesByType(artifactType = '') {
      const key = api.normalizeDeliverableKey(artifactType);
      const dependencyMap = {
        prototype: ['ui-design', 'design-spec'],
        'strategy-doc': ['prd']
      };
      return Array.isArray(dependencyMap[key]) ? dependencyMap[key] : [];
    },

    async resolveDependenciesWithConfirm(
      pm,
      stage,
      expectedDeliverables = [],
      selectedIds = []
    ) {
      const selected = Array.isArray(selectedIds) ? [...selectedIds] : [];
      if (!stage || selected.length === 0) {
        return { confirmed: true, selectedIds: selected };
      }
      const selectedTypes = api.resolveSelectedArtifactTypes(
        pm,
        stage,
        expectedDeliverables,
        selected
      );
      const selectedTypeSet = new Set(
        selectedTypes.map(type => api.normalizeDeliverableKey(type)).filter(Boolean)
      );
      const expectedByType = new Map();
      expectedDeliverables.forEach(item => {
        const typeId = pm.normalizeArtifactTypeId(item?.id || item?.key || item?.label);
        const typeKey = api.normalizeDeliverableKey(typeId);
        if (typeKey) {
          expectedByType.set(typeKey, item);
        }
      });

      const toAppend = [];
      for (const type of selectedTypes) {
        const dependencies = api.getDeliverableDependenciesByType(type);
        for (const depType of dependencies) {
          const depKey = api.normalizeDeliverableKey(depType);
          if (!depKey || selectedTypeSet.has(depKey)) {
            continue;
          }
          const depItem = expectedByType.get(depKey);
          if (!depItem) {
            continue;
          }
          const existingArtifact = api.findArtifactForDeliverable(pm, stage.artifacts || [], depItem);
          if (existingArtifact) {
            continue;
          }
          toAppend.push({
            id: depItem.id || depItem.key || depType,
            label: depItem.label || depItem.id || depType
          });
          selectedTypeSet.add(depKey);
        }
      }

      if (toAppend.length === 0) {
        return { confirmed: true, selectedIds: selected };
      }

      const depLabels = toAppend.map(item => item.label).join('、');
      const message = `检测到所选交付物存在依赖项：${depLabels}。\n是否一并生成？`;
      let confirmed = false;
      if (window.modalManager?.confirm) {
        confirmed = await new Promise(resolve => {
          window.modalManager.confirm(
            message,
            () => resolve(true),
            () => resolve(false)
          );
        });
      } else {
        confirmed = window.confirm(message);
      }
      if (!confirmed) {
        return { confirmed: false, selectedIds: selected };
      }

      const selectedSet = new Set(selected);
      toAppend.forEach(item => {
        if (item.id) {
          selectedSet.add(item.id);
        }
      });
      return {
        confirmed: true,
        selectedIds: Array.from(selectedSet)
      };
    },

    getStageSelectedDeliverables(pm, stageId, _expectedDeliverables) {
      const stage = (pm.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
      const expectedIds = Array.isArray(_expectedDeliverables)
        ? new Set(_expectedDeliverables.map(item => item?.id || item?.key).filter(Boolean))
        : null;
      const normalizeSelection = list => {
        const values = Array.isArray(list) ? list.filter(Boolean) : [];
        if (!expectedIds || expectedIds.size === 0) {
          return values;
        }
        return values.filter(id => expectedIds.has(id));
      };

      const stageSelected = normalizeSelection(stage?.selectedDeliverables);
      pm.stageDeliverableSelection[stageId] = Array.isArray(stage?.selectedDeliverables)
        ? stageSelected
        : [];

      const defaults = pm.stageDeliverableSelection[stageId];
      if (pm.currentProjectId) {
        pm.stageDeliverableSelectionByProject[pm.currentProjectId] = pm.stageDeliverableSelection;
        pm.persistStageDeliverableSelectionStore();
      }
      return defaults;
    },

    toggleStageDeliverable(pm, stageId, encodedId, checked) {
      const id = decodeURIComponent(encodedId || '');
      if (!id) {
        return;
      }
      const stage = (pm.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
      const normalizedId = api.normalizeDeliverableKey(id);
      if (!checked && stage) {
        const executingKeys = new Set(
          (stage?.executingArtifactTypes || [])
            .map(value => api.normalizeDeliverableKey(value))
            .filter(Boolean)
        );
        const isGeneratingTarget = normalizedId && executingKeys.has(normalizedId);
        const expected = api.getExpectedDeliverables(pm, stage, null);
        const matchedItem = expected.find(item => {
          const keys = [item?.id, item?.key, item?.label]
            .map(value => api.normalizeDeliverableKey(value))
            .filter(Boolean);
          return normalizedId && keys.includes(normalizedId);
        });
        const hasGeneratedArtifact = Boolean(
          matchedItem && api.findArtifactForDeliverable(pm, stage?.artifacts || [], matchedItem)
        );
        if (isGeneratingTarget || hasGeneratedArtifact) {
          return;
        }
      }
      const allowSupplementSelection =
        stage?.status === 'completed' ||
        stage?.status === 'active' ||
        stage?.status === 'in_progress' ||
        (Array.isArray(stage?.artifacts) && stage.artifacts.length > 0) ||
        (Array.isArray(stage?.executingArtifactTypes) && stage.executingArtifactTypes.length > 0);
      if (
        !stage ||
        (stage.status !== 'pending' && !allowSupplementSelection) ||
        (pm.currentProject?.status === 'in_progress' && !allowSupplementSelection)
      ) {
        return;
      }
      const current = new Set(pm.stageDeliverableSelection[stageId] || []);
      if (checked) {
        current.add(id);
      } else {
        current.delete(id);
      }

      pm.stageDeliverableSelection[stageId] = Array.from(current);
      stage.selectedDeliverables = Array.from(current);
      if (pm.currentProjectId) {
        pm.stageDeliverableSelectionByProject[pm.currentProjectId] = pm.stageDeliverableSelection;
        pm.persistStageDeliverableSelectionStore();
        pm.storageManager?.saveProject?.(pm.currentProject).catch(() => {});
      }
    },

    async deleteGeneratedDeliverable(pm, projectId, stageId, artifactId) {
      if (!window.workflowExecutor) {
        return window.modalManager?.alert('工作流执行器未就绪', 'warning');
      }
      const project = pm.currentProject || (await pm.getProject(projectId).catch(() => null));
      const stage = project?.workflow?.stages?.find(s => s.id === stageId);
      const artifact = stage?.artifacts?.find(a => a.id === artifactId);
      if (!project || !stage || !artifact) {
        return window.modalManager?.alert('未找到待删除交付物', 'warning');
      }
      const confirmed = window.confirm(`确认删除交付物「${artifact.name || artifact.type}」？`);
      if (!confirmed) {
        return;
      }

      try {
        await window.workflowExecutor.deleteArtifact(projectId, artifactId);
      } catch (error) {
        return window.modalManager?.alert(`删除交付物失败：${error.message || error}`, 'error');
      }

      stage.artifacts = (stage.artifacts || []).filter(a => a.id !== artifactId);
      if (stage.executionRuns && typeof stage.executionRuns === 'object' && artifact.type) {
        delete stage.executionRuns[artifact.type];
      }

      const expectedDeliverables = api.getExpectedDeliverables(pm, stage, null);
      const selectedSet = new Set(pm.stageDeliverableSelection[stageId] || []);
      expectedDeliverables.forEach(item => {
        const keys = [item?.id, item?.key, item?.label]
          .map(value => api.normalizeDeliverableKey(value))
          .filter(Boolean);
        const artifactKeys = [artifact?.type, artifact?.name]
          .map(value => api.normalizeDeliverableKey(value))
          .filter(Boolean);
        if (keys.some(key => artifactKeys.includes(key))) {
          const id = item.id || item.key;
          if (id) {
            selectedSet.delete(id);
          }
        }
      });
      const nextSelection = Array.from(selectedSet);
      pm.stageDeliverableSelection[stageId] = nextSelection;
      stage.selectedDeliverables = nextSelection;

      const resetStageRuntimeIfEmpty = targetStage => {
        if (!targetStage) {
          return;
        }
        const remaining = Array.isArray(targetStage.artifacts) ? targetStage.artifacts.length : 0;
        if (remaining > 0) {
          return;
        }
        targetStage.status = 'pending';
        targetStage.startedAt = null;
        targetStage.completedAt = null;
        targetStage.artifactsUpdatedAt = Date.now();
        targetStage.executingArtifactTypes = [];
        targetStage.supplementingDeliverableTypes = [];
        targetStage.executionRuns = {};
        targetStage.executionProbe = null;
        targetStage.repairNote = null;
      };

      // 若该阶段已无交付物，恢复到初始待执行状态，避免仍显示“追加生成”
      resetStageRuntimeIfEmpty(stage);

      // 协同建议中的阶段状态也保持一致
      const suggestionStage = project?.collaborationSuggestion?.stages?.find(s => s.id === stageId);
      if (suggestionStage) {
        suggestionStage.artifacts = Array.isArray(stage.artifacts) ? [...stage.artifacts] : [];
        suggestionStage.selectedDeliverables = Array.isArray(stage.selectedDeliverables)
          ? [...stage.selectedDeliverables]
          : [];
        resetStageRuntimeIfEmpty(suggestionStage);
      }

      // 项目级状态同步回非执行态，避免“开始执行”按钮被 project.status=in_progress 阻断
      const allStages = Array.isArray(project?.workflow?.stages) ? project.workflow.stages : [];
      const hasRunningStages = allStages.some(s =>
        ['active', 'in_progress'].includes(String(s?.status || '').toLowerCase())
      );
      if (!hasRunningStages && project?.status === 'in_progress') {
        project.status = 'active';
      }

      if (pm.currentProjectId) {
        pm.stageDeliverableSelectionByProject[pm.currentProjectId] = pm.stageDeliverableSelection;
        pm.persistStageDeliverableSelectionStore();
      }

      await pm
        .updateProject(
          projectId,
          {
            workflow: project.workflow,
            collaborationSuggestion: project.collaborationSuggestion
          },
          { allowFallback: true }
        )
        .catch(() => {});

      pm.refreshProjectPanel(project);
      window.ErrorHandler?.showToast?.('交付物已删除，可重新勾选后生成', 'success');
    },

    async startStageWithSelection(pm, projectId, stageId, reopen = false) {
      if (!window.workflowExecutor) {
        return window.modalManager?.alert('工作流执行器未就绪', 'warning');
      }
      const stage = (pm.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
      const definition = window.workflowExecutor?.getStageDefinition(stageId, stage);
      const expectedDeliverables = api.getExpectedDeliverables(pm, stage, definition);
      if (expectedDeliverables.length === 0) {
        return window.modalManager?.alert('该阶段未配置可执行交付物，请先检查阶段配置', 'warning');
      }
      let selected = api.getStageSelectedDeliverables(pm, stageId, expectedDeliverables);
      if (expectedDeliverables.length > 0 && selected.length === 0) {
        const msg = '请先勾选需要输出的交付物';
        if (window.modalManager) {
          window.modalManager.alert(msg, 'warning');
        } else {
          alert(msg);
        }
        return;
      }
      const dependencyResult = await api.resolveDependenciesWithConfirm(
        pm,
        stage,
        expectedDeliverables,
        selected
      );
      if (!dependencyResult.confirmed) {
        return;
      }
      selected = dependencyResult.selectedIds;
      const resolvedArtifactTypes = api.orderTypesByDependency(
        api.resolveSelectedArtifactTypes(pm, stage, expectedDeliverables, selected)
      );
      if (resolvedArtifactTypes.length === 0 && selected.length > 0) {
        return window.modalManager?.alert('未选择有效的交付物类型', 'warning');
      }
      if (!api.validateStrategyDocDependency(pm, pm.currentProject, resolvedArtifactTypes)) {
        return;
      }
      if (stage) {
        stage.selectedDeliverables = selected;
        if (resolvedArtifactTypes.length > 0) {
          stage.executingArtifactTypes = resolvedArtifactTypes;
        }
        if (stage.status === 'pending') {
          stage.status = 'active';
          stage.startedAt = stage.startedAt || Date.now();
        }
        if (pm.currentProjectId) {
          pm.stageDeliverableSelection[stageId] = selected;
          pm.stageDeliverableSelectionByProject[pm.currentProjectId] = pm.stageDeliverableSelection;
          pm.persistStageDeliverableSelectionStore();
        }
        pm.refreshProjectPanel(pm.currentProject);
        pm
          .updateProject(projectId, { workflow: pm.currentProject?.workflow }, { allowFallback: true })
          .catch(() => {});
      }
      await window.workflowExecutor.startStage(projectId, stageId, {
        selectedArtifactTypes: resolvedArtifactTypes.length > 0 ? resolvedArtifactTypes : selected,
        queueWhileExecuting: true
      });
      if (reopen) {
        setTimeout(() => pm.openProject(projectId), 2000);
      }
    }
  };

  window.projectManagerDeliverables = api;
})();
