/**
 * 知识库模块
 * 负责知识库的展示和管理
 *
 * @module KnowledgeBase
 * @description 处理知识库的加载、搜索、过滤、组织和CRUD操作
 *
 * @requires state - 全局状态管理器
 * @requires stateManager - 状态管理器
 * @requires storageManager - 存储管理器
 * @requires projectManager - 项目管理器
 */

/* eslint-disable no-unused-vars, no-undef */

class KnowledgeBase {
  constructor() {
    this.state = window.state;
    this.fileTreeData = [];
    this.fileSearchKeyword = '';
    this.selectedFilePath = '';
    this.openedFromProjectPanel = false;
    this.previewObjectUrl = null;
    this.fileTreeOnlyMode = false;
    this.expandedDirectories = new Set();
  }

  /**
     * 显示知识库面板
     *
     * @async
     * @param {string} mode - 显示模式 ('global' | 'project')
     * @param {string|null} projectId - 项目ID（当mode为'project'时必需）
     * @returns {Promise<void>}
     *
     * @description
     * 显示知识库面板，隐藏聊天界面。
     * 支持全局模式和项目模式。
     */
  async showKnowledgeBase(mode = 'global', projectId = null) {
    this.openedFromProjectPanel = mode === 'project';
    this.fileTreeOnlyMode = mode === 'project';
    this.selectedFilePath = '';

    // 项目面板进入知识库时，只做“临时隐藏”，不清空项目上下文
    if (this.openedFromProjectPanel) {
      const panel = document.getElementById('projectPanel');
      const mainContent = document.querySelector('.main-content');
      if (panel) {
        panel.classList.remove('active');
        panel.style.display = 'none';
      }
      if (mainContent) {
        mainContent.classList.remove('project-panel-open');
      }
    } else if (window.projectManager) {
      // 非项目入口沿用原有行为
      window.projectManager.closeProjectPanel();
    }

    // 设置视图模式
    if (mode === 'project' && projectId) {
      window.stateManager.setKnowledgeViewMode('project');
      window.stateManager.setKnowledgeProjectFilter(projectId);
    } else {
      window.stateManager.setKnowledgeViewMode('global');
      window.stateManager.state.knowledge.currentProjectId = null;
    }

    // 加载知识数据
    await this.loadKnowledgeData(mode, projectId);

    // 隐藏聊天容器和输入框，显示知识库面板
    const chatContainer = document.getElementById('chatContainer');
    const knowledgePanel = document.getElementById('knowledgePanel');
    const inputContainer = document.getElementById('inputContainer');

    if (!knowledgePanel) {
      return;
    }

    if (chatContainer) {chatContainer.style.display = 'none';}
    knowledgePanel.classList.remove('closing');
    knowledgePanel.style.display = 'flex';
    if (inputContainer) {inputContainer.style.display = 'none';}

    const fileSearch = document.getElementById('fileSearch');
    if (fileSearch) {
      fileSearch.value = '';
    }
    this.fileSearchKeyword = '';

    this.applyKnowledgeViewMode();

    // 项目入口默认展示文件树，其他入口保持原有知识视图
    this.switchKnowledgeTab(this.openedFromProjectPanel ? 'files' : 'knowledge');
  }

  /**
     * 关闭知识库面板
     *
     * @description
     * 隐藏知识库面板，显示聊天界面。
     */
  closeKnowledgePanel(options = {}) {
    const knowledgePanel = document.getElementById('knowledgePanel');
    const chatContainer = document.getElementById('chatContainer');
    const inputContainer = document.getElementById('inputContainer');
    const shouldRestoreProjectPanel = Boolean(options?.showProjectPanel || this.openedFromProjectPanel);

    if (!knowledgePanel) {
      return;
    }

    knowledgePanel.classList.add('closing');

    setTimeout(() => {
      knowledgePanel.style.display = 'none';
      knowledgePanel.classList.remove('closing');

      if (shouldRestoreProjectPanel && window.projectManager?.currentProject) {
        const panel = document.getElementById('projectPanel');
        const mainContent = document.querySelector('.main-content');
        window.projectManager.renderProjectPanel(window.projectManager.currentProject);
        if (panel) {
          panel.style.display = 'flex';
          panel.classList.add('active');
        }
        if (mainContent) {
          mainContent.classList.add('project-panel-open');
        }
        this.openedFromProjectPanel = false;
        return;
      }
      if (shouldRestoreProjectPanel && window.projectManager?.currentProjectId) {
        window.projectManager.openProject(window.projectManager.currentProjectId);
        this.openedFromProjectPanel = false;
        return;
      }

      if (chatContainer) {chatContainer.style.display = 'flex';}
      if (inputContainer) {inputContainer.style.display = 'block';}
      this.openedFromProjectPanel = false;
    }, 250);
  }

  /**
     * 关闭知识库模态框
     *
     * @description
     * 关闭知识库模态框（如果存在）。
     */
  closeKnowledgeBase() {
    const modal = document.getElementById('knowledgeModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
     * 加载知识库数据
     *
     * @async
     * @param {string} mode - 加载模式 ('global' | 'project')
     * @param {string|null} projectId - 项目ID
     * @returns {Promise<void>}
     *
     * @throws {Error} 当加载失败时抛出错误
     *
     * @description
     * 从存储中加载知识库数据，更新状态并渲染UI。
     */
  async loadKnowledgeData(mode, projectId) {
    let items = [];

    try {
      if (mode === 'project' && projectId) {
        // 加载项目知识
        items = await window.storageManager.getKnowledgeByProject(projectId);
      } else {
        // 加载全局+所有项目知识
        items = await window.storageManager.getAllKnowledge();
      }

      // 更新状态
      window.stateManager.loadKnowledgeItems(items);

      // 渲染UI
      this.renderKnowledgeList();
      this.renderKnowledgeOrgTree();
    } catch (error) {
      alert('加载知识库失败: ' + error.message);
    }
  }

  /**
     * 切换知识库组织方式
     *
     * @param {string} orgType - 组织类型 ('byProject' | 'byType' | 'byTimeline' | 'byTags')
     *
     * @description
     * 切换知识库的组织方式，更新按钮状态并重新渲染组织树。
     */
  switchKnowledgeOrg(orgType) {
    // 更新状态
    window.stateManager.setKnowledgeOrganization(orgType);

    // 更新按钮状态
    const buttons = document.querySelectorAll('.knowledge-org-switcher button');
    buttons.forEach(btn => {
      if (btn.dataset.org === orgType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 重新渲染组织树
    this.renderKnowledgeOrgTree();
  }

  /**
     * 搜索知识库
     *
     * @param {string} keyword - 搜索关键词
     *
     * @description
     * 根据关键词过滤知识库内容并重新渲染列表。
     */
  onKnowledgeSearch(keyword) {
    window.stateManager.setKnowledgeSearchKeyword(keyword);
    this.renderKnowledgeList();
  }

  /**
     * 按类型过滤知识库
     *
     * @param {string} type - 知识类型
     *
     * @description
     * 根据类型过滤知识库内容并重新渲染列表。
     */
  onKnowledgeTypeFilter(type) {
    window.stateManager.setKnowledgeTypeFilter(type);
    this.renderKnowledgeList();
  }

  switchKnowledgeTab(tab = 'knowledge') {
    if (this.fileTreeOnlyMode) {
      tab = 'files';
    }

    const tabs = document.querySelectorAll('.knowledge-tabs button');
    tabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    const isFilesTab = tab === 'files';
    const knowledgeToolbar = document.getElementById('knowledgeToolbar');
    const knowledgeList = document.getElementById('knowledgeList');
    const knowledgeEmpty = document.getElementById('knowledgeEmpty');
    const knowledgeOrgTree = document.getElementById('knowledgeOrgTree');
    const fileTree = document.getElementById('fileTree');
    const filePanel = document.getElementById('filePanel');

    if (knowledgeToolbar) {knowledgeToolbar.style.display = isFilesTab ? 'none' : 'flex';}
    if (knowledgeList) {knowledgeList.style.display = isFilesTab ? 'none' : 'grid';}
    if (knowledgeEmpty) {knowledgeEmpty.style.display = isFilesTab ? 'none' : 'none';}
    if (knowledgeOrgTree) {knowledgeOrgTree.style.display = isFilesTab ? 'none' : 'block';}
    if (fileTree) {fileTree.style.display = isFilesTab ? 'block' : 'none';}
    if (filePanel) {filePanel.style.display = isFilesTab ? 'block' : 'none';}

    if (isFilesTab) {
      this.refreshFileTree();
    } else {
      this.renderKnowledgeList();
      this.renderKnowledgeOrgTree();
    }
  }

  getCurrentKnowledgeProjectId() {
    return (
      window.stateManager?.state?.knowledge?.currentProjectId ||
            window.projectManager?.currentProjectId ||
            null
    );
  }

  applyKnowledgeViewMode() {
    const tabsContainer = document.querySelector('.knowledge-tabs');
    const knowledgeToolbar = document.getElementById('knowledgeToolbar');
    const knowledgeList = document.getElementById('knowledgeList');
    const knowledgeEmpty = document.getElementById('knowledgeEmpty');
    const knowledgeOrgTree = document.getElementById('knowledgeOrgTree');
    const orgSwitcher = document.querySelector('.knowledge-org-switcher');
    const title = document.querySelector('.knowledge-panel-title');

    if (this.fileTreeOnlyMode) {
      if (tabsContainer) {tabsContainer.style.display = 'none';}
      if (knowledgeToolbar) {knowledgeToolbar.style.display = 'none';}
      if (knowledgeList) {knowledgeList.style.display = 'none';}
      if (knowledgeEmpty) {knowledgeEmpty.style.display = 'none';}
      if (knowledgeOrgTree) {knowledgeOrgTree.style.display = 'none';}
      if (orgSwitcher) {orgSwitcher.style.display = 'none';}
      if (title) {title.textContent = '项目文件树';}
      return;
    }

    if (tabsContainer) {tabsContainer.style.display = 'flex';}
    if (orgSwitcher) {orgSwitcher.style.display = 'grid';}
    if (title) {title.textContent = '知识库';}
  }

  async refreshFileTree() {
    const projectId = this.getCurrentKnowledgeProjectId();
    const treeContainer = document.getElementById('fileTree');

    if (!treeContainer) {
      return;
    }

    if (!projectId) {
      treeContainer.innerHTML = '<div style="padding: 12px; color: var(--text-secondary);">请先进入对应项目后查看该项目文档树</div>';
      return;
    }

    try {
      const result = await window.apiClient.request(`/api/workflow/${projectId}/artifacts/tree?depth=6`);
      this.fileTreeData = Array.isArray(result?.data?.tree) ? result.data.tree : [];
      this.renderFileTree();
    } catch (error) {
      treeContainer.innerHTML = '<div style="padding: 12px; color: #b91c1c;">文件树加载失败</div>';
    }
  }

  onFileSearch(keyword = '') {
    this.fileSearchKeyword = String(keyword || '').trim().toLowerCase();
    this.renderFileTree();
  }

  flattenFileTree(nodes = []) {
    const result = [];
    const walk = (items = []) => {
      items.forEach(item => {
        if (!item) {return;}
        if (item.type === 'file') {
          result.push(item);
        }
        if (Array.isArray(item.children) && item.children.length > 0) {
          walk(item.children);
        }
      });
    };
    walk(nodes);
    return result;
  }

  renderFileTree() {
    const treeContainer = document.getElementById('fileTree');
    if (!treeContainer) {return;}
    const keyword = this.fileSearchKeyword;

    const renderNodes = (nodes = [], depth = 0, parentPath = '') => {
      const rows = [];
      nodes.forEach(node => {
        const nodePath = node.path || `${parentPath}/${node.name || ''}`;
        if (node.type === 'directory') {
          const dirKey = `dir:${nodePath}`;
          const child = renderNodes(node.children || [], depth + 1, nodePath);
          const hasMatchedDescendant = child.hasMatch;
          const dirName = String(node.name || '').toLowerCase();
          const selfMatch = !keyword || dirName.includes(keyword);
          const visible = !keyword || selfMatch || hasMatchedDescendant;
          if (!visible) {
            return;
          }
          const isExpanded = keyword
            ? (selfMatch || hasMatchedDescendant)
            : (this.expandedDirectories.has(dirKey) || depth === 0);
          rows.push(`
                            <div class="org-group">
                                <div class="org-group-header" onclick="window.knowledgeBase.toggleDirectory('${encodeURIComponent(dirKey)}')">
                                    <span>${isExpanded ? '📂' : '📁'} ${node.name}</span>
                                </div>
                                <div class="org-group-content" style="display: ${isExpanded ? 'block' : 'none'}; margin-left: ${Math.max(depth, 0) * 8}px;">
                                    ${child.html}
                                </div>
                            </div>
                        `);
          return;
        }

        const name = String(node.name || '').toLowerCase();
        const path = String(node.path || '').toLowerCase();
        const matched = !keyword || name.includes(keyword) || path.includes(keyword);
        if (!matched) {
          return;
        }
        const isActive = (node.path || '') === this.selectedFilePath ? 'active' : '';
        rows.push(`<div class="org-item ${isActive}" style="padding-left:${10 + depth * 8}px" onclick="window.knowledgeBase.previewFile('${encodeURIComponent(node.path || '')}')">📄 ${node.name}</div>`);
      });

      const html = rows.join('');
      const hasMatch = rows.length > 0;
      if (depth === 0 && !hasMatch) {
        return {
          html: keyword
            ? '<div style="padding: 12px; color: var(--text-secondary);">无匹配文件</div>'
            : '<div style="padding: 12px; color: var(--text-secondary);">暂无文件</div>',
          hasMatch: false
        };
      }
      return { html, hasMatch };
    };

    const rendered = renderNodes(this.fileTreeData);
    if (!rendered.html) {
      if (keyword) {
        treeContainer.innerHTML = '<div style="padding: 12px; color: var(--text-secondary);">无匹配文件</div>';
        return;
      }
      treeContainer.innerHTML = '<div style="padding: 12px; color: var(--text-secondary);">暂无文件</div>';
      return;
    }
    treeContainer.innerHTML = rendered.html;
  }

  toggleDirectory(encodedDirKey) {
    const dirKey = decodeURIComponent(encodedDirKey || '');
    if (!dirKey) {return;}
    if (this.expandedDirectories.has(dirKey)) {
      this.expandedDirectories.delete(dirKey);
    } else {
      this.expandedDirectories.add(dirKey);
    }
    this.renderFileTree();
  }

  clearPreviewObjectUrl() {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  isImagePreview(filePath = '', contentType = '') {
    if (String(contentType || '').startsWith('image/')) {
      return true;
    }
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filePath || '');
  }

  isMarkdownFile(filePath = '', contentType = '') {
    if (String(contentType || '').includes('markdown')) {
      return true;
    }
    return /\.(md|markdown)$/i.test(filePath || '');
  }

  isTextPreview(filePath = '', contentType = '') {
    if (String(contentType || '').startsWith('text/')) {
      return true;
    }
    return /\.(txt|md|markdown|json|js|ts|tsx|jsx|css|scss|html?|xml|yaml|yml|csv|sql|sh|py|java|go|rs|c|cpp|h|hpp)$/i.test(filePath || '');
  }

  escapeHtml(text = '') {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\'', '&#39;');
  }

  async previewFile(encodedPath) {
    const filePath = decodeURIComponent(encodedPath || '');
    const filePreview = document.getElementById('filePreview');
    const projectId = this.getCurrentKnowledgeProjectId();
    this.clearPreviewObjectUrl();
    if (!filePreview) {return;}
    if (!filePath || !projectId) {
      filePreview.innerHTML = '<div class="empty-state"><div class="empty-title">请选择有效文件</div></div>';
      return;
    }

    this.selectedFilePath = filePath;
    this.renderFileTree();

    filePreview.innerHTML = `
      <div style="padding: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;">${this.escapeHtml(filePath)}</div>
        <div style="font-size: 13px; color: var(--text-secondary);">正在加载预览...</div>
      </div>
    `;

    const baseURL = window.apiClient?.baseURL || `${window.location.protocol}//${window.location.host}`;
    const downloadUrl = `${baseURL}/api/workflow/${projectId}/files/download?path=${encodeURIComponent(filePath)}`;

    try {
      if (window.apiClient?.ensureFreshToken) {
        await window.apiClient.ensureFreshToken();
      }
      const authToken = window.getAuthToken ? window.getAuthToken() : null;
      const response = await fetch(downloadUrl, {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`预览加载失败（${response.status}）`);
      }

      const contentType = response.headers.get('content-type') || '';

      if (this.isImagePreview(filePath, contentType)) {
        const blob = await response.blob();
        this.clearPreviewObjectUrl();
        this.previewObjectUrl = URL.createObjectURL(blob);
        filePreview.innerHTML = `
          <div style="padding: 16px; display: grid; gap: 12px;">
            <div style="font-weight: 600; word-break: break-all;">${this.escapeHtml(filePath)}</div>
            <img src="${this.previewObjectUrl}" alt="${this.escapeHtml(filePath)}" style="width: 100%; border-radius: 8px; border: 1px solid var(--border);" />
            <div>
              <a class="btn-secondary" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">下载文件</a>
            </div>
          </div>
        `;
        return;
      }

      if (this.isTextPreview(filePath, contentType)) {
        const text = await response.text();
        let renderedContent = `<pre>${this.escapeHtml(text)}</pre>`;

        if (this.isMarkdownFile(filePath, contentType) && window.markdownRenderer?.render) {
          renderedContent = window.markdownRenderer.render(text);
        }

        filePreview.innerHTML = `
          <div style="padding: 16px; display: grid; gap: 12px;">
            <div style="font-weight: 600; word-break: break-all;">${this.escapeHtml(filePath)}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">${this.escapeHtml(contentType || 'text/plain')}</div>
            <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: #fff;">
              ${renderedContent}
            </div>
            <div>
              <a class="btn-secondary" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">下载文件</a>
            </div>
          </div>
        `;
        return;
      }

      filePreview.innerHTML = `
        <div style="padding: 16px;">
          <div style="font-weight: 600; margin-bottom: 8px; word-break: break-all;">${this.escapeHtml(filePath)}</div>
          <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">当前文件类型暂不支持在线预览</div>
          <a class="btn-secondary" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">下载文件</a>
        </div>
      `;
    } catch (error) {
      filePreview.innerHTML = `
        <div style="padding: 16px;">
          <div style="font-weight: 600; margin-bottom: 8px; word-break: break-all;">${this.escapeHtml(filePath)}</div>
          <div style="font-size: 13px; color: #b91c1c; margin-bottom: 12px;">${this.escapeHtml(error.message || '预览失败')}</div>
          <a class="btn-secondary" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">下载文件</a>
        </div>
      `;
    }
  }

  /**
     * 渲染知识库列表
     *
     * @description
     * 渲染过滤后的知识库列表，显示卡片视图。
     * 如果没有内容，显示空状态。
     */
  renderKnowledgeList() {
    const items = window.stateManager.getFilteredKnowledgeItems();
    const listContainer = document.getElementById('knowledgeList');
    const emptyState = document.getElementById('knowledgeEmpty');

    if (items.length === 0) {
      listContainer.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }

    listContainer.style.display = 'grid';
    emptyState.style.display = 'none';

    listContainer.innerHTML = items.map(item => `
            <div class="knowledge-card" onclick="viewKnowledge('${item.id}')">
                <div class="knowledge-card-header">
                    <div class="knowledge-icon" style="background: ${this.getTypeColor(item.type)}">
                        ${item.icon || '📘'}
                    </div>
                    <div class="knowledge-card-title">${item.title || '未命名内容'}</div>
                </div>
                <div class="knowledge-card-content">
                    <p>${(item.content || '').substring(0, 80)}${(item.content || '').length > 80 ? '...' : ''}</p>
                    <div class="knowledge-card-meta">
                        <span class="badge" style="background: ${this.getTypeBadgeColor(item.type)}; color: ${this.getTypeBadgeTextColor(item.type)};">${this.getTypeLabel(item.type)}</span>
                        ${item.scope === 'global' ? '<span class="badge" style="background: #fef3c7; color: #92400e;">全局</span>' : ''}
                        <span class="badge time">${typeof formatTime === 'function' ? formatTime(item.createdAt) : ''}</span>
                    </div>
                    ${(item.tags || []).length > 0 ? `
                        <div class="knowledge-tags">
                            ${(item.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
  }

  /**
     * 渲染知识库组织树
     *
     * @description
     * 根据当前的组织类型渲染知识库的组织树视图。
     * 支持按项目、类型、时间线和标签组织。
     */
  renderKnowledgeOrgTree() {
    const orgType = window.stateManager.state.knowledge.organizationType;
    const items = window.stateManager.state.knowledge.items;
    const container = document.getElementById('knowledgeOrgTree');

    // 更新组织切换器按钮状态
    document.querySelectorAll('.knowledge-org-switcher button').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-org') === orgType) {
        btn.classList.add('active');
      }
    });

    switch (orgType) {
    case 'byProject':
      this.renderByProject(container, items);
      break;
    case 'byType':
      this.renderByType(container, items);
      break;
    case 'byTimeline':
      this.renderByTimeline(container, items);
      break;
    case 'byTags':
      this.renderByTags(container, items);
      break;
    default:
      break;
    }
  }

  /**
     * 按项目组织渲染
     *
     * @param {HTMLElement} container - 容器元素
     * @param {Array} items - 知识项列表
     */
  renderByProject(container, items) {
    const grouped = this.groupBy(items, item => item.projectId || 'global');
    const html = [];

    // 全局知识
    if (grouped.global && grouped.global.length > 0) {
      html.push(`
                <div class="org-group">
                    <div class="org-group-header" onclick="toggleOrgGroup('global')">
                        <span>🌍 全局知识库 (${grouped.global.length})</span>
                    </div>
                    <div class="org-group-content" id="org-global">
                        ${grouped.global.map(item => `
                            <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                ${item.icon} ${item.title}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `);
    }

    // 项目知识
    Object.keys(grouped).forEach(projectId => {
      if (projectId === 'global') {return;}
      const projectName = this.getProjectName(projectId);
      const projectItems = grouped[projectId];

      html.push(`
                <div class="org-group">
                    <div class="org-group-header" onclick="toggleOrgGroup('${projectId}')">
                        <span>📁 ${projectName} (${projectItems.length})</span>
                    </div>
                    <div class="org-group-content" id="org-${projectId}">
                        ${projectItems.map(item => `
                            <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                ${item.icon} ${item.title}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `);
    });

    container.innerHTML = html.join('');
  }

  /**
     * 按类型组织渲染
     *
     * @param {HTMLElement} container - 容器元素
     * @param {Array} items - 知识项列表
     */
  renderByType(container, items) {
    const grouped = this.groupBy(items, 'type');
    const typeLabels = {
      'prd': { label: 'PRD文档', icon: '📄' },
      'tech': { label: '技术方案', icon: '🤖' },
      'analysis': { label: '市场分析', icon: '📊' },
      'research': { label: '用户调研', icon: '👥' },
      'design': { label: '设计稿', icon: '🎨' },
      'other': { label: '其他', icon: '📋' }
    };

    const html = [];
    Object.keys(grouped).forEach(type => {
      const typeInfo = typeLabels[type] || { label: '其他', icon: '📋' };
      const typeItems = grouped[type];

      html.push(`
                <div class="org-group">
                    <div class="org-group-header" onclick="toggleOrgGroup('type-${type}')">
                        <span>${typeInfo.icon} ${typeInfo.label} (${typeItems.length})</span>
                    </div>
                    <div class="org-group-content" id="org-type-${type}">
                        ${typeItems.map(item => `
                            <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                ${item.icon} ${item.title}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `);
    });

    container.innerHTML = html.join('');
  }

  /**
     * 按时间线组织渲染
     *
     * @param {HTMLElement} container - 容器元素
     * @param {Array} items - 知识项列表
     */
  renderByTimeline(container, items) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    const timelines = {
      today: { label: '今天', items: [] },
      week: { label: '本周', items: [] },
      month: { label: '本月', items: [] },
      older: { label: '更早', items: [] }
    };

    items.forEach(item => {
      const diff = now - item.createdAt;
      if (diff < day) {
        timelines.today.items.push(item);
      } else if (diff < 7 * day) {
        timelines.week.items.push(item);
      } else if (diff < 30 * day) {
        timelines.month.items.push(item);
      } else {
        timelines.older.items.push(item);
      }
    });

    const html = [];
    Object.keys(timelines).forEach(key => {
      const timeline = timelines[key];
      if (timeline.items.length === 0) {return;}

      html.push(`
                <div class="org-group">
                    <div class="org-group-header" onclick="toggleOrgGroup('time-${key}')">
                        <span>📅 ${timeline.label} (${timeline.items.length})</span>
                    </div>
                    <div class="org-group-content" id="org-time-${key}">
                        ${timeline.items.map(item => `
                            <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                ${item.icon} ${item.title}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `);
    });

    container.innerHTML = html.join('');
  }

  /**
     * 按标签组织渲染
     *
     * @param {HTMLElement} container - 容器元素
     * @param {Array} items - 知识项列表
     */
  renderByTags(container, items) {
    const stats = window.stateManager.state.knowledge.stats;
    const tags = Object.keys(stats.byTag).sort((a, b) => stats.byTag[b] - stats.byTag[a]);

    if (tags.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">暂无标签</div>';
      return;
    }

    const html = tags.map(tag => {
      const count = stats.byTag[tag];
      return `
                <div class="org-group">
                    <div class="org-group-header" onclick="filterByTag('${tag}')">
                        <span>🏷️ ${tag} (${count})</span>
                    </div>
                </div>
            `;
    }).join('');

    container.innerHTML = html;
  }

  /**
     * 查看知识详情
     *
     * @async
     * @param {string} id - 知识ID
     * @returns {Promise<void>}
     *
     * @description
     * 显示知识详情模态框，增加浏览次数。
     */
  async viewKnowledge(id) {
    const item = await window.storageManager.getKnowledge(id);
    if (!item) {
      alert('知识不存在');
      return;
    }

    // 增加浏览次数
    item.viewCount = (item.viewCount || 0) + 1;
    await window.storageManager.saveKnowledge(item);

    // 创建知识详情弹窗
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <div class="modal-title">${item.icon} ${item.title}</div>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div style="margin-bottom: 16px;">
                        <span class="badge" style="background: ${this.getTypeBadgeColor(item.type)}; color: ${this.getTypeBadgeTextColor(item.type)};">${this.getTypeLabel(item.type)}</span>
                        ${item.scope === 'global' ? '<span class="badge" style="background: #fef3c7; color: #92400e; margin-left: 8px;">全局</span>' : ''}
                    </div>
                    ${(item.tags || []).length > 0 ? `
                        <div style="margin-bottom: 16px;">
                            ${(item.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div style="white-space: pre-wrap; line-height: 1.8; color: var(--text-primary);">
                        ${item.content}
                    </div>
                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 12px; color: var(--text-tertiary);">
                        <div>创建时间：${new Date(item.createdAt).toLocaleString('zh-CN')}</div>
                        <div>浏览次数：${item.viewCount}</div>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    // 点击背景关闭
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
     * 创建新知识
     *
     * @async
     * @returns {Promise<void>}
     *
     * @description
     * 显示创建知识的模态框，收集用户输入并保存。
     */
  async createKnowledge() {
    // 创建新建知识弹窗
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <div class="modal-title">✨ 新建知识</div>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body" style="padding: 24px;">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">标题</label>
                        <input type="text" id="knowledgeTitleInput" placeholder="输入知识标题..." style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">类型</label>
                        <select id="knowledgeTypeInput" style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px;">
                            <option value="prd">产品需求文档 (PRD)</option>
                            <option value="tech">技术方案</option>
                            <option value="analysis">市场分析</option>
                            <option value="research">调研报告</option>
                            <option value="summary">会议纪要</option>
                            <option value="idea">创意想法</option>
                            <option value="other">其他</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">内容</label>
                        <textarea id="knowledgeContentInput" placeholder="输入知识内容..." style="width: 100%; min-height: 200px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; resize: vertical;"></textarea>
                    </div>
                    <div style="margin-bottom: 24px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500;">标签 <span style="font-weight: normal; color: var(--text-tertiary); font-size: 12px;">(用逗号分隔)</span></label>
                        <input type="text" id="knowledgeTagsInput" placeholder="例如: 产品, 需求, v1.0" style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px;">
                    </div>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                        <button class="btn-primary" id="saveKnowledgeBtn" onclick="saveNewKnowledge()">保存</button>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(modal);

    // 聚焦标题输入框
    setTimeout(() => {
      document.getElementById('knowledgeTitleInput').focus();
    }, 100);

    // 点击背景关闭
    modal.addEventListener('click', function (e) {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
     * 保存新知识
     *
     * @async
     * @returns {Promise<void>}
     *
     * @description
     * 验证并保存用户创建的新知识。
     */
  async saveNewKnowledge() {
    const title = document.getElementById('knowledgeTitleInput').value.trim();
    const type = document.getElementById('knowledgeTypeInput').value;
    const content = document.getElementById('knowledgeContentInput').value.trim();
    const tagsInput = document.getElementById('knowledgeTagsInput').value.trim();

    if (!title) {
      alert('请输入标题');
      return;
    }

    if (!content) {
      alert('请输入内容');
      return;
    }

    // 解析标签
    const tags = tagsInput ? tagsInput.split(/[,，]/).map(t => t.trim()).filter(t => t) : [];

    const currentProjectId = window.stateManager?.state?.knowledge?.currentProjectId
            || window.projectManager?.currentProjectId
            || window.appState?.currentProject?.id
            || this.state.currentProject
            || null;

    // 创建知识对象
    const knowledge = {
      id: Date.now().toString(),
      title: title,
      type: type,
      content: content,
      tags: tags,
      icon: this.getTypeIcon(type),
      scope: currentProjectId ? 'project' : 'global',
      projectId: currentProjectId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      viewCount: 0
    };

    try {
      // 保存到数据库
      await window.storageManager.saveKnowledge(knowledge);

      // 关闭弹窗
      document.querySelector('.modal').remove();

      // 重新加载知识库
      const mode = currentProjectId ? 'project' : 'global';
      await this.loadKnowledgeData(mode, currentProjectId);

      alert('✅ 知识创建成功！');
    } catch (error) {
      alert('❌ 保存失败: ' + error.message);
    }
  }

  // ==================== 辅助方法 ====================

  /**
     * 分组函数
     *
     * @param {Array} array - 要分组的数组
     * @param {string|Function} key - 分组键或函数
     * @returns {Object} 分组后的对象
     */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const group = typeof key === 'function' ? key(item) : item[key];
      if (!result[group]) {
        result[group] = [];
      }
      result[group].push(item);
      return result;
    }, {});
  }

  /**
     * 获取项目名称
     *
     * @param {string} projectId - 项目ID
     * @returns {string} 项目名称
     */
  getProjectName(projectId) {
    if (window.projectManager && window.projectManager.projects) {
      const project = window.projectManager.projects.find(p => p.id === projectId);
      if (project) {
        return project.name || '未命名项目';
      }
    }
    return '未知项目';
  }

  /**
     * 获取类型颜色
     *
     * @param {string} type - 知识类型
     * @returns {string} 颜色值
     */
  getTypeColor(type) {
    const colors = {
      'prd': '#dbeafe',
      'tech': '#e0e7ff',
      'analysis': '#fce7f3',
      'research': '#fef3c7',
      'design': '#d1fae5',
      'other': '#f3f4f6'
    };
    return colors[type] || colors.other;
  }

  /**
     * 获取类型徽章颜色
     *
     * @param {string} type - 知识类型
     * @returns {string} 颜色值
     */
  getTypeBadgeColor(type) {
    const colors = {
      'prd': '#dbeafe',
      'tech': '#e0e7ff',
      'analysis': '#fce7f3',
      'research': '#fef3c7',
      'design': '#d1fae5',
      'other': '#f3f4f6'
    };
    return colors[type] || colors.other;
  }

  /**
     * 获取类型徽章文字颜色
     *
     * @param {string} type - 知识类型
     * @returns {string} 颜色值
     */
  getTypeBadgeTextColor(type) {
    const colors = {
      'prd': '#1e40af',
      'tech': '#4338ca',
      'analysis': '#9f1239',
      'research': '#92400e',
      'design': '#065f46',
      'other': '#374151'
    };
    return colors[type] || colors.other;
  }

  /**
     * 获取类型标签
     *
     * @param {string} type - 知识类型
     * @returns {string} 类型标签
     */
  getTypeLabel(type) {
    const labels = {
      'prd': 'PRD',
      'tech': '技术',
      'analysis': '分析',
      'research': '调研',
      'design': '设计',
      'summary': '纪要',
      'idea': '创意',
      'other': '其他'
    };
    return labels[type] || '其他';
  }

  /**
     * 获取类型图标
     *
     * @param {string} type - 知识类型
     * @returns {string} 图标emoji
     */
  getTypeIcon(type) {
    const icons = {
      'prd': '📄',
      'tech': '🤖',
      'analysis': '📊',
      'research': '👥',
      'design': '🎨',
      'summary': '📝',
      'idea': '💡',
      'other': '📋'
    };
    return icons[type] || '📋';
  }
}

// 创建全局实例
window.knowledgeBase = new KnowledgeBase();

// 暴露全局函数（向后兼容）
function showKnowledgeBase(mode, projectId) {
  return window.knowledgeBase.showKnowledgeBase(mode, projectId);
}

function closeKnowledgePanel(options) {
  window.knowledgeBase.closeKnowledgePanel(options);
}

function closeKnowledgeBase() {
  window.knowledgeBase.closeKnowledgeBase();
}

function switchKnowledgeOrg(type) {
  window.knowledgeBase.switchKnowledgeOrg(type);
}

function onKnowledgeSearch(keyword) {
  window.knowledgeBase.onKnowledgeSearch(keyword);
}

function onKnowledgeTypeFilter(type) {
  window.knowledgeBase.onKnowledgeTypeFilter(type);
}

function switchKnowledgeTab(tab) {
  window.knowledgeBase.switchKnowledgeTab(tab);
}

function refreshFileTree() {
  return window.knowledgeBase.refreshFileTree();
}

function onFileSearch(keyword) {
  return window.knowledgeBase.onFileSearch(keyword);
}

function createKnowledge() {
  return window.knowledgeBase.createKnowledge();
}

function saveNewKnowledge() {
  return window.knowledgeBase.saveNewKnowledge();
}

function viewKnowledge(id) {
  return window.knowledgeBase.viewKnowledge(id);
}

function toggleOrgGroup(groupId) {
  const content = document.getElementById(`org-${groupId}`);
  if (content) {
    const isCollapsed = content.classList.contains('collapsed');
    if (isCollapsed) {
      content.classList.remove('collapsed');
    } else {
      content.classList.add('collapsed');
    }
  }
}

function selectKnowledge(id) {
  viewKnowledge(id);
}

function filterByTag(tag) {
  window.stateManager.setKnowledgeTagsFilter([tag]);
  window.knowledgeBase.renderKnowledgeList();
}

// 暴露全局函数（用于 HTML onclick 事件）
window.showKnowledgeBase = showKnowledgeBase;
window.closeKnowledgePanel = closeKnowledgePanel;
window.closeKnowledgeBase = closeKnowledgeBase;
window.switchKnowledgeOrg = switchKnowledgeOrg;
window.onKnowledgeSearch = onKnowledgeSearch;
window.onKnowledgeTypeFilter = onKnowledgeTypeFilter;
window.switchKnowledgeTab = switchKnowledgeTab;
window.refreshFileTree = refreshFileTree;
window.onFileSearch = onFileSearch;
window.createKnowledge = createKnowledge;
window.saveNewKnowledge = saveNewKnowledge;
window.viewKnowledge = viewKnowledge;
window.toggleOrgGroup = toggleOrgGroup;
window.selectKnowledge = selectKnowledge;
window.filterByTag = filterByTag;
