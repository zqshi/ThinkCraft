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

  const EDITABLE_TEXT_TYPES = new Set([
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
    'design-spec',
    'code',
    'frontend-code',
    'backend-code',
    'component-lib',
    'api-doc',
    'api-spec',
    'tech-stack',
    'env-config',
    'release-notes',
    'bug-list',
    'performance-report',
    'research-analysis-doc',
    'core-prompt-design',
    'growth-strategy',
    'analytics-report'
  ]);
  const RICH_TEXT_TYPES = new Set([
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
  const CODE_EDITOR_TYPES = new Set([
    'code',
    'frontend-code',
    'backend-code',
    'component-lib',
    'api-doc',
    'api-spec',
    'tech-stack',
    'env-config'
  ]);

  const api = {
    icon(name) {
      const map = {
        edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10-10-4-4L4 16v4zm13.7-11.3 1.6-1.6a1 1 0 0 0 0-1.4l-1.3-1.3a1 1 0 0 0-1.4 0L15 6l2.7 2.7z"/></svg>',
        cancel:
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5V2L7 7l5 5V9c3.3 0 6 2.7 6 6a6 6 0 0 1-6 6 6 6 0 0 1-5.7-4H4.2A8 8 0 0 0 12 23a8 8 0 0 0 0-16z"/></svg>',
        save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4zM7 5h8v4H7V5zm5 14a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>',
        download:
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20h14v-2H5v2zM11 4h2v8h3l-4 4-4-4h3V4z"/></svg>',
        copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm4 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h12v14z"/></svg>',
        open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3zM19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7z"/></svg>'
      };
      return map[name] || '';
    },

    destroyArtifactEditor(pm) {
      const adapter = pm?._artifactEditorAdapter;
      if (adapter && typeof adapter.destroy === 'function') {
        try {
          adapter.destroy();
        } catch (_error) {
          // ignore stale editor cleanup errors
        }
      }
      if (pm) {
        pm._artifactEditorAdapter = null;
      }
    },

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

    isEditableTextArtifact(artifact) {
      const type = String(artifact?.type || '')
        .trim()
        .toLowerCase();
      if (!type) {
        return false;
      }
      return EDITABLE_TEXT_TYPES.has(type);
    },

    isRichTextArtifact(artifact) {
      const type = String(artifact?.type || '')
        .trim()
        .toLowerCase();
      if (!type) {
        return false;
      }
      return RICH_TEXT_TYPES.has(type);
    },

    isCodeArtifact(artifact) {
      const type = String(artifact?.type || '')
        .trim()
        .toLowerCase();
      if (!type) {
        return false;
      }
      return CODE_EDITOR_TYPES.has(type);
    },

    normalizeEditableContent(content) {
      return String(content || '')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&amp;', '&');
    },

    normalizeMarkdownEscapes(content) {
      let normalized = String(content || '');
      if (
        !normalized.includes('\n') &&
        (normalized.includes('\\n') || normalized.includes('\\r\\n'))
      ) {
        normalized = normalized.replaceAll('\\r\\n', '\n').replaceAll('\\n', '\n');
      }
      if (!normalized.includes('\t') && normalized.includes('\\t')) {
        normalized = normalized.replaceAll('\\t', '\t');
      }
      const lines = normalized
        .replaceAll('\r\n', '\n')
        // Keep one escaping slash before markdown punctuation first.
        .replace(/\\{2,}(?=\\|`|\*|_|{|}|\[|\]|\(|\)|#|\+|-|\.|!|\||>)/g, '\\')
        .split('\n');

      let inFence = false;
      const sanitized = lines.map(line => {
        if (/^\s*```/.test(line)) {
          inFence = !inFence;
          return line;
        }
        if (inFence) {
          return line;
        }
        // Our markdown renderer doesn't support escape parsing, so strip markdown escapes.
        return line.replace(/\\(#|>|\*|_|-|\[|\]|\(|\)|\||`)/g, '$1').replace(/(\d+)\\\./g, '$1.');
      });
      return sanitized.join('\n');
    },

    async ensureEditorAdaptersLoaded() {
      if (window.EditorAdapters?.createTiptap && window.EditorAdapters?.createCodeMirror) {
        return true;
      }
      try {
        await import('/frontend/js/modules/editor-adapters.js');
      } catch (_error) {
        // noop
      }
      return Boolean(
        window.EditorAdapters?.createTiptap || window.EditorAdapters?.createCodeMirror
      );
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
      } catch (_error) {
        // fallback to apiBase comparison below
      }
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
      api.destroyArtifactEditor(pm);
      if (pm) {
        pm.artifactEditorState = null;
      }
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
      const isEditing =
        pm?.artifactEditorState?.active === true &&
        pm?.artifactEditorState?.artifactId === artifact.id;
      const editorTextareaId = isEditing ? `artifactEditorText-${artifact.id}` : '';

      const icon = pm.getArtifactIcon(artifact.type);
      const typeLabel = pm.getArtifactTypeLabel(artifact);
      let contentHTML = '';

      if (RICH_TEXT_TYPES.has(artifact.type)) {
        const content = artifact.content || artifact.text || '';
        if (content) {
          const normalized = api.normalizeMarkdownEscapes(String(content));
          let renderedContent = '';
          if (window.markdownRenderer) {
            renderedContent = window.markdownRenderer.render(normalized);
          } else if (window.marked) {
            renderedContent = window.marked.parse(normalized);
          } else {
            renderedContent = normalized.replace(/\n/g, '<br>');
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

      const useRichEditor = isEditing && api.isRichTextArtifact(artifact);
      const useCodeEditor = isEditing && api.isCodeArtifact(artifact);
      const headerActionsHTML = `
      <div class="stage-detail-header-actions">
        ${
          api.isEditableTextArtifact(artifact)
            ? isEditing
              ? `<button class="stage-detail-action-btn" title="取消编辑" aria-label="取消编辑" onclick="projectManager.cancelArtifactEdits('${artifact.id}')">${api.icon('cancel')}</button>
                 <button class="stage-detail-action-btn stage-detail-action-btn-primary" title="保存修改" aria-label="保存修改" onclick="projectManager.saveArtifactEdits('${artifact.id}', '${editorTextareaId}')">${api.icon('save')}</button>`
              : `<button class="stage-detail-action-btn stage-detail-action-btn-primary" title="编辑文本" aria-label="编辑文本" onclick="projectManager.openArtifactEditor('${artifact.id}')">${api.icon('edit')}</button>`
            : ''
        }
        ${
          artifact.downloadUrl || artifact.url || artifact.previewUrl
            ? `<button class="stage-detail-action-btn" title="下载" aria-label="下载" onclick="projectManager.downloadArtifact('${artifact.id}')">${api.icon('download')}</button>`
            : ''
        }
        ${
          artifact.content || artifact.text || artifact.code
            ? `<button class="stage-detail-action-btn" title="复制内容" aria-label="复制内容" onclick="projectManager.copyArtifactContent('${artifact.id}')">${api.icon('copy')}</button>`
            : ''
        }
        ${
          artifact.previewUrl || artifact.url
            ? `<button class="stage-detail-action-btn" title="新窗口打开" aria-label="新窗口打开" onclick="projectManager.openArtifactPreviewInNewWindow('${artifact.id}')">${api.icon('open')}</button>`
            : ''
        }
      </div>`;

      pm.stageDetailPanel.innerHTML = `
      <div class="stage-detail-header">
        <div class="stage-detail-header-top">
          <div class="stage-detail-title"><span>${icon}</span><span>${pm.escapeHtml(artifact.name || artifact.fileName || '未命名交付物')}</span></div>
          <div class="stage-detail-header-right">
            ${headerActionsHTML}
            <button class="stage-detail-close" title="关闭" aria-label="关闭" onclick="projectManager.closeArtifactPreviewPanel()">×</button>
          </div>
        </div>
        <div class="stage-detail-meta">
          <div class="stage-detail-meta-item"><span class="label">阶段:</span><span class="value">${pm.escapeHtml(stage.name)}</span></div>
          <div class="stage-detail-meta-item"><span class="label">类型:</span><span class="value">${typeLabel}</span></div>
        </div>
      </div>
      <div class="stage-detail-body">${contentHTML}</div>`;

      if (isEditing) {
        const normalizedSource = api.normalizeEditableContent(
          artifact.content || artifact.text || artifact.code || ''
        );
        const initialContent = api.isRichTextArtifact(artifact)
          ? api.normalizeMarkdownEscapes(normalizedSource)
          : normalizedSource;
        const editorBody = pm.stageDetailPanel.querySelector('.stage-detail-body');
        if (editorBody) {
          if (useRichEditor) {
            const richEditorId = `artifactRichEditor-${artifact.id}`;
            const richToolbarId = `artifactRichToolbar-${artifact.id}`;
            editorBody.innerHTML = `
              <div class="artifact-editor-tip">支持字体、字号、颜色、对齐方式等富文本排版，保存后将同步到项目空间文件。</div>
              <div id="${richToolbarId}" class="artifact-editor-toolbar"></div>
              <div class="artifact-editor-wrap">
                <div id="${richEditorId}" class="artifact-editor-tiptap"></div>
              </div>
            `;
            setTimeout(() => {
              const mount = document.getElementById(richEditorId);
              const toolbar = document.getElementById(richToolbarId);
              if (!mount || !toolbar) {
                return;
              }
              api.destroyArtifactEditor(pm);
              (async () => {
                const ready = await api.ensureEditorAdaptersLoaded();
                if (ready && window.EditorAdapters?.createTiptap) {
                  pm._artifactEditorAdapter = window.EditorAdapters.createTiptap({
                    mount,
                    toolbar,
                    content: initialContent
                  });
                } else {
                  mount.innerHTML = `<textarea id="${editorTextareaId}" class="artifact-editor-textarea">${api.escapeHtml(initialContent)}</textarea>`;
                  window.ErrorHandler?.showToast?.(
                    '富文本编辑器未就绪，已降级为纯文本模式',
                    'warning'
                  );
                }
              })();
            }, 0);
          } else if (useCodeEditor) {
            const codeEditorId = `artifactCodeEditor-${artifact.id}`;
            editorBody.innerHTML = `
              <div class="artifact-editor-tip">代码类交付物使用 CodeMirror 编辑，支持语法高亮与快捷键。</div>
              <div class="artifact-editor-wrap">
                <div id="${codeEditorId}" class="artifact-editor-cm-host"></div>
              </div>
            `;
            setTimeout(() => {
              const mount = document.getElementById(codeEditorId);
              if (!mount) {
                return;
              }
              api.destroyArtifactEditor(pm);
              (async () => {
                const ready = await api.ensureEditorAdaptersLoaded();
                if (ready && window.EditorAdapters?.createCodeMirror) {
                  pm._artifactEditorAdapter = window.EditorAdapters.createCodeMirror({
                    mount,
                    content: initialContent,
                    language: artifact.language || '',
                    type: artifact.type || '',
                    fileName: artifact.fileName || artifact.name || ''
                  });
                } else {
                  mount.innerHTML = `<textarea id="${editorTextareaId}" class="artifact-editor-textarea">${api.escapeHtml(initialContent)}</textarea>`;
                  window.ErrorHandler?.showToast?.(
                    '代码编辑器未就绪，已降级为纯文本模式',
                    'warning'
                  );
                }
              })();
            }, 0);
          } else {
            editorBody.innerHTML = `
              <div class="artifact-editor-tip">编辑后将直接覆盖当前交付物内容并同步到项目空间文件。</div>
              <div class="artifact-editor-wrap">
                <textarea id="${editorTextareaId}" class="artifact-editor-textarea">${api.escapeHtml(initialContent)}</textarea>
              </div>
            `;
          }
        }
      } else {
        api.destroyArtifactEditor(pm);
      }

      if (
        window.Prism &&
        (artifact.type === 'code' ||
          artifact.type === 'frontend-code' ||
          artifact.type === 'backend-code')
      ) {
        setTimeout(() => window.Prism.highlightAll(), 100);
      }
    },

    async openArtifactEditor(pm, artifactId) {
      try {
        if (!pm.currentProject) {
          throw new Error('未选择项目');
        }
        const found = findArtifactById(pm.currentProject, artifactId);
        const artifact = found?.artifact;
        if (!artifact) {
          throw new Error('交付物不存在');
        }
        if (!api.isEditableTextArtifact(artifact)) {
          throw new Error('该交付物类型暂不支持文本编辑');
        }
        pm.artifactEditorState = {
          active: true,
          artifactId
        };
        await api.renderArtifactPreviewPanel(pm, pm.currentProject, found.stage, artifact);
      } catch (error) {
        window.ErrorHandler?.showToast?.(`打开编辑器失败：${error.message}`, 'error');
      }
    },

    async cancelArtifactEdits(pm, artifactId) {
      try {
        if (pm?.artifactEditorState?.artifactId !== artifactId) {
          return;
        }
        pm.artifactEditorState = null;
        if (!pm.currentProject) {
          return;
        }
        const found = findArtifactById(pm.currentProject, artifactId);
        if (!found?.artifact || !found?.stage) {
          return;
        }
        await api.renderArtifactPreviewPanel(pm, pm.currentProject, found.stage, found.artifact);
      } catch (error) {
        window.ErrorHandler?.showToast?.(`取消编辑失败：${error.message}`, 'error');
      }
    },

    async saveArtifactEdits(pm, artifactId, textareaId) {
      try {
        if (!pm.currentProject?.id) {
          throw new Error('未选择项目');
        }
        const found = findArtifactById(pm.currentProject, artifactId);
        const artifact = found?.artifact;
        const stage = found?.stage;
        if (!artifact || !stage) {
          throw new Error('交付物不存在');
        }

        let content = '';
        if (
          pm._artifactEditorAdapter &&
          typeof pm._artifactEditorAdapter.getContent === 'function'
        ) {
          content = String(pm._artifactEditorAdapter.getContent() || '');
        } else {
          const textarea = document.getElementById(textareaId);
          content = String(textarea?.value || '');
        }
        if (api.isRichTextArtifact(artifact)) {
          content = api.normalizeMarkdownEscapes(content);
        }

        const response = await pm.fetchWithAuth(
          `${pm.apiUrl}/api/workflow/${encodeURIComponent(pm.currentProject.id)}/artifacts/${encodeURIComponent(artifactId)}`,
          {
            method: 'PUT',
            headers: pm.buildAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ content })
          }
        );
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result?.code !== 0) {
          throw new Error(
            result?.error || result?.message || `保存失败（HTTP ${response.status}）`
          );
        }

        const updated = result?.data?.artifact || { ...artifact, content };
        const targetStage = (pm.currentProject.workflow?.stages || []).find(s => s.id === stage.id);
        if (targetStage) {
          targetStage.artifacts = (targetStage.artifacts || []).map(item =>
            item?.id === artifactId ? { ...item, ...updated } : item
          );
          targetStage.artifactsUpdatedAt = Date.now();
        }

        await pm.storageManager?.saveProject?.(pm.currentProject).catch(() => {});
        await pm.storageManager?.saveArtifact?.(updated).catch(() => {});

        pm.artifactEditorState = null;
        api.destroyArtifactEditor(pm);
        window.ErrorHandler?.showToast?.('交付物已保存', 'success');
        await api.renderArtifactPreviewPanel(pm, pm.currentProject, stage, updated);
      } catch (error) {
        window.ErrorHandler?.showToast?.(`保存失败：${error.message}`, 'error');
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
        const downloadUrl = artifact.downloadUrl || artifact.url || artifact.previewUrl;
        if (!downloadUrl) {
          throw new Error('交付物无下载链接');
        }

        const absoluteUrl = api.toAbsoluteUrl(pm, downloadUrl);
        const requiresAuth = api.needsAuthProxy(pm, absoluteUrl);
        let response = null;

        if (requiresAuth) {
          response = await pm.fetchWithAuth(absoluteUrl, { method: 'GET' });
        } else {
          try {
            response = await fetch(absoluteUrl, { method: 'GET', credentials: 'include' });
          } catch (_fetchError) {
            response = null;
          }
        }

        if (!response || !response.ok) {
          if (!requiresAuth) {
            const a = document.createElement('a');
            a.href = absoluteUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.ErrorHandler?.showToast?.('已打开下载链接', 'success');
            return;
          }
          const status = response ? response.status : 0;
          throw new Error(`下载失败（HTTP ${status}）`);
        }

        const blob = await response.blob();
        if (!blob || blob.size === 0) {
          throw new Error('下载内容为空');
        }
        const fileName = api.inferDownloadFileName(
          artifact,
          response.headers.get('content-disposition')
        );
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
        window.ErrorHandler?.showToast?.('下载已开始', 'success');
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
    },

    inferDownloadFileName(artifact, contentDisposition) {
      const raw = String(contentDisposition || '');
      const utf8Match = raw.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
      if (utf8Match?.[1]) {
        try {
          return decodeURIComponent(utf8Match[1]);
        } catch (_error) {
          return utf8Match[1];
        }
      }
      const quotedMatch = raw.match(/filename\s*=\s*"([^"]+)"/i);
      if (quotedMatch?.[1]) {
        return quotedMatch[1];
      }
      const plainMatch = raw.match(/filename\s*=\s*([^;]+)/i);
      if (plainMatch?.[1]) {
        return plainMatch[1].trim();
      }
      return artifact.fileName || artifact.name || 'download.txt';
    }
  };

  window.projectManagerArtifactPreview = api;
})();
