/**
 * ProjectManager deliverables split module.
 * Extracts deliverable selection/progress/retry logic from project-manager.js.
 */
(function () {
  const deliverablesLogger = window.createLogger
    ? window.createLogger('ProjectDeliverables')
    : console;

  const api = {
    normalizeDeliverableKey(value) {
      if (!value || typeof value !== 'string') return '';
      return value.trim().toLowerCase();
    },

    getExpectedDeliverables(pm, stage, definition) {
      if (!stage) return [];
      const outputsDetailed = Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : [];
      const outputs = Array.isArray(stage.outputs) ? stage.outputs : [];
      let expected = [];
      if (outputsDetailed.length > 0) expected = outputsDetailed;
      else if (outputs.length > 0) expected = outputs;
      else if (definition?.expectedArtifacts?.length > 0) expected = definition.expectedArtifacts;

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
        if (resolved.length > 0) return Array.from(new Set(resolved));
      }

      const normalizedMap = new Map();
      artifactTypes.forEach(type => {
        const normalized = api.normalizeDeliverableKey(type);
        if (normalized) normalizedMap.set(normalized, type);
        const def = pm.getArtifactTypeDefinition(type);
        if (def?.name) {
          const defKey = api.normalizeDeliverableKey(def.name);
          if (defKey && !normalizedMap.has(defKey)) normalizedMap.set(defKey, type);
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
        const matchesSelected = keys.some(key => selectedKeys.has(api.normalizeDeliverableKey(key)));
        if (!matchesSelected) return;
        keys.forEach(pushResolved);
      });

      if (resolved.length === 0) {
        selectedKeys.forEach(key => {
          const type = normalizedMap.get(key);
          if (type) resolved.push(type);
        });
      }

      return Array.from(new Set(resolved));
    },

    findArtifactForDeliverable(pm, artifacts = [], deliverable = {}) {
      const keys = new Set();
      const pushKey = val => {
        const key = api.normalizeDeliverableKey(val);
        if (key) keys.add(key);
      };
      pushKey(deliverable.id);
      pushKey(deliverable.key);
      pushKey(deliverable.label);

      for (const artifact of artifacts) {
        if (!artifact) continue;
        const typeDef = pm.getArtifactTypeDefinition(artifact.type);
        const artifactKeys = [artifact.type, artifact.name, artifact.fileName, artifact.id, typeDef?.name]
          .map(value => api.normalizeDeliverableKey(value))
          .filter(Boolean);
        if (artifactKeys.some(key => keys.has(key))) return artifact;
      }
      return null;
    },

    getDeliverableStatusItems(pm, stage, expectedDeliverables = [], selectedDeliverables = []) {
      const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
      const hasArtifacts = artifacts.length > 0;
      const selectedSet = new Set((selectedDeliverables || []).filter(Boolean));
      const hasExplicitSelection = selectedSet.size > 0;
      const executingKeys = new Set(
        (stage?.executingArtifactTypes || [])
          .map(val => api.normalizeDeliverableKey(val))
          .filter(Boolean)
      );

      return expectedDeliverables.map(item => {
        const id = item.id || item.key || item.label || '';
        const label = item.label || item.id || item.key || '未命名交付物';
        const selected = hasExplicitSelection ? selectedSet.has(id) : true;
        const artifact = api.findArtifactForDeliverable(pm, artifacts, item);
        let status = 'pending';
        if (artifact) status = 'generated';
        else if (!selected) status = 'unselected';
        else if (stage.status === 'pending' && hasArtifacts) status = 'missing';
        else if (stage.status === 'active' || stage.status === 'in_progress') {
          if (executingKeys.size === 0) status = 'generating';
          else {
            const itemKey = api.normalizeDeliverableKey(id);
            status = itemKey && executingKeys.has(itemKey) ? 'generating' : 'missing';
          }
        } else if (stage.status === 'completed') status = 'missing';
        return { id, label, status, selected, artifact };
      });
    },

    getDeliverableProgressSummary(pm, stage, expectedDeliverables = [], selectedDeliverables = []) {
      const items = api.getDeliverableStatusItems(pm, stage, expectedDeliverables, selectedDeliverables);
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
      if (!expectedDeliverables || expectedDeliverables.length === 0) return '';
      const progress = api.getDeliverableProgressSummary(
        pm,
        stage,
        expectedDeliverables,
        selectedDeliverables
      );
      const statusMap = {
        generated: '已生成',
        generating: '生成中',
        pending: '待执行',
        unselected: '未选择',
        missing: '未生成'
      };
      const progressPercent =
        progress.selectedCount > 0
          ? Math.min(100, Math.round((progress.generatedCount / progress.selectedCount) * 100))
          : 0;
      return `
      <div class="project-deliverable-status">
        <div class="project-deliverable-status-header">
          <div class="project-deliverable-status-title">交付物进度</div>
          <div class="project-deliverable-status-summary">已生成 ${progress.generatedCount} / 选择 ${progress.selectedCount}</div>
        </div>
        <div class="project-deliverable-progress">
          <div class="project-deliverable-progress-bar" style="width: ${progressPercent}%;"></div>
        </div>
        <div class="project-deliverable-status-list">
          ${progress.selectedItems
            .map(item => {
              const statusLabel = statusMap[item.status] || statusMap.pending;
              const retryBtn =
                item.status === 'missing'
                  ? `<button class="btn-secondary" onclick="event.stopPropagation(); projectManager.retryStageDeliverable('${projectId}', '${stage.id}', '${pm.escapeHtml(item.id)}')" style="padding: 4px 8px; font-size: 11px;">重试</button>`
                  : '';
              return `
              <div class="project-deliverable-status-item status-${item.status}">
                <div class="project-deliverable-status-info">
                  <div class="project-deliverable-status-name">${pm.escapeHtml(item.label)}</div>
                  <div class="project-deliverable-status-meta">${statusLabel}</div>
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
      const project = pm.currentProject || (await pm.getProject(projectId).catch(() => null));
      const stage = project?.workflow?.stages?.find(s => s.id === stageId);
      if (!stage) return window.modalManager?.alert('未找到阶段信息', 'warning');
      if (!window.workflowExecutor) return window.modalManager?.alert('工作流执行器未就绪', 'warning');

      const expected = api.getExpectedDeliverables(pm, stage, null);
      const selected = api.getStageSelectedDeliverables(pm, stageId, expected);
      if (!selected.length) return window.modalManager?.alert('请先勾选需要输出的交付物', 'info');

      const resolvedArtifactTypes = api.resolveSelectedArtifactTypes(pm, stage, expected, selected);
      if (
        resolvedArtifactTypes.length === 0 &&
        Array.isArray(stage?.artifactTypes) &&
        stage.artifactTypes.length > 0
      ) {
        return window.modalManager?.alert('未选择有效的交付物类型', 'warning');
      }

      const existingTypes = new Set(
        (stage.artifacts || [])
          .map(artifact => api.normalizeDeliverableKey(artifact?.type))
          .filter(Boolean)
      );
      const missingTypes = resolvedArtifactTypes.filter(
        type => !existingTypes.has(api.normalizeDeliverableKey(type))
      );
      if (!api.validateStrategyDocDependency(pm, project, missingTypes)) return;
      if (!missingTypes.length) return window.modalManager?.alert('已选交付物均已生成', 'info');

      stage.selectedDeliverables = selected;
      stage.supplementingDeliverableTypes = missingTypes;
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
    },

    async regenerateStageDeliverable(pm, projectId, stageId, artifactId) {
      if (!window.workflowExecutor) return window.modalManager?.alert('工作流执行器未就绪', 'warning');
      const project = pm.currentProject || (await pm.getProject(projectId).catch(() => null));
      const stage = project?.workflow?.stages?.find(s => s.id === stageId);
      const artifact = stage?.artifacts?.find(a => a.id === artifactId);
      if (!artifact) return window.modalManager?.alert('未找到对应交付物', 'warning');
      const confirmed = confirm(`确定要重新生成「${artifact.name || artifact.type}」吗？`);
      if (!confirmed) return;
      await window.workflowExecutor.regenerateArtifact(projectId, stageId, artifact);
      const updated = await pm.getProject(projectId).catch(() => null);
      if (updated) pm.refreshProjectPanel(updated);
    },

    async retryStageDeliverable(pm, projectId, stageId, deliverableType) {
      if (!deliverableType)
        return window.modalManager?.alert('交付物类型缺失，无法重试', 'warning');
      if (!window.workflowExecutor) return window.modalManager?.alert('工作流执行器未就绪', 'warning');
      if (pm.isRetryingDeliverable) return window.modalManager?.alert('正在重试生成，请稍后', 'info');

      pm.isRetryingDeliverable = true;
      const project = pm.currentProject || (await pm.getProject(projectId).catch(() => null));
      const stage = project?.workflow?.stages?.find(s => s.id === stageId);
      if (stage) {
        const expected = api.getExpectedDeliverables(pm, stage, null);
        const resolved = api.resolveSelectedArtifactTypes(pm, stage, expected, [deliverableType]);
        const artifactType = resolved[0] || deliverableType;
        stage.executingArtifactTypes = [artifactType];
        await pm.updateProject(projectId, { workflow: project.workflow }, { allowFallback: true });
      }
      try {
        const expected = stage ? api.getExpectedDeliverables(pm, stage, null) : [];
        const resolved = api.resolveSelectedArtifactTypes(pm, stage, expected, [deliverableType]);
        const artifactType = resolved[0] || deliverableType;
        if (!api.validateStrategyDocDependency(pm, project, [artifactType])) return;
        if (!artifactType && Array.isArray(stage?.artifactTypes) && stage.artifactTypes.length > 0) {
          return window.modalManager?.alert('未选择有效的交付物类型', 'warning');
        }
        await window.workflowExecutor.startStage(projectId, stageId, {
          selectedArtifactTypes: [artifactType],
          mergeArtifacts: true,
          silent: true,
          queueWhileExecuting: true
        });
        const updated = await pm.getProject(projectId).catch(() => null);
        if (updated) pm.refreshProjectPanel(updated);
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
      if (expected.length === 0) return [];
      const selectedSet = new Set(selectedIds.filter(Boolean));
      const filteredExpected =
        selectedSet.size > 0 ? expected.filter(item => selectedSet.has(item.id || item.key)) : expected;
      return api.getMissingDeliverablesFromExpected(pm, stage, filteredExpected);
    },

    getMissingDeliverablesFromExpected(pm, stage, expected = []) {
      if (!expected || expected.length === 0) return [];
      const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
      const actualKeys = new Set();
      artifacts.forEach(artifact => {
        const type = artifact?.type || 'document';
        const typeDef = pm.getArtifactTypeDefinition(type);
        [type, artifact?.name, artifact?.fileName, artifact?.id, typeDef?.name].forEach(val => {
          const key = api.normalizeDeliverableKey(val);
          if (key) actualKeys.add(key);
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
      if (!expected || expected.length === 0) return [];
      const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
      const actualKeys = new Set();
      artifacts.forEach(artifact => {
        const type = artifact?.type || 'document';
        const typeDef = pm.getArtifactTypeDefinition(type);
        [type, artifact?.name, artifact?.fileName, artifact?.id, typeDef?.name].forEach(val => {
          const key = api.normalizeDeliverableKey(val);
          if (key) actualKeys.add(key);
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
          if (typeKey === 'prd') return true;
          const nameKey = api.normalizeDeliverableKey(artifact?.name);
          if (nameKey === 'prd' || nameKey === '产品需求文档') return true;
        }
      }
      return false;
    },

    validateStrategyDocDependency(pm, project, selectedArtifactTypes = []) {
      const normalized = (selectedArtifactTypes || [])
        .map(type => api.normalizeDeliverableKey(type))
        .filter(Boolean);
      if (!normalized.includes('strategy-doc')) return true;
      const includesPrdThisRun = normalized.includes('prd');
      if (includesPrdThisRun || api.hasGeneratedPrd(pm, project)) return true;
      window.modalManager?.alert('战略设计文档依赖 PRD，请先生成产品需求文档（PRD）', 'warning');
      return false;
    },

    getStageSelectedDeliverables(pm, stageId, expectedDeliverables) {
      const existing = pm.stageDeliverableSelection[stageId];
      if (Array.isArray(existing) && existing.length > 0) return existing;
      const defaults = expectedDeliverables.map(item => item.id || item.key).filter(Boolean);
      pm.stageDeliverableSelection[stageId] = defaults;
      if (pm.currentProjectId) {
        pm.stageDeliverableSelectionByProject[pm.currentProjectId] = pm.stageDeliverableSelection;
        pm.persistStageDeliverableSelectionStore();
      }
      return defaults;
    },

    toggleStageDeliverable(pm, stageId, encodedId, checked) {
      const id = decodeURIComponent(encodedId || '');
      if (!id) return;
      const stage = (pm.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
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
      if (checked) current.add(id);
      else current.delete(id);

      pm.stageDeliverableSelection[stageId] = Array.from(current);
      stage.selectedDeliverables = Array.from(current);
      if (pm.currentProjectId) {
        pm.stageDeliverableSelectionByProject[pm.currentProjectId] = pm.stageDeliverableSelection;
        pm.persistStageDeliverableSelectionStore();
        pm.storageManager?.saveProject?.(pm.currentProject).catch(() => {});
      }
    },

    async startStageWithSelection(pm, projectId, stageId, reopen = false) {
      if (!window.workflowExecutor) return window.modalManager?.alert('工作流执行器未就绪', 'warning');
      const stage = (pm.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
      const definition = window.workflowExecutor?.getStageDefinition(stageId, stage);
      const expectedDeliverables = api.getExpectedDeliverables(pm, stage, definition);
      if (expectedDeliverables.length === 0) {
        return window.modalManager?.alert('该阶段未配置可执行交付物，请先检查阶段配置', 'warning');
      }
      const selected = api.getStageSelectedDeliverables(pm, stageId, expectedDeliverables);
      if (expectedDeliverables.length > 0 && selected.length === 0) {
        const msg = '请先勾选需要输出的交付物';
        if (window.modalManager) window.modalManager.alert(msg, 'warning');
        else alert(msg);
        return;
      }
      const resolvedArtifactTypes = api.resolveSelectedArtifactTypes(
        pm,
        stage,
        expectedDeliverables,
        selected
      );
      if (resolvedArtifactTypes.length === 0 && selected.length > 0) {
        return window.modalManager?.alert('未选择有效的交付物类型', 'warning');
      }
      if (!api.validateStrategyDocDependency(pm, pm.currentProject, resolvedArtifactTypes)) return;
      await window.workflowExecutor.startStage(projectId, stageId, {
        selectedArtifactTypes: resolvedArtifactTypes.length > 0 ? resolvedArtifactTypes : selected,
        queueWhileExecuting: true
      });
      if (reopen) setTimeout(() => pm.openProject(projectId), 2000);
    }
  };

  window.projectManagerDeliverables = api;
})();

