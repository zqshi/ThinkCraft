/**
 * ProjectManager 交付物展示与知识查看模块
 */

window.projectManagerArtifactsView = {
  getRawDisplayArtifacts(pm, stage) {
    const stageArtifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
    const projectId = pm.currentProject?.id || null;
    const cachedArtifacts = projectId ? pm.projectArtifactsCache?.[projectId] || [] : [];
    const merged = pm.mergeArtifacts(
      stageArtifacts,
      (cachedArtifacts || []).filter(artifact => artifact?.stageId === stage?.id)
    );
    return merged.map(artifact => ({
      ...artifact,
      type: artifact.type || 'document'
    }));
  },

  normalizeArtifactDisplayName(artifact = {}) {
    const rawName = String(
      artifact.name || artifact.fileName || artifact.title || artifact.type || '未命名'
    ).trim();
    return (
      rawName
        .replace(/\.(md|markdown|html|txt|json|tsx|jsx|js|ts)$/i, '')
        .replace(/[\s_-]*(chunk|part|segment|slice|片段|分片|续写|续\d+|第\d+部分)\s*#?\d*$/i, '')
        .trim() || rawName
    );
  },

  buildArtifactDisplayKey(pm, artifact = {}) {
    const type = String(pm.normalizeArtifactTypeId?.(artifact.type) || artifact.type || 'document')
      .trim()
      .toLowerCase();
    const name = this.normalizeArtifactDisplayName(artifact).toLowerCase();
    return `${type}::${name}`;
  },

  isArtifactFragment(artifact = {}) {
    const source = String(artifact.source || '').toLowerCase();
    const name = String(
      artifact.name || artifact.fileName || artifact.relativePath || ''
    ).toLowerCase();
    const generationMeta = artifact.generationMeta || {};
    if (generationMeta && generationMeta.isComplete === false) {
      return true;
    }
    if (/(chunk|segment|part|slice|片段|分片|续写|第\d+部分)/i.test(name)) {
      return true;
    }
    return ['chunk', 'partial', 'stream', 'model-chunk'].includes(source);
  },

  isArtifactComplete(artifact = {}) {
    const status = String(artifact.status || '').toLowerCase();
    const generationMeta = artifact.generationMeta || {};
    if (generationMeta?.isComplete === true) {
      return true;
    }
    if (status === 'completed' || status === 'done' || status === 'success') {
      return true;
    }
    if (artifact.previewUrl || artifact.downloadUrl || artifact.relativePath) {
      return true;
    }
    const content = String(artifact.content || '').trim();
    if (!content) {
      return false;
    }
    if (
      artifact.type === 'prototype' ||
      artifact.type === 'preview' ||
      artifact.type === 'ui-preview'
    ) {
      return /<\/html>/i.test(content) || /<\/body>/i.test(content);
    }
    return content.length > 400;
  },

  scoreArtifactCandidate(artifact = {}) {
    let score = 0;
    if (this.isArtifactComplete(artifact)) {
      score += 1000;
    }
    if (!this.isArtifactFragment(artifact)) {
      score += 100;
    }
    if (artifact.previewUrl || artifact.downloadUrl || artifact.relativePath) {
      score += 50;
    }
    score += Math.min(String(artifact.content || '').trim().length, 5000) / 100;
    score += Number(artifact.createdAt || 0) / 1e13;
    return score;
  },

  extractArtifactPartOrder(artifact = {}) {
    const raw = String(
      artifact.name || artifact.fileName || artifact.relativePath || artifact.id || ''
    );
    const match = raw.match(/(?:chunk|part|segment|slice|第)\s*#?\s*(\d+)/i);
    if (match) {
      return Number(match[1]) || 0;
    }
    return Number(artifact.round || artifact.sequence || artifact.chunkIndex || 0) || 0;
  },

  mergeArtifactContentParts(parts = []) {
    const sorted = [...parts].sort((a, b) => {
      const orderDiff = this.extractArtifactPartOrder(a) - this.extractArtifactPartOrder(b);
      if (orderDiff !== 0) {
        return orderDiff;
      }
      return Number(a.createdAt || 0) - Number(b.createdAt || 0);
    });
    let content = '';
    sorted.forEach(part => {
      const next = String(part.content || '').trim();
      if (!next) {
        return;
      }
      if (!content) {
        content = next;
        return;
      }
      const overlapMax = Math.min(1000, content.length, next.length);
      let merged = false;
      for (let size = overlapMax; size >= 60; size -= 1) {
        if (content.slice(-size) === next.slice(0, size)) {
          content += next.slice(size);
          merged = true;
          break;
        }
      }
      if (!merged) {
        content += `\n\n${next}`;
      }
    });
    return content;
  },

  collapseArtifactsForDisplay(pm, artifacts = []) {
    const groups = new Map();
    (Array.isArray(artifacts) ? artifacts : []).forEach(artifact => {
      if (!artifact) {
        return;
      }
      const key = this.buildArtifactDisplayKey(pm, artifact);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(artifact);
    });

    const collapsed = [];
    groups.forEach(group => {
      const completeItems = group.filter(item => this.isArtifactComplete(item));
      if (completeItems.length > 0) {
        const best = completeItems
          .slice()
          .sort((a, b) => this.scoreArtifactCandidate(b) - this.scoreArtifactCandidate(a))[0];
        collapsed.push({
          ...best,
          name: this.normalizeArtifactDisplayName(best)
        });
        return;
      }

      if (group.length === 1) {
        collapsed.push({
          ...group[0],
          name: this.normalizeArtifactDisplayName(group[0])
        });
        return;
      }

      const seed = group
        .slice()
        .sort((a, b) => this.scoreArtifactCandidate(b) - this.scoreArtifactCandidate(a))[0];
      collapsed.push({
        ...seed,
        id: `assembled-${group
          .map(item => item.id || '')
          .filter(Boolean)
          .join('-')
          .slice(0, 120)}`,
        name: this.normalizeArtifactDisplayName(seed),
        content: this.mergeArtifactContentParts(group),
        source: 'assembled-display',
        assembledFromArtifactIds: group.map(item => item.id).filter(Boolean),
        createdAt: Math.max(...group.map(item => Number(item.createdAt || 0) || 0))
      });
    });

    return collapsed
      .filter(
        artifact => this.isArtifactComplete(artifact) || String(artifact.content || '').trim()
      )
      .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
  },

  switchDeliverableTab(pm, stageId, tab) {
    pm.stageTabState[stageId] = tab;
    const artifactId = pm.stageArtifactState[stageId];
    const stage = (pm.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
    const artifacts = stage ? pm.getDisplayArtifacts(stage) : [];
    const artifact = artifacts.find(a => a.id === artifactId) || artifacts[0];
    pm.renderDeliverableContent(stageId, artifact, tab);
    const tabs = document.querySelectorAll('.project-deliverable-tab');
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  },

  selectArtifact(pm, stageId, artifactId) {
    pm.stageArtifactState[stageId] = artifactId;
    const stage = (pm.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
    const artifacts = stage ? pm.getDisplayArtifacts(stage) : [];
    const artifact = artifacts.find(a => a.id === artifactId);
    const tab = pm.stageTabState[stageId] || 'document';
    pm.renderDeliverableContent(stageId, artifact, tab);
  },

  renderDeliverableContent(pm, stageId, artifact, tab) {
    const container = document.getElementById('projectDeliverableContent');
    if (!container) {
      return;
    }
    if (!artifact) {
      container.innerHTML = '<div class="project-panel-empty">暂无交付物内容</div>';
      return;
    }

    if (tab === 'code') {
      container.innerHTML = `
          <pre class="code-block">${pm.escapeHtml(artifact.content || '')}</pre>
          <button class="btn-secondary" onclick="projectManager.openPreviewPanel('${pm.currentProjectId}', '${artifact.id}')">立即预览</button>
      `;
      return;
    }
    if (tab === 'preview') {
      if (!window.previewPanel) {
        container.innerHTML = '<div class="project-panel-empty">预览模块未就绪</div>';
        return;
      }
      container.innerHTML = '<div id="previewPanelHost" class="preview-panel-host"></div>';
      if (typeof window.previewPanel.attachTo === 'function') {
        window.previewPanel.attachTo('previewPanelHost');
      }
      if (typeof window.previewPanel.renderPreview === 'function') {
        window.previewPanel.renderPreview({
          projectId: pm.currentProjectId,
          stageId,
          artifact
        });
      }
      return;
    }

    const rendered = window.markdownRenderer
      ? window.markdownRenderer.render(artifact.content || '')
      : pm.escapeHtml(artifact.content || '');
    container.innerHTML = `<div class="report-rich-text markdown-content">${rendered}</div>`;
  },

  getArtifactTypeLabel(pm, artifact) {
    if (!artifact || !artifact.type) {
      return '文档';
    }
    const def = pm.getArtifactTypeDefinition(artifact.type);
    return def.name;
  },

  renderStageArtifacts(pm, stage, projectId, displayArtifacts) {
    if (stage.status !== 'completed') {
      return '';
    }

    if (!displayArtifacts || displayArtifacts.length === 0) {
      return '';
    }

    if (displayArtifacts.length > 3) {
      return '';
    }

    return `
            <div class="project-panel-list" style="margin-top: 10px;">
                ${displayArtifacts
                  .map(
                    artifact => `
                    <div class="project-panel-item">
                        <div class="project-panel-item-main">
                            <div class="project-panel-item-title">${pm.escapeHtml(artifact.name || '未命名交付物')}</div>
                            <div class="project-panel-item-sub">${pm.escapeHtml(artifact.type || 'deliverable')}</div>
                        </div>
                        <button class="btn-secondary" onclick="projectManager.openKnowledgeFromArtifact('${projectId}', '${artifact.id}')" style="padding: 4px 10px; font-size: 12px;">
                            查看
                        </button>
                    </div>
                `
                  )
                  .join('')}
            </div>
        `;
  },

  getDocArtifacts(pm, stage) {
    const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
    const docTypes = new Set([
      'prd',
      'ui-design',
      'architecture-doc',
      'test-report',
      'deploy-doc',
      'marketing-plan',
      'document'
    ]);
    return artifacts
      .map(artifact => ({
        ...artifact,
        type: artifact.type || 'document'
      }))
      .filter(artifact => docTypes.has(artifact.type));
  },

  getDisplayArtifacts(pm, stage) {
    const merged = this.getRawDisplayArtifacts(pm, stage);
    return this.collapseArtifactsForDisplay(pm, merged);
  },

  async openKnowledgeFromArtifact(pm, projectId, artifactId) {
    if (!pm.storageManager || !window.modalManager) {
      return;
    }

    const knowledgeId = `knowledge-${artifactId}`;
    let item = await pm.storageManager.getKnowledge(knowledgeId);
    if (!item) {
      const artifact = await pm.storageManager.getArtifact(artifactId);
      if (!artifact) {
        window.modalManager.alert('未找到交付物内容', 'warning');
        return;
      }
      item = {
        title: artifact.name || '交付物',
        content: artifact.content || ''
      };
    }

    const rendered = window.markdownRenderer
      ? window.markdownRenderer.render(item.content || '')
      : item.content || '';
    const contentHTML = `
            <div style="display: grid; gap: 12px;">
                <div style="font-size: 18px; font-weight: 600;">${pm.escapeHtml(item.title || '知识条目')}</div>
                <div class="report-rich-text markdown-content">${rendered}</div>
            </div>
        `;
    window.modalManager.showCustomModal('知识查看', contentHTML, 'knowledgeDetailModal');
  }
};
