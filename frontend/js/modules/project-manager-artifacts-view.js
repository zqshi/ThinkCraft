/**
 * ProjectManager 交付物展示与知识查看模块
 */

window.projectManagerArtifactsView = {
  switchDeliverableTab(pm, stageId, tab) {
    pm.stageTabState[stageId] = tab;
    const artifactId = pm.stageArtifactState[stageId];
    const stage = (pm.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
    const artifact = (stage?.artifacts || []).find(a => a.id === artifactId) || stage?.artifacts?.[0];
    pm.renderDeliverableContent(stageId, artifact, tab);
    const tabs = document.querySelectorAll('.project-deliverable-tab');
    tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
  },

  selectArtifact(pm, stageId, artifactId) {
    pm.stageArtifactState[stageId] = artifactId;
    const stage = (pm.currentProject?.workflow?.stages || []).find(s => s.id === stageId);
    const artifact = (stage?.artifacts || []).find(a => a.id === artifactId);
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
      container.innerHTML = `<div id="previewPanelHost" class="preview-panel-host"></div>`;
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
    const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
    return artifacts.map(artifact => ({
      ...artifact,
      type: artifact.type || 'document'
    }));
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
