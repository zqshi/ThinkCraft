/**
 * ProjectManager 面板生命周期与预览入口模块
 */

window.projectManagerPanelLifecycle = {
  refreshProjectPanel(pm, project) {
    if (!project || !pm.currentProjectId || project.id !== pm.currentProjectId) {
      return;
    }

    pm.currentProject = project;
    pm.renderProjectPanel(project);
    pm.updateProjectSelection(project.id);
  },

  updateProjectSelection(pm, projectId) {
    document.querySelectorAll('[data-project-id]').forEach(card => {
      card.classList.toggle('active', card.dataset.projectId === projectId);
    });
  },

  extractHtmlFromContent(pm, content = '') {
    const text = String(content || '');
    if (!text.trim()) {
      return '';
    }
    if (/<html[\s>]/i.test(text) || /<!doctype html>/i.test(text)) {
      return text;
    }
    const fenced = text.match(/```html([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      return fenced[1].trim();
    }
    const body = text.match(/<body[\s>][\s\S]*<\/body>/i);
    if (body && body[0]) {
      return `<!doctype html>\n<html>\n${body[0]}\n</html>`;
    }
    return '';
  },

  findPreviewArtifact(pm, project) {
    const stages = project?.workflow?.stages || [];
    for (const stage of stages) {
      const artifacts = Array.isArray(stage?.artifacts) ? stage.artifacts : [];
      const found = artifacts.find(item =>
        ['preview', 'ui-preview'].includes(String(item?.type || '').toLowerCase())
      );
      if (found) {
        return found;
      }
    }
    return null;
  },

  async buildPreviewArtifact(pm, project) {
    const stages = project?.workflow?.stages || [];
    const candidates = [];
    stages.forEach(stage => {
      (stage.artifacts || []).forEach(artifact => {
        if (!artifact) {
          return;
        }
        candidates.push({ stageId: stage.id, artifact });
      });
    });

    const preferTypes = ['preview', 'ui-preview', 'prototype', 'frontend-code', 'ui-design'];
    candidates.sort((a, b) => {
      const typeA = String(a.artifact.type || '').toLowerCase();
      const typeB = String(b.artifact.type || '').toLowerCase();
      const idxA = preferTypes.indexOf(typeA);
      const idxB = preferTypes.indexOf(typeB);
      const rankA = idxA === -1 ? preferTypes.length : idxA;
      const rankB = idxB === -1 ? preferTypes.length : idxB;
      return rankA - rankB;
    });

    let source = null;
    for (const item of candidates) {
      const artifact = item.artifact;
      const previewUrl = artifact.previewUrl || artifact.url || '';
      if (previewUrl) {
        source = { stageId: item.stageId, artifact, html: '' };
        break;
      }
      const html = pm.extractHtmlFromContent(artifact.content || '');
      if (html) {
        source = { stageId: item.stageId, artifact, html };
        break;
      }
    }
    if (!source) {
      return null;
    }

    const targetStageId =
      stages.find(stage => stage.id === 'deployment')?.id ||
      stages[stages.length - 1]?.id ||
      source.stageId;
    const now = Date.now();
    const newArtifact = {
      id: `preview-${now}-${Math.random().toString(36).slice(2, 8)}`,
      projectId: project.id,
      stageId: targetStageId,
      type: 'preview',
      name: '可预览界面',
      content: source.html || '',
      previewUrl: source.artifact.previewUrl || source.artifact.url || '',
      source: 'derived',
      createdAt: now
    };

    const stage = stages.find(s => s.id === targetStageId);
    if (stage) {
      stage.artifacts = pm.mergeArtifacts(stage.artifacts || [], [newArtifact]);
    }
    await pm.storageManager?.saveArtifacts?.([newArtifact]).catch(() => {});
    await pm.updateProject(project.id, { workflow: project.workflow }, { allowFallback: true });

    return newArtifact;
  },

  async openPreviewEntry(pm, projectId) {
    let project = pm.currentProject;
    if (!project || (projectId && project.id !== projectId)) {
      project = await pm.getProject(projectId);
      if (!project) {
        return;
      }
      pm.currentProject = project;
      pm.currentProjectId = project.id;
    }

    let artifact = pm.findPreviewArtifact(project);
    if (!artifact) {
      if (window.modalManager) {
        window.modalManager.alert('正在构建预览，请稍候...', 'info');
      }
      artifact = await pm.buildPreviewArtifact(project);
      if (window.modalManager) {
        window.modalManager.close();
      }
    }

    if (!artifact) {
      window.modalManager?.alert('未找到可预览的前端界面内容', 'warning');
      return;
    }

    if (artifact.previewUrl || artifact.url) {
      const targetUrl = artifact.previewUrl || artifact.url;
      try {
        if (typeof pm.fetchWithAuth === 'function') {
          const response = await pm.fetchWithAuth(targetUrl, { method: 'GET' });
          if (!response.ok) {
            const message = await response.text().catch(() => '');
            throw new Error(message || `预览资源加载失败（HTTP ${response.status}）`);
          }
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
          if (!win) {
            URL.revokeObjectURL(blobUrl);
            window.modalManager?.alert('浏览器拦截了新标签页，请允许弹出窗口', 'warning');
            return;
          }
          setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
          return;
        }

        window.open(targetUrl, '_blank');
        return;
      } catch (error) {
        window.modalManager?.alert(`打开预览失败：${error.message}`, 'warning');
        return;
      }
    }

    const html = pm.extractHtmlFromContent(artifact.content || '');
    if (!html) {
      window.modalManager?.alert('预览内容为空或非HTML，无法打开预览', 'warning');
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      window.modalManager?.alert('浏览器拦截了新标签页，请允许弹出窗口', 'warning');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  },

  async openPreviewPanel(pm, projectId, artifactId = null) {
    let project = pm.currentProject;
    if (!project || (projectId && project.id !== projectId)) {
      project = await pm.getProject(projectId);
      if (!project) {
        return;
      }
      pm.currentProject = project;
      pm.currentProjectId = project.id;
    }

    let stageId = pm.currentStageId;
    if (!stageId) {
      stageId = project.workflow?.stages?.[0]?.id || null;
    }
    if (!stageId) {
      window.modalManager?.alert('暂无可预览的阶段', 'info');
      return;
    }

    pm.currentStageId = stageId;
    pm.stageTabState[stageId] = 'preview';
    if (artifactId) {
      pm.stageArtifactState[stageId] = artifactId;
    }
    pm.renderStageContent(project, stageId);
  },

  showStageArtifactsModal(pm, projectId, stageId) {
    const project = pm.currentProjectId === projectId ? pm.currentProject : null;
    const stage = project?.workflow?.stages?.find(s => s.id === stageId);
    const artifacts = stage ? pm.getDisplayArtifacts(stage) : [];

    if (!window.modalManager) {
      return;
    }

    if (artifacts.length === 0) {
      window.modalManager.alert('暂无交付物', 'info');
      return;
    }

    const listHTML = `
            <div style="display: grid; gap: 10px;">
                ${artifacts
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

    window.modalManager.showCustomModal('交付物列表', listHTML, 'stageArtifactsModal');
  },

  async downloadProjectArtifactBundle(pm, projectId = null) {
    const targetProjectId = projectId || pm.currentProjectId || pm.currentProject?.id;
    if (!targetProjectId) {
      window.modalManager?.alert('请先选择项目', 'info');
      return;
    }

    try {
      window.ErrorHandler?.showToast?.('正在打包项目产物，请稍候...', 'info');
      const baseApiUrl = String(pm.apiUrl || window.location.origin).replace(/\/$/, '');
      const downloadUrl = `${baseApiUrl}/api/workflow/${encodeURIComponent(targetProjectId)}/artifacts/bundle?fresh=1&format=zip`;
      const response = await pm.fetchWithAuth(downloadUrl, { method: 'GET' });

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `下载失败（HTTP ${response.status}）`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition') || '';
      const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
      const fileName = fileNameMatch?.[1] || `${targetProjectId}-artifacts.zip`;

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

      window.ErrorHandler?.showToast?.('产物包下载已开始', 'success');
    } catch (error) {
      window.ErrorHandler?.showToast?.(`产物包下载失败：${error.message}`, 'error');
    }
  },

  closeProjectPanel(pm) {
    const panel = document.getElementById('projectPanel');
    const body = document.getElementById('projectPanelBody');
    const mainContent = document.querySelector('.main-content');
    const chatContainer = document.getElementById('chatContainer');

    if (panel) {
      panel.classList.remove('active');
      panel.style.display = 'none';
    }
    if (body) {
      body.innerHTML = '';
    }
    if (mainContent) {
      mainContent.classList.remove('project-panel-open');
    }
    if (chatContainer) {
      chatContainer.style.display = 'flex';
    }

    pm.currentProjectId = null;
    pm.currentProject = null;
    pm.stopArtifactPolling();
    pm.updateProjectSelection(null);
  }
};
