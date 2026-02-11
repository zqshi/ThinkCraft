/**
 * ProjectManager artifact preview split module.
 * Keeps behavior while reducing project-manager.js size.
 */
(function () {
  const previewLogger = window.createLogger ? window.createLogger('ProjectArtifactPreview') : console;

  const findArtifactById = (project, artifactId) => {
    const stages = project?.workflow?.stages || [];
    for (const stage of stages) {
      const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
      const artifact = artifacts.find(a => a.id === artifactId);
      if (artifact) {
        return { stage, artifact };
      }
    }
    return null;
  };

  const api = {
    async openArtifactPreviewPanel(pm, projectId, stageId, artifactId) {
      try {
        const project = await pm.getProject(projectId);
        if (!project || !project.workflow) {
          throw new Error('项目不存在');
        }

        const stage = project.workflow.stages.find(s => s.id === stageId);
        if (!stage) {
          throw new Error('阶段不存在');
        }

        const artifacts = Array.isArray(stage.artifacts) ? stage.artifacts : [];
        const artifact = artifacts.find(a => a.id === artifactId);
        if (!artifact) {
          previewLogger.error('[交付物预览] 未找到交付物:', {
            artifactId,
            availableArtifacts: artifacts.map(a => ({ id: a.id, name: a.name, type: a.type }))
          });
          throw new Error('交付物不存在');
        }

        if (!pm.stageDetailOverlay) {
          pm.stageDetailOverlay = document.createElement('div');
          pm.stageDetailOverlay.className = 'stage-detail-panel-overlay';
          pm.stageDetailOverlay.addEventListener('click', () => api.closeArtifactPreviewPanel(pm));
          document.body.appendChild(pm.stageDetailOverlay);
        }

        if (!pm.stageDetailPanel) {
          pm.stageDetailPanel = document.createElement('div');
          pm.stageDetailPanel.className = 'stage-detail-panel';
          document.body.appendChild(pm.stageDetailPanel);
        }

        await api.renderArtifactPreviewPanel(pm, project, stage, artifact);

        setTimeout(() => {
          pm.stageDetailOverlay.classList.add('open');
          pm.stageDetailPanel.classList.add('open');
        }, 10);
      } catch (error) {
        previewLogger.error('[交付物预览] 打开失败:', error);
        if (window.ErrorHandler) {
          window.ErrorHandler.showToast('打开预览失败：' + error.message, 'error');
        }
      }
    },

    closeArtifactPreviewPanel(pm) {
      if (pm.stageDetailOverlay) {
        pm.stageDetailOverlay.classList.remove('open');
      }
      if (pm.stageDetailPanel) {
        pm.stageDetailPanel.classList.remove('open');
      }
    },

    async renderArtifactPreviewPanel(pm, project, stage, artifact) {
      if (!pm.stageDetailPanel) return;

      const icon = pm.getArtifactIcon(artifact.type);
      const typeLabel = pm.getArtifactTypeLabel(artifact);
      const documentTypes = new Set([
        'document',
        'report',
        'plan',
        'strategy-doc',
        'prd',
        'ui-design',
        'architecture-doc',
        'test-report',
        'deployment-guide',
        'deploy-doc',
        'marketing-plan',
        'user-story',
        'feature-list',
        'design-spec'
      ]);
      let contentHTML = '';

      if (documentTypes.has(artifact.type)) {
        const content = artifact.content || artifact.text || '';
        if (content) {
          let renderedContent = '';
          if (window.markdownRenderer) {
            renderedContent = window.markdownRenderer.render(content);
          } else if (window.marked) {
            renderedContent = window.marked.parse(content);
          } else {
            renderedContent = content.replace(/\n/g, '<br>');
          }
          contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-document markdown-content">${renderedContent}</div></div>`;
        } else {
          contentHTML = '<div class="artifact-preview-empty"><div class="artifact-preview-empty-icon">📄</div><div>暂无内容</div></div>';
        }
      } else if (
        artifact.type === 'code' ||
        artifact.type === 'frontend-code' ||
        artifact.type === 'backend-code' ||
        artifact.type === 'component-lib' ||
        artifact.type === 'api-doc'
      ) {
        const code = artifact.content || artifact.code || '';
        const language = artifact.language || 'javascript';
        if (code) {
          contentHTML = `
          <div class="artifact-preview-content">
            <div class="artifact-preview-code-header">
              <span class="artifact-preview-code-language">${language}</span>
              <button class="artifact-preview-copy-btn" onclick="projectManager.copyArtifactContent('${artifact.id}')">📋 复制代码</button>
            </div>
            <pre class="artifact-preview-code"><code class="language-${language}">${pm.escapeHtml(code)}</code></pre>
          </div>`;
        } else {
          contentHTML = '<div class="artifact-preview-empty"><div class="artifact-preview-empty-icon">💻</div><div>暂无代码</div></div>';
        }
      } else if (
        artifact.type === 'preview' ||
        artifact.type === 'ui-preview' ||
        artifact.type === 'prototype'
      ) {
        const previewUrl = artifact.previewUrl || artifact.url || '';
        const htmlContent = artifact.htmlContent || artifact.content || '';
        if (previewUrl) {
          contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-iframe-container"><iframe src="${previewUrl}" class="artifact-preview-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="${pm.escapeHtml(artifact.name || '预览')}"></iframe></div></div>`;
        } else if (htmlContent) {
          contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-iframe-container"><iframe srcdoc="${pm.escapeHtml(htmlContent)}" class="artifact-preview-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="${pm.escapeHtml(artifact.name || '预览')}"></iframe></div></div>`;
        } else {
          contentHTML = '<div class="artifact-preview-empty"><div class="artifact-preview-empty-icon">🖥️</div><div>暂无预览内容</div></div>';
        }
      } else if (artifact.type === 'design' || artifact.type === 'image') {
        const imageUrl = artifact.imageUrl || artifact.url || '';
        if (imageUrl) {
          contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-image"><img src="${imageUrl}" alt="${pm.escapeHtml(artifact.name)}" /></div></div>`;
        } else {
          contentHTML = '<div class="artifact-preview-empty"><div class="artifact-preview-empty-icon">🎨</div><div>暂无设计稿</div></div>';
        }
      } else {
        const content = artifact.content || artifact.text || artifact.code || '';
        if (content) {
          if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) {
            contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-iframe-container"><iframe srcdoc="${pm.escapeHtml(content)}" class="artifact-preview-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="${pm.escapeHtml(artifact.name || '预览')}"></iframe></div></div>`;
          } else {
            let renderedContent = '';
            if (window.markdownRenderer) {
              renderedContent = window.markdownRenderer.render(content);
            } else if (window.marked) {
              renderedContent = window.marked.parse(content);
            } else {
              renderedContent = content.replace(/\n/g, '<br>');
            }
            contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-document markdown-content">${renderedContent}</div></div>`;
          }
        } else {
          contentHTML = `
          <div class="artifact-preview-content">
            <div class="artifact-preview-info">
              <div class="artifact-preview-info-item"><span class="label">文件名:</span><span class="value">${pm.escapeHtml(artifact.fileName || artifact.name || '未命名')}</span></div>
              <div class="artifact-preview-info-item"><span class="label">类型:</span><span class="value">${typeLabel}</span></div>
              ${
                artifact.size
                  ? `<div class="artifact-preview-info-item"><span class="label">大小:</span><span class="value">${api.formatFileSize(artifact.size)}</span></div>`
                  : ''
              }
              ${
                artifact.createdAt
                  ? `<div class="artifact-preview-info-item"><span class="label">创建时间:</span><span class="value">${new Date(artifact.createdAt).toLocaleString('zh-CN')}</span></div>`
                  : ''
              }
            </div>
          </div>`;
        }
      }

      const actionsHTML = `
      <div class="artifact-preview-actions">
        ${
          artifact.previewUrl || artifact.url
            ? `<button class="btn-primary" onclick="window.open('${artifact.previewUrl || artifact.url}', '_blank')">🔗 新窗口打开</button>`
            : ''
        }
        ${
          artifact.downloadUrl
            ? `<button class="btn-secondary" onclick="projectManager.downloadArtifact('${artifact.id}')">📥 下载</button>`
            : ''
        }
        ${
          artifact.content || artifact.text || artifact.code
            ? `<button class="btn-secondary" onclick="projectManager.copyArtifactContent('${artifact.id}')">📋 复制内容</button>`
            : ''
        }
      </div>`;

      pm.stageDetailPanel.innerHTML = `
      <div class="stage-detail-header">
        <div class="stage-detail-header-top">
          <div class="stage-detail-title"><span>${icon}</span><span>${pm.escapeHtml(artifact.name || artifact.fileName || '未命名交付物')}</span></div>
          <button class="stage-detail-close" onclick="projectManager.closeArtifactPreviewPanel()">×</button>
        </div>
        <div class="stage-detail-meta">
          <div class="stage-detail-meta-item"><span class="label">阶段:</span><span class="value">${pm.escapeHtml(stage.name)}</span></div>
          <div class="stage-detail-meta-item"><span class="label">类型:</span><span class="value">${typeLabel}</span></div>
        </div>
      </div>
      <div class="stage-detail-body">${contentHTML}${actionsHTML}</div>`;

      if (
        window.Prism &&
        (artifact.type === 'code' ||
          artifact.type === 'frontend-code' ||
          artifact.type === 'backend-code')
      ) {
        setTimeout(() => window.Prism.highlightAll(), 100);
      }
    },

    async copyArtifactContent(pm, artifactId) {
      try {
        if (!pm.currentProject) {
          throw new Error('未选择项目');
        }
        const found = findArtifactById(pm.currentProject, artifactId);
        const artifact = found?.artifact;
        if (!artifact) {
          throw new Error('交付物不存在');
        }
        const content = artifact.content || artifact.text || artifact.code || '';
        if (!content) {
          throw new Error('交付物无内容');
        }
        await navigator.clipboard.writeText(content);
        window.ErrorHandler?.showToast?.('已复制到剪贴板', 'success');
      } catch (error) {
        previewLogger.error('[复制内容] 失败:', error);
        window.ErrorHandler?.showToast?.('复制失败：' + error.message, 'error');
      }
    },

    async downloadArtifact(pm, artifactId) {
      try {
        if (!pm.currentProject) {
          throw new Error('未选择项目');
        }
        const found = findArtifactById(pm.currentProject, artifactId);
        const artifact = found?.artifact;
        if (!artifact) {
          throw new Error('交付物不存在');
        }
        const downloadUrl = artifact.downloadUrl || artifact.url;
        if (!downloadUrl) {
          throw new Error('交付物无下载链接');
        }
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = artifact.fileName || artifact.name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.ErrorHandler?.showToast?.('开始下载', 'success');
      } catch (error) {
        previewLogger.error('[下载交付物] 失败:', error);
        window.ErrorHandler?.showToast?.('下载失败：' + error.message, 'error');
      }
    },

    formatFileSize(bytes) {
      if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
  };

  window.projectManagerArtifactPreview = api;
})();

