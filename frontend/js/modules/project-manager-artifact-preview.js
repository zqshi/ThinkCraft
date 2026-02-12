/**
 * ProjectManager artifact preview split module.
 * Keeps behavior while reducing project-manager.js size.
 */
(function () {
  const previewLogger = window.createLogger
    ? window.createLogger('ProjectArtifactPreview')
    : console;

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
    escapeHtml(text) {
      return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    },

    normalizeHtmlForPreview(html) {
      const source = String(html || '');
      if (!source.trim()) {
        return '';
      }
      const hasHtmlTag = /<html[\s>]/i.test(source);
      const hasBodyTag = /<body[\s>]/i.test(source);
      const hasClosingHtml = /<\/html>/i.test(source);
      const hasDoctype = /<!doctype html>/i.test(source);
      if ((hasHtmlTag || hasDoctype) && hasBodyTag && hasClosingHtml) {
        return source;
      }
      const escaped = api.escapeHtml(source).slice(0, 12000);
      return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>预览内容异常</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; }
    .wrap { padding: 20px; max-width: 980px; margin: 0 auto; }
    .warn { background: #fff7ed; border: 1px solid #fdba74; color: #9a3412; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
    pre { white-space: pre-wrap; word-break: break-word; background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 14px; overflow: auto; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="warn">原型 HTML 内容不完整（可能被截断），已显示源码片段以便排查。</div>
    <pre>${escaped}</pre>
  </div>
</body>
</html>`;
    },

    revokePreviewObjectUrl(pm) {
      const url = pm?.currentPreviewObjectUrl;
      if (url && String(url).startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
      if (pm) {
        pm.currentPreviewObjectUrl = null;
      }
    },

    toAbsoluteUrl(pm, url) {
      const raw = String(url || '').trim();
      if (!raw) {
        return '';
      }
      if (/^https?:\/\//i.test(raw)) {
        return raw;
      }
      const base = String(pm?.apiUrl || window.location.origin).replace(/\/$/, '');
      return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
    },

    needsAuthProxy(pm, url) {
      const abs = api.toAbsoluteUrl(pm, url);
      if (!abs) {
        return false;
      }
      try {
        const u = new URL(abs, window.location.origin);
        // 任何 /api/* 资源都优先走鉴权代理下载，避免 iframe 直连受 X-Frame-Options 限制导致白屏
        if (u.pathname.startsWith('/api/')) {
          return true;
        }
      } catch (_error) {}
      const apiBase = String(pm?.apiUrl || window.location.origin).replace(/\/$/, '');
      if (abs.startsWith(`${apiBase}/api/`)) {
        return true;
      }
      try {
        const u = new URL(abs, window.location.origin);
        return u.origin === new URL(apiBase).origin && u.pathname.startsWith('/api/');
      } catch (_error) {
        return false;
      }
    },

    async resolvePreviewUrl(pm, url) {
      const abs = api.toAbsoluteUrl(pm, url);
      if (!abs) {
        return '';
      }
      if (!api.needsAuthProxy(pm, abs)) {
        return abs;
      }
      const response = await pm.fetchWithAuth(abs, { method: 'GET' });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `预览资源加载失败（HTTP ${response.status}）`);
      }
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      if (
        contentType.includes('text/html') ||
        contentType.includes('application/xhtml+xml') ||
        contentType.includes('text/plain')
      ) {
        const text = await response.text();
        const normalized = api.normalizeHtmlForPreview(text);
        const blob = new Blob([normalized], { type: 'text/html;charset=utf-8' });
        api.revokePreviewObjectUrl(pm);
        const blobUrl = URL.createObjectURL(blob);
        pm.currentPreviewObjectUrl = blobUrl;
        return blobUrl;
      }
      const blob = await response.blob();
      api.revokePreviewObjectUrl(pm);
      const blobUrl = URL.createObjectURL(blob);
      pm.currentPreviewObjectUrl = blobUrl;
      return blobUrl;
    },

    createHtmlBlobUrl(pm, html) {
      const text = api.normalizeHtmlForPreview(html);
      if (!text.trim()) {
        return '';
      }
      const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
      api.revokePreviewObjectUrl(pm);
      const blobUrl = URL.createObjectURL(blob);
      pm.currentPreviewObjectUrl = blobUrl;
      return blobUrl;
    },

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
      api.revokePreviewObjectUrl(pm);
    },

    async renderArtifactPreviewPanel(pm, project, stage, artifact) {
      if (!pm.stageDetailPanel) {
        return;
      }

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
          contentHTML =
            '<div class="artifact-preview-empty"><div class="artifact-preview-empty-icon">📄</div><div>暂无内容</div></div>';
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
          contentHTML =
            '<div class="artifact-preview-empty"><div class="artifact-preview-empty-icon">💻</div><div>暂无代码</div></div>';
        }
      } else if (
        artifact.type === 'preview' ||
        artifact.type === 'ui-preview' ||
        artifact.type === 'prototype'
      ) {
        const previewUrl = artifact.previewUrl || artifact.url || '';
        const htmlContent = artifact.htmlContent || artifact.content || '';
        if (previewUrl) {
          try {
            const resolvedPreviewUrl = await api.resolvePreviewUrl(pm, previewUrl);
            contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-iframe-container"><iframe src="${resolvedPreviewUrl}" class="artifact-preview-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="${pm.escapeHtml(artifact.name || '预览')}"></iframe></div></div>`;
          } catch (error) {
            previewLogger.warn('[交付物预览] 加载预览地址失败，回退到内容预览', {
              artifactId: artifact.id,
              error: error?.message || String(error)
            });
            if (htmlContent) {
              const blobUrl = api.createHtmlBlobUrl(pm, htmlContent);
              contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-iframe-container"><iframe src="${blobUrl}" class="artifact-preview-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="${pm.escapeHtml(artifact.name || '预览')}"></iframe></div></div>`;
            } else {
              contentHTML =
                '<div class="artifact-preview-empty"><div class="artifact-preview-empty-icon">🖥️</div><div>预览资源加载失败，请稍后重试</div></div>';
            }
          }
        } else if (htmlContent) {
          const blobUrl = api.createHtmlBlobUrl(pm, htmlContent);
          contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-iframe-container"><iframe src="${blobUrl}" class="artifact-preview-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="${pm.escapeHtml(artifact.name || '预览')}"></iframe></div></div>`;
        } else {
          contentHTML =
            '<div class="artifact-preview-empty"><div class="artifact-preview-empty-icon">🖥️</div><div>暂无预览内容</div></div>';
        }
      } else if (artifact.type === 'design' || artifact.type === 'image') {
        const imageUrl = artifact.imageUrl || artifact.url || '';
        if (imageUrl) {
          contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-image"><img src="${imageUrl}" alt="${pm.escapeHtml(artifact.name)}" /></div></div>`;
        } else {
          contentHTML =
            '<div class="artifact-preview-empty"><div class="artifact-preview-empty-icon">🎨</div><div>暂无设计稿</div></div>';
        }
      } else {
        const content = artifact.content || artifact.text || artifact.code || '';
        if (content) {
          if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) {
            const blobUrl = api.createHtmlBlobUrl(pm, content);
            contentHTML = `<div class="artifact-preview-content"><div class="artifact-preview-iframe-container"><iframe src="${blobUrl}" class="artifact-preview-iframe" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" title="${pm.escapeHtml(artifact.name || '预览')}"></iframe></div></div>`;
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
    ? `<button class="btn-primary" onclick="projectManager.openArtifactPreviewInNewWindow('${artifact.id}')">🔗 新窗口打开</button>`
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

    async openArtifactPreviewInNewWindow(pm, artifactId) {
      try {
        if (!pm.currentProject) {
          throw new Error('未选择项目');
        }
        const found = findArtifactById(pm.currentProject, artifactId);
        const artifact = found?.artifact;
        if (!artifact) {
          throw new Error('交付物不存在');
        }
        const previewUrl = artifact.previewUrl || artifact.url;
        if (!previewUrl) {
          throw new Error('交付物无可预览地址');
        }
        const resolved = await api.resolvePreviewUrl(pm, previewUrl);
        window.open(resolved, '_blank', 'noopener,noreferrer');
      } catch (error) {
        previewLogger.error('[交付物预览] 新窗口打开失败:', error);
        window.ErrorHandler?.showToast?.(`打开失败：${error.message}`, 'error');
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
      if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
      }
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
  };

  window.projectManagerArtifactPreview = api;
})();
