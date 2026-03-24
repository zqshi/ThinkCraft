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
    this.localFileMap = new Map();
    this.fileSearchKeyword = '';
    this.selectedFilePath = '';
    this.selectedFileMeta = null;
    this.openedFromProjectPanel = false;
    this.previewObjectUrl = null;
    this.fileTreeOnlyMode = false;
    this.expandedDirectories = new Set();
    this.filePreviewMode = 'rendered';
    this.fileContextStats = { fileCount: 0, directoryCount: 0, artifactCount: 0 };
    this.currentPreviewAnchors = [];
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

    if (chatContainer) {
      chatContainer.style.display = 'none';
    }
    knowledgePanel.classList.remove('closing');
    knowledgePanel.style.display = 'flex';
    if (inputContainer) {
      inputContainer.style.display = 'none';
    }

    const fileSearch = document.getElementById('fileSearch');
    if (fileSearch) {
      fileSearch.value = '';
    }
    this.fileSearchKeyword = '';
    this.filePreviewMode = 'rendered';
    this.selectedFileMeta = null;

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
    const shouldRestoreProjectPanel = Boolean(
      options?.showProjectPanel || this.openedFromProjectPanel
    );

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

      if (chatContainer) {
        chatContainer.style.display = 'flex';
      }
      if (inputContainer) {
        inputContainer.style.display = 'block';
      }
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
    const panel = document.getElementById('knowledgePanel');
    const fileContextBar = document.getElementById('fileContextBar');
    const fileToolbar = document.getElementById('fileToolbar');

    if (knowledgeToolbar) {
      knowledgeToolbar.style.display = isFilesTab ? 'none' : 'flex';
    }
    if (knowledgeList) {
      knowledgeList.style.display = isFilesTab ? 'none' : 'grid';
    }
    if (knowledgeEmpty) {
      knowledgeEmpty.style.display = isFilesTab ? 'none' : 'none';
    }
    if (knowledgeOrgTree) {
      knowledgeOrgTree.style.display = isFilesTab ? 'none' : 'block';
    }
    if (fileTree) {
      fileTree.style.display = isFilesTab ? 'block' : 'none';
    }
    if (filePanel) {
      filePanel.style.display = isFilesTab ? 'block' : 'none';
    }
    if (fileContextBar) {
      fileContextBar.style.display = isFilesTab ? 'grid' : 'none';
    }
    if (fileToolbar) {
      fileToolbar.style.display = isFilesTab ? 'flex' : 'none';
    }
    if (panel) {
      panel.classList.toggle('is-files-tab', isFilesTab);
    }

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
    const panel = document.getElementById('knowledgePanel');
    const tabsContainer = document.querySelector('.knowledge-tabs');
    const knowledgeToolbar = document.getElementById('knowledgeToolbar');
    const knowledgeList = document.getElementById('knowledgeList');
    const knowledgeEmpty = document.getElementById('knowledgeEmpty');
    const knowledgeOrgTree = document.getElementById('knowledgeOrgTree');
    const orgSwitcher = document.querySelector('.knowledge-org-switcher');
    const title = document.querySelector('.knowledge-panel-title');
    const fileContextBar = document.getElementById('fileContextBar');
    const globalHeader = document.querySelector('.knowledge-global-header');
    const fileToolbar = document.getElementById('fileToolbar');

    if (this.fileTreeOnlyMode) {
      if (panel) {
        panel.classList.add('project-files-mode');
      }
      if (globalHeader) {
        globalHeader.style.display = 'block';
      }
      if (tabsContainer) {
        tabsContainer.style.display = 'none';
      }
      if (knowledgeToolbar) {
        knowledgeToolbar.style.display = 'none';
      }
      if (knowledgeList) {
        knowledgeList.style.display = 'none';
      }
      if (knowledgeEmpty) {
        knowledgeEmpty.style.display = 'none';
      }
      if (knowledgeOrgTree) {
        knowledgeOrgTree.style.display = 'none';
      }
      if (orgSwitcher) {
        orgSwitcher.style.display = 'none';
      }
      if (fileToolbar) {
        fileToolbar.style.display = 'flex';
      }
      if (title) {
        title.textContent = '项目文件树';
      }
      if (fileContextBar) {
        fileContextBar.style.display = 'grid';
      }
      return;
    }

    if (panel) {
      panel.classList.remove('project-files-mode');
    }
    if (globalHeader) {
      globalHeader.style.display = 'block';
    }
    if (tabsContainer) {
      tabsContainer.style.display = 'flex';
    }
    if (orgSwitcher) {
      orgSwitcher.style.display = 'grid';
    }
    if (fileToolbar) {
      fileToolbar.style.display = 'none';
    }
    if (title) {
      title.textContent = '知识库';
    }
    if (fileContextBar) {
      fileContextBar.style.display = 'none';
    }
  }

  getExpandedDirectoriesStorageKey(projectId) {
    return `tc_file_tree_expanded:${String(projectId || 'global')}`;
  }

  loadExpandedDirectories(projectId) {
    const key = this.getExpandedDirectoriesStorageKey(projectId);
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      this.expandedDirectories = new Set(Array.isArray(parsed) ? parsed : []);
    } catch (_error) {
      this.expandedDirectories = new Set();
    }
  }

  persistExpandedDirectories(projectId = this.getCurrentKnowledgeProjectId()) {
    const key = this.getExpandedDirectoriesStorageKey(projectId);
    try {
      localStorage.setItem(key, JSON.stringify([...this.expandedDirectories]));
    } catch (_error) {
      // ignore
    }
  }

  isRemoteProjectId(projectId) {
    return window.projectManager?.isRemoteProjectId
      ? window.projectManager.isRemoteProjectId(projectId)
      : /^[a-f0-9]{24}$/i.test(String(projectId || ''));
  }

  getArtifactVirtualPath(artifact = {}) {
    const explicitPath =
      artifact.relativePath || artifact.path || artifact.filePath || artifact.previewPath || '';
    if (explicitPath) {
      return String(explicitPath).replace(/^\/+/, '');
    }
    const stageId = String(artifact.stageId || 'misc').trim() || 'misc';
    const rawName =
      artifact.fileName ||
      artifact.name ||
      artifact.title ||
      artifact.type ||
      artifact.id ||
      'artifact';
    const safeName = String(rawName)
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-');
    return `${stageId}/${safeName}.md`;
  }

  getProjectDisplayName(projectId = '') {
    const bundleProject = window.projectManager?.currentProjectBundle?.project;
    if (bundleProject?.id && String(bundleProject.id) === String(projectId || '')) {
      return bundleProject.name || '当前项目';
    }
    return window.projectManager?.currentProject?.name || '当前项目';
  }

  getFriendlyDirectoryName(name = '', projectId = '') {
    const raw = String(name || '').trim();
    if (!raw) {
      return '未命名目录';
    }
    const normalized = raw.toLowerCase();
    const exactMap = {
      projects: '项目文件',
      docs: '文档交付',
      preview: '原型预览',
      previews: '原型预览',
      src: '源代码',
      source: '源代码',
      assets: '资源文件',
      data: '数据文件',
      misc: '其他文件',
      strategy: '战略设计',
      design: '产品设计',
      architecture: '架构设计',
      development: '开发实现',
      testing: '测试验证',
      deployment: '部署上线',
      '01_strategy': '战略设计',
      '02_requirement': '需求分析',
      '03_design': '产品设计',
      '04_architecture': '架构设计',
      '05_development': '开发实现',
      '06_testing': '测试验证',
      '07_deployment': '部署上线'
    };
    if (exactMap[normalized]) {
      return exactMap[normalized];
    }
    if (/^project_[a-z0-9_-]+(?:__ai)?$/i.test(raw)) {
      return this.getProjectDisplayName(projectId);
    }
    const project =
      window.projectManager?.currentProjectBundle?.project || window.projectManager?.currentProject;
    const stage = project?.workflow?.stages?.find(item => {
      const stageId = String(item?.id || '').toLowerCase();
      return stageId === normalized || normalized.includes(stageId);
    });
    if (stage?.name) {
      return stage.name;
    }
    return raw.replace(/[_-]+/g, ' ').trim();
  }

  normalizeDisplayPath(filePath = '', projectId = '') {
    const segments = String(filePath || '')
      .replace(/^\/+/, '')
      .split('/')
      .filter(Boolean);
    if (segments.length === 0) {
      return [];
    }
    let startIndex = 0;
    if (segments[0] === 'projects') {
      startIndex = 1;
      if (segments[1] && /^project_/i.test(segments[1])) {
        startIndex = 2;
      }
      if (segments[startIndex] === 'docs') {
        startIndex += 1;
      }
    }
    const visible = segments.slice(startIndex);
    if (visible.length === 0) {
      return [this.getProjectDisplayName(projectId)];
    }
    return visible;
  }

  extractArtifactHeadingTitle(artifact = {}) {
    const content = String(artifact.content || '');
    if (!content) {
      return '';
    }
    const markdownHeading = content.match(/^\s*#\s+(.+)$/m);
    if (markdownHeading?.[1]) {
      return String(markdownHeading[1]).trim();
    }
    const htmlHeading = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (htmlHeading?.[1]) {
      return String(htmlHeading[1])
        .replace(/<[^>]+>/g, '')
        .trim();
    }
    return '';
  }

  sanitizeGeneratedFileName(name = '') {
    const raw = String(name || '').trim();
    if (!raw) {
      return '未命名文件';
    }
    return (
      raw
        .replace(/\.(md|markdown|html|txt|json|tsx|jsx|js|ts)$/i, '')
        .replace(/^project-artifact-\d+-[a-z0-9]+[-_]?/i, '')
        .replace(/^ui-artifact-\d+-[a-z0-9]+[-_]?/i, '')
        .replace(/[_-]+/g, ' ')
        .trim() || raw
    );
  }

  getArtifactDisplayTitle(artifact = {}, fallbackName = '') {
    const headingTitle = this.extractArtifactHeadingTitle(artifact);
    if (headingTitle) {
      return headingTitle;
    }
    const explicit = String(artifact.name || artifact.title || '').trim();
    if (explicit && !/^project_[a-z0-9_:-]+$/i.test(explicit)) {
      return explicit;
    }
    return this.sanitizeGeneratedFileName(
      fallbackName || artifact.fileName || artifact.type || '未命名文件'
    );
  }

  getArtifactMetaLabel(artifact = {}, filePath = '') {
    const pieces = [];
    const typeLabel = window.projectManager?.getArtifactTypeDefinition
      ? window.projectManager.getArtifactTypeDefinition(artifact.type || '').name
      : '';
    if (typeLabel) {
      pieces.push(typeLabel);
    } else if (artifact.type) {
      pieces.push(String(artifact.type));
    }
    const ext = String(filePath || '')
      .split('.')
      .pop();
    if (ext && ext !== filePath) {
      pieces.push(ext.toUpperCase());
    }
    return pieces.filter(Boolean).join(' · ');
  }

  inferArtifactContentType(filePath = '', artifact = {}) {
    if (artifact.contentType) {
      return artifact.contentType;
    }
    if (/\.(md|markdown)$/i.test(filePath)) {
      return 'text/markdown';
    }
    if (/\.json$/i.test(filePath)) {
      return 'application/json';
    }
    if (/\.(html?)$/i.test(filePath)) {
      return 'text/html';
    }
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(filePath)) {
      return 'image/*';
    }
    return 'text/plain';
  }

  buildLocalFileTreeFromArtifacts(artifacts = []) {
    this.localFileMap = new Map();
    const root = [];
    const ensureDir = (children, name, currentPath) => {
      let dir = children.find(item => item.type === 'directory' && item.name === name);
      if (!dir) {
        dir = {
          type: 'directory',
          name,
          path: currentPath,
          children: []
        };
        children.push(dir);
      }
      return dir;
    };

    const projectId = this.getCurrentKnowledgeProjectId();

    (Array.isArray(artifacts) ? artifacts : []).forEach(artifact => {
      if (!artifact) {
        return;
      }
      const filePath = this.getArtifactVirtualPath(artifact);
      const normalizedPath = String(filePath || '').replace(/^\/+/, '');
      if (!normalizedPath) {
        return;
      }
      this.localFileMap.set(normalizedPath, artifact);
      const segments = this.normalizeDisplayPath(normalizedPath, projectId);
      let children = root;
      let currentPath = '';

      segments.forEach((segment, index) => {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const isLast = index === segments.length - 1;
        if (isLast) {
          const displayTitle = this.getArtifactDisplayTitle(artifact, segment);
          children.push({
            type: 'file',
            name: displayTitle,
            path: normalizedPath,
            displayPath: currentPath,
            rawName: segment,
            size: artifact.size || String(artifact.content || '').length || 0,
            stageId: artifact.stageId || '',
            artifactId: artifact.id || '',
            artifactType: artifact.type || 'document',
            updatedAt: artifact.updatedAt || artifact.createdAt || null,
            contentType: this.inferArtifactContentType(currentPath, artifact),
            source: artifact.source || 'local-artifact',
            metaLabel: this.getArtifactMetaLabel(artifact, normalizedPath)
          });
          return;
        }
        const friendlySegment = this.getFriendlyDirectoryName(segment, projectId);
        const dir = ensureDir(children, friendlySegment, currentPath);
        children = dir.children;
      });
    });

    return root;
  }

  sortStageGroupedTree(nodes = []) {
    const stageOrder = [
      '战略设计',
      '需求分析',
      '产品设计',
      '架构设计',
      '开发实现',
      '测试验证',
      '部署上线',
      '原型预览',
      '文档交付',
      '源代码',
      '资源文件',
      '数据文件',
      '其他文件'
    ];
    const indexOfStage = name => {
      const idx = stageOrder.indexOf(String(name || '').trim());
      return idx === -1 ? 999 : idx;
    };
    const sortNodes = items =>
      (Array.isArray(items) ? items : [])
        .slice()
        .sort((a, b) => {
          if (a.type === 'directory' && b.type === 'directory') {
            const stageDiff = indexOfStage(a.name) - indexOfStage(b.name);
            if (stageDiff !== 0) {
              return stageDiff;
            }
            return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
          }
          if (a.type === 'directory') {
            return -1;
          }
          if (b.type === 'directory') {
            return 1;
          }
          return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
        })
        .map(item =>
          item.type === 'directory' ? { ...item, children: sortNodes(item.children || []) } : item
        );
    return sortNodes(nodes);
  }

  async refreshFileTree() {
    const projectId = this.getCurrentKnowledgeProjectId();
    const treeContainer = document.getElementById('fileTree');

    if (!treeContainer) {
      return;
    }

    if (!projectId) {
      treeContainer.innerHTML =
        '<div style="padding: 12px; color: var(--text-secondary);">请先进入对应项目后查看该项目文档树</div>';
      return;
    }

    try {
      this.loadExpandedDirectories(projectId);
      if (!this.isRemoteProjectId(projectId)) {
        const bundle = window.projectManager?.currentProjectBundle;
        const artifacts =
          bundle?.project?.id === projectId
            ? Object.values(bundle.artifactsByStage || {}).flat()
            : await window.storageManager?.getArtifactsByProject?.(projectId).catch(() => []);
        this.fileTreeData = this.sortStageGroupedTree(
          this.buildLocalFileTreeFromArtifacts(artifacts)
        );
        this.updateFileContextBar(projectId, artifacts);
        this.renderFileTree();
        this.restoreSelectedOrDefaultFile();
        return;
      }
      const result = await window.apiClient.request(
        `/api/workflow/${projectId}/artifacts/tree?depth=6`
      );
      this.fileTreeData = Array.isArray(result?.data?.tree) ? result.data.tree : [];
      this.updateFileContextBar(projectId, []);
      this.renderFileTree();
      this.restoreSelectedOrDefaultFile();
    } catch (error) {
      treeContainer.innerHTML = '<div style="padding: 12px; color: #b91c1c;">文件树加载失败</div>';
    }
  }

  countDirectories(nodes = []) {
    let count = 0;
    const walk = items => {
      (items || []).forEach(item => {
        if (!item) {
          return;
        }
        if (item.type === 'directory') {
          count += 1;
          walk(item.children || []);
        }
      });
    };
    walk(nodes);
    return count;
  }

  updateFileContextBar(projectId, artifacts = []) {
    const bar = document.getElementById('fileContextBar');
    if (!bar) {
      return;
    }
    const bundle = window.projectManager?.currentProjectBundle;
    const project =
      bundle?.project?.id === projectId ? bundle.project : window.projectManager?.currentProject;
    const fileCount = this.flattenFileTree(this.fileTreeData).length;
    const directoryCount = this.countDirectories(this.fileTreeData);
    const artifactCount =
      Array.isArray(artifacts) && artifacts.length > 0
        ? artifacts.length
        : Object.values(bundle?.artifactsByStage || {}).flat().length;
    this.fileContextStats = { fileCount, directoryCount, artifactCount };
    bar.innerHTML = `
      <div class="file-context-main">
        <div class="file-context-eyebrow">Project Explorer</div>
        <div class="file-context-title">${this.escapeHtml(project?.name || '当前项目')}</div>
        <div class="file-context-subtitle">稳定的目录树浏览与文档预览</div>
      </div>
      <div class="file-context-stats">
        <div class="file-context-stat"><span>${fileCount}</span><label>文件</label></div>
        <div class="file-context-stat"><span>${directoryCount}</span><label>目录</label></div>
        <div class="file-context-stat"><span>${artifactCount}</span><label>交付物</label></div>
      </div>
    `;
  }

  onFileSearch(keyword = '') {
    this.fileSearchKeyword = String(keyword || '')
      .trim()
      .toLowerCase();
    this.renderFileTree();
  }

  flattenFileTree(nodes = []) {
    const result = [];
    const walk = (items = []) => {
      items.forEach(item => {
        if (!item) {
          return;
        }
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

  getEffectiveFileTreeData() {
    return this.fileTreeData;
  }

  buildPathTreeFromFiles(files = [], options = {}) {
    const root = [];
    const ensureDir = (children, name, currentPath, meta = {}) => {
      let dir = children.find(item => item.type === 'directory' && item.name === name);
      if (!dir) {
        dir = {
          type: 'directory',
          name,
          path: currentPath,
          children: [],
          groupType: meta.groupType || '',
          groupValue: meta.groupValue || '',
          stageId: meta.stageId || ''
        };
        children.push(dir);
      }
      return dir;
    };

    (Array.isArray(files) ? files : []).forEach(file => {
      const normalizedPath = String(file?.path || '').replace(/^\/+/, '');
      if (!normalizedPath) {
        return;
      }
      const segments = normalizedPath.split('/').filter(Boolean);
      let children = root;
      let currentPath = options.pathPrefix || '';
      segments.forEach((segment, index) => {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        const isLast = index === segments.length - 1;
        if (isLast) {
          children.push({
            ...file,
            type: 'file',
            name: segment,
            path: normalizedPath
          });
          return;
        }
        const dir = ensureDir(children, segment, currentPath, {
          stageId: file.stageId || ''
        });
        children = dir.children;
      });
    });

    return root;
  }

  getStageLabel(stageId = '') {
    const normalized = String(stageId || '').trim();
    if (!normalized) {
      return '未归类阶段';
    }
    const project =
      window.projectManager?.currentProjectBundle?.project || window.projectManager?.currentProject;
    const stage = project?.workflow?.stages?.find(item => String(item?.id || '') === normalized);
    return stage?.name || normalized;
  }

  getTypeGroupLabel(type = '') {
    switch (type) {
      case 'doc':
        return '文档文件';
      case 'code':
        return '代码文件';
      case 'image':
        return '图片资源';
      case 'data':
        return '数据文件';
      default:
        return '其他文件';
    }
  }

  buildGroupedFileTree(files = [], mode = 'stage') {
    const grouped = new Map();
    (Array.isArray(files) ? files : []).forEach(file => {
      const key =
        mode === 'stage'
          ? String(file?.stageId || '').trim() || 'ungrouped'
          : this.getFileVisualType(file);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(file);
    });

    return [...grouped.entries()].map(([key, groupFiles]) => {
      const groupName =
        mode === 'stage'
          ? this.getStageLabel(key === 'ungrouped' ? '' : key)
          : this.getTypeGroupLabel(key);
      return {
        type: 'directory',
        name: groupName,
        path: `${mode}:${key}`,
        children: this.buildPathTreeFromFiles(groupFiles, {
          pathPrefix: `${mode}:${key}`
        }),
        groupType: mode,
        groupValue: key
      };
    });
  }

  renderFileTree() {
    const treeContainer = document.getElementById('fileTree');
    if (!treeContainer) {
      return;
    }
    const keyword = this.fileSearchKeyword;
    const effectiveTree = this.getEffectiveFileTreeData();

    const getFileTypeClass = node => {
      const visualType = this.getFileVisualType(node);
      return `file-type-${visualType}`;
    };

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
            ? selfMatch || hasMatchedDescendant
            : this.expandedDirectories.has(dirKey) || depth === 0;
          rows.push(`
            <div class="file-tree-group depth-${depth}">
              <button class="file-tree-row file-tree-row-directory" type="button" style="--tree-depth:${depth};" onclick="window.knowledgeBase.toggleDirectory('${encodeURIComponent(dirKey)}')">
                <span class="file-tree-chevron">${isExpanded ? '⌄' : '›'}</span>
                <span class="file-tree-icon">📁</span>
                <span class="file-tree-label">${this.escapeHtml(node.name)}</span>
              </button>
              <div class="file-tree-children" style="display:${isExpanded ? 'block' : 'none'};">
                ${child.html}
              </div>
            </div>
          `);
          return;
        }

        const name = String(node.name || '').toLowerCase();
        const path = String(node.path || '').toLowerCase();
        const matched = !keyword || name.includes(keyword) || path.includes(keyword);
        const filterMatched = this.matchesQuickFilter(node);
        if (!matched || !filterMatched) {
          return;
        }
        const isActive = (node.path || '') === this.selectedFilePath ? 'active' : '';
        rows.push(`
          <button class="file-tree-row file-tree-row-file ${isActive} ${getFileTypeClass(node)}" type="button" style="--tree-depth:${depth};" onclick="window.knowledgeBase.previewFile('${encodeURIComponent(node.path || '')}')">
            <span class="file-tree-spacer"></span>
            <span class="file-tree-icon">${this.getFileIcon(node)}</span>
            <span class="file-tree-node-content">
              <span class="file-tree-label">${this.escapeHtml(node.name)}</span>
              ${node.metaLabel ? `<span class="file-tree-meta">${this.escapeHtml(node.metaLabel)}</span>` : ''}
            </span>
          </button>
        `);
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

    const rendered = renderNodes(effectiveTree);
    if (!rendered.html) {
      if (keyword) {
        treeContainer.innerHTML =
          '<div style="padding: 12px; color: var(--text-secondary);">无匹配文件</div>';
        return;
      }
      treeContainer.innerHTML =
        '<div style="padding: 12px; color: var(--text-secondary);">暂无文件</div>';
      return;
    }
    treeContainer.innerHTML = `<div class="file-tree-root">${rendered.html}</div>`;
  }

  getCurrentStageId() {
    const project =
      window.projectManager?.currentProjectBundle?.project || window.projectManager?.currentProject;
    return (
      window.projectManager?.currentStageId ||
      project?.workflow?.currentStage ||
      project?.workflow?.stages?.[0]?.id ||
      ''
    );
  }

  getFileVisualType(node = {}) {
    const filePath = String(node.path || '');
    const contentType = String(node.contentType || '');
    const artifactType = String(node.artifactType || '');
    if (this.isImagePreview(filePath, contentType)) {
      return 'image';
    }
    if (
      artifactType === 'code' ||
      /\.(js|ts|tsx|jsx|json|css|scss|html?|sh|py|sql|java|go|rs|c|cpp|h|hpp)$/i.test(filePath)
    ) {
      return 'code';
    }
    if (
      this.isMarkdownFile(filePath, contentType) ||
      /\.(docx?|pdf|txt|md|markdown)$/i.test(filePath)
    ) {
      return 'doc';
    }
    if (/\.json$/i.test(filePath)) {
      return 'data';
    }
    return 'generic';
  }

  getFileIcon(node = {}) {
    switch (this.getFileVisualType(node)) {
      case 'image':
        return '🖼️';
      case 'code':
        return '</>';
      case 'doc':
        return '📘';
      case 'data':
        return '{}';
      default:
        return '📄';
    }
  }

  matchesQuickFilter(_node = {}) {
    return true;
  }

  toggleDirectory(encodedDirKey) {
    const dirKey = decodeURIComponent(encodedDirKey || '');
    if (!dirKey) {
      return;
    }
    if (this.expandedDirectories.has(dirKey)) {
      this.expandedDirectories.delete(dirKey);
    } else {
      this.expandedDirectories.add(dirKey);
    }
    this.persistExpandedDirectories();
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
    return /\.(txt|md|markdown|json|js|ts|tsx|jsx|css|scss|html?|xml|yaml|yml|csv|sql|sh|py|java|go|rs|c|cpp|h|hpp)$/i.test(
      filePath || ''
    );
  }

  escapeHtml(text = '') {
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  renderPreviewShell({ path = '', meta = '', content = '', actions = '' } = {}) {
    return `
      <div class="file-preview-shell">
        <div class="file-preview-header">
          <div class="file-preview-path">${this.escapeHtml(path)}</div>
          ${meta ? `<div class="file-preview-meta">${this.escapeHtml(meta)}</div>` : ''}
        </div>
        <div id="filePreviewToolbar" class="file-preview-toolbar" style="display:none;"></div>
        ${content}
        ${actions ? `<div class="file-preview-actions">${actions}</div>` : ''}
      </div>
    `;
  }

  renderPreviewModeBar(filePath = '', capabilities = {}) {
    const bar = document.getElementById('filePreviewModeBar');
    if (!bar) {
      return;
    }
    const { canRender = false, canSource = true } = capabilities;
    const modes = [];
    if (canRender) {
      modes.push({ id: 'rendered', label: '阅读视图' });
    }
    if (canSource) {
      modes.push({ id: 'source', label: '源码视图' });
    }
    if (modes.length <= 1) {
      bar.innerHTML = '';
      bar.style.display = 'none';
      return;
    }
    if (!modes.some(mode => mode.id === this.filePreviewMode)) {
      this.filePreviewMode = modes[0].id;
    }
    bar.style.display = 'flex';
    bar.innerHTML = `
      <div class="file-preview-mode-tabs">
        ${modes
          .map(
            mode =>
              `<button class="${this.filePreviewMode === mode.id ? 'active' : ''}" onclick="window.knowledgeBase.setFilePreviewMode('${mode.id}')">${mode.label}</button>`
          )
          .join('')}
      </div>
      <div class="file-preview-mode-path">${this.escapeHtml(filePath)}</div>
    `;
  }

  setFilePreviewMode(mode = 'rendered') {
    this.filePreviewMode = mode;
    if (this.selectedFilePath) {
      this.previewFile(encodeURIComponent(this.selectedFilePath));
    }
  }

  buildPreviewAnchorsFromMarkdown(markdown = '') {
    const anchors = [];
    const seen = new Map();
    String(markdown || '')
      .split('\n')
      .forEach(line => {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (!match) {
          return;
        }
        const label = String(match[2] || '').trim();
        if (!label) {
          return;
        }
        const baseId = `kb-${label
          .toLowerCase()
          .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
          .replace(/-+/g, '-')}`;
        const count = seen.get(baseId) || 0;
        seen.set(baseId, count + 1);
        anchors.push({
          id: count ? `${baseId}-${count}` : baseId,
          label: label.slice(0, 18),
          fullLabel: label
        });
      });
    return anchors.slice(0, 6);
  }

  injectHeadingAnchors(html = '', anchors = []) {
    if (!html || !Array.isArray(anchors) || anchors.length === 0) {
      return html;
    }
    const container = document.createElement('div');
    container.innerHTML = html;
    const headingNodes = container.querySelectorAll('h1, h2, h3');
    headingNodes.forEach((heading, index) => {
      if (anchors[index]) {
        heading.id = anchors[index].id;
        heading.classList.add('kb-preview-heading');
      }
    });
    return container.innerHTML;
  }

  updatePreviewToolbar({ type = 'generic', anchors = [], showDownload = false } = {}) {
    const toolbar = document.getElementById('filePreviewToolbar');
    if (!toolbar) {
      return;
    }
    const anchorButtons =
      Array.isArray(anchors) && anchors.length > 0
        ? anchors
            .map(
              anchor =>
                `<button class="file-preview-anchor-btn" title="${this.escapeHtml(anchor.fullLabel || anchor.label)}" onclick="window.knowledgeBase.scrollPreviewToAnchor('${anchor.id}')">${this.escapeHtml(anchor.label)}</button>`
            )
            .join('')
        : '';
    toolbar.innerHTML = `
      <div class="file-preview-toolbar-main">
        <span class="file-preview-toolbar-kind">${type === 'code' ? '代码预览' : type === 'markdown' ? '文档阅读' : type === 'image' ? '图片预览' : '文件预览'}</span>
      </div>
      ${anchorButtons ? `<div class="file-preview-anchor-list">${anchorButtons}</div>` : ''}
    `;
    toolbar.style.display = anchorButtons ? 'grid' : 'flex';
  }

  scrollPreviewToAnchor(anchorId = '') {
    const container = document.querySelector('#filePreview .file-preview-content');
    const target = document.getElementById(anchorId);
    if (!container || !target) {
      return;
    }
    const targetTop = target.offsetTop - 16;
    container.scrollTo({ top: Math.max(targetTop, 0), behavior: 'smooth' });
  }

  renderFileMetaPanel(meta = null) {
    const panel = document.getElementById('fileMetaPanel');
    if (!panel) {
      return;
    }
    if (!meta) {
      panel.innerHTML = '<div class="file-meta-empty">选择一个文件后查看元信息</div>';
      return;
    }
    const lines = [
      ['文件名', meta.name || '未命名'],
      ['路径', meta.path || ''],
      ['类型', meta.contentType || meta.artifactType || '未知'],
      ['阶段', meta.stageId || '未归类'],
      ['大小', meta.sizeLabel || '未知'],
      ['来源', meta.source || 'local'],
      ['更新时间', meta.updatedLabel || '未知']
    ];
    panel.innerHTML = `
      <div class="file-meta-card">
        <div class="file-meta-card-title">文件信息</div>
        <div class="file-meta-list">
          ${lines
            .map(
              ([label, value]) => `
            <div class="file-meta-item">
              <div class="file-meta-label">${this.escapeHtml(label)}</div>
              <div class="file-meta-value">${this.escapeHtml(String(value || ''))}</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  formatBytes(size) {
    const value = Number(size || 0);
    if (!Number.isFinite(value) || value <= 0) {
      return '0 B';
    }
    if (value < 1024) {
      return `${value} B`;
    }
    if (value < 1024 * 1024) {
      return `${(value / 1024).toFixed(1)} KB`;
    }
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  buildSelectedFileMeta(filePath, extra = {}) {
    return {
      path: filePath,
      name:
        extra.name ||
        String(filePath || '')
          .split('/')
          .pop() ||
        '未命名文件',
      contentType: extra.contentType || '',
      stageId: extra.stageId || '',
      artifactType: extra.artifactType || '',
      sizeLabel: this.formatBytes(extra.size || 0),
      updatedLabel: extra.updatedAt ? new Date(extra.updatedAt).toLocaleString('zh-CN') : '未知',
      source: extra.source || 'local'
    };
  }

  restoreSelectedOrDefaultFile() {
    const allFiles = this.flattenFileTree(this.getEffectiveFileTreeData()).filter(file =>
      this.matchesQuickFilter(file)
    );
    if (allFiles.length === 0) {
      this.selectedFilePath = '';
      this.renderFileMetaPanel(null);
      const filePreview = document.getElementById('filePreview');
      if (filePreview) {
        filePreview.innerHTML =
          '<div class="empty-state"><div class="empty-title">当前筛选条件下没有可预览文件</div></div>';
      }
      const toolbar = document.getElementById('filePreviewToolbar');
      if (toolbar) {
        toolbar.style.display = 'none';
      }
      return;
    }
    const existing = allFiles.find(item => item.path === this.selectedFilePath);
    const target = existing || allFiles[0];
    if (target?.path) {
      this.previewFile(encodeURIComponent(target.path));
    }
  }

  async previewFile(encodedPath) {
    const filePath = decodeURIComponent(encodedPath || '');
    const filePreview = document.getElementById('filePreview');
    const projectId = this.getCurrentKnowledgeProjectId();
    this.clearPreviewObjectUrl();
    if (!filePreview) {
      return;
    }
    if (!filePath || !projectId) {
      filePreview.innerHTML =
        '<div class="empty-state"><div class="empty-title">请选择有效文件</div></div>';
      return;
    }

    this.selectedFilePath = filePath;
    this.renderFileTree();

    if (!this.isRemoteProjectId(projectId)) {
      const artifact = this.localFileMap.get(filePath);
      if (!artifact) {
        filePreview.innerHTML = this.renderPreviewShell({
          path: filePath,
          content: '<div class="file-preview-error">本地文件不存在</div>'
        });
        this.renderPreviewModeBar(filePath, { canRender: false, canSource: false });
        this.renderFileMetaPanel(this.buildSelectedFileMeta(filePath));
        return;
      }

      const contentType = this.inferArtifactContentType(filePath, artifact);
      this.selectedFileMeta = this.buildSelectedFileMeta(filePath, {
        name: artifact.name || artifact.title || artifact.fileName || artifact.type || '',
        contentType,
        stageId: artifact.stageId,
        artifactType: artifact.type,
        size: artifact.size || String(artifact.content || '').length,
        updatedAt: artifact.updatedAt || artifact.createdAt,
        source: artifact.source || 'local-artifact'
      });
      this.renderFileMetaPanel(this.selectedFileMeta);
      if (artifact.previewUrl || artifact.url) {
        this.renderPreviewModeBar(filePath, { canRender: false, canSource: false });
        const previewUrl = artifact.previewUrl || artifact.url;
        filePreview.innerHTML = this.renderPreviewShell({
          path: filePath,
          meta: '外部预览资源',
          content: '<div class="file-preview-empty">当前文件引用外部预览地址</div>',
          actions: `<a class="btn-secondary" href="${previewUrl}" target="_blank" rel="noopener noreferrer">打开预览</a>`
        });
        this.updatePreviewToolbar({ type: 'generic' });
        return;
      }

      let renderedContent = `<pre>${this.escapeHtml(String(artifact.content || ''))}</pre>`;
      const canRender =
        this.isMarkdownFile(filePath, contentType) || this.isImagePreview(filePath, contentType);
      const previewType = this.isImagePreview(filePath, contentType)
        ? 'image'
        : this.isMarkdownFile(filePath, contentType)
          ? 'markdown'
          : /\.(js|ts|tsx|jsx|json|css|html?|sh|py|sql|java|go|rs)$/i.test(filePath)
            ? 'code'
            : 'generic';
      const anchors =
        previewType === 'markdown'
          ? this.buildPreviewAnchorsFromMarkdown(String(artifact.content || ''))
          : [];
      this.renderPreviewModeBar(filePath, { canRender, canSource: true });
      if (
        this.filePreviewMode !== 'source' &&
        this.isMarkdownFile(filePath, contentType) &&
        window.markdownRenderer?.render
      ) {
        renderedContent = this.injectHeadingAnchors(
          window.markdownRenderer.render(String(artifact.content || '')),
          anchors
        );
      }
      if (this.filePreviewMode === 'source') {
        renderedContent = `<pre class="file-code-preview"><code>${this.escapeHtml(String(artifact.content || ''))}</code></pre>`;
      } else if (
        !this.isMarkdownFile(filePath, contentType) &&
        /\.(js|ts|tsx|jsx|json|css|html?|sh|py|sql|java|go|rs)$/i.test(filePath)
      ) {
        renderedContent = `<pre class="file-code-preview"><code>${this.escapeHtml(String(artifact.content || ''))}</code></pre>`;
      }

      filePreview.innerHTML = this.renderPreviewShell({
        path: filePath,
        meta: contentType || 'text/plain',
        content: `<div class="file-preview-content">${renderedContent}</div>`
      });
      this.currentPreviewAnchors = anchors;
      this.updatePreviewToolbar({ type: previewType, anchors });
      return;
    }

    filePreview.innerHTML = this.renderPreviewShell({
      path: filePath,
      content: '<div class="file-preview-empty">正在加载预览...</div>'
    });
    this.renderPreviewModeBar(filePath, { canRender: false, canSource: false });
    this.renderFileMetaPanel(this.buildSelectedFileMeta(filePath));

    const baseURL =
      window.apiClient?.baseURL || `${window.location.protocol}//${window.location.host}`;
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
      const contentLength = Number(response.headers.get('content-length') || 0);
      this.selectedFileMeta = this.buildSelectedFileMeta(filePath, {
        name:
          String(filePath || '')
            .split('/')
            .pop() || '未命名文件',
        contentType,
        size: contentLength,
        source: 'remote-workspace'
      });
      this.renderFileMetaPanel(this.selectedFileMeta);

      if (this.isImagePreview(filePath, contentType)) {
        const blob = await response.blob();
        this.clearPreviewObjectUrl();
        this.previewObjectUrl = URL.createObjectURL(blob);
        this.renderPreviewModeBar(filePath, { canRender: false, canSource: false });
        filePreview.innerHTML = this.renderPreviewShell({
          path: filePath,
          meta: contentType || 'image',
          content: `<div class="file-preview-content"><img src="${this.previewObjectUrl}" alt="${this.escapeHtml(filePath)}" style="width: 100%; border-radius: 12px; border: 1px solid var(--border);" /></div>`,
          actions: `<a class="btn-secondary" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">下载文件</a>`
        });
        this.updatePreviewToolbar({ type: 'image' });
        return;
      }

      if (this.isTextPreview(filePath, contentType)) {
        const text = await response.text();
        let renderedContent = `<pre>${this.escapeHtml(text)}</pre>`;
        const canRender = this.isMarkdownFile(filePath, contentType);
        const previewType = canRender
          ? 'markdown'
          : /\.(js|ts|tsx|jsx|json|css|html?|sh|py|sql|java|go|rs)$/i.test(filePath)
            ? 'code'
            : 'generic';
        const anchors = canRender ? this.buildPreviewAnchorsFromMarkdown(text) : [];
        this.renderPreviewModeBar(filePath, { canRender, canSource: true });

        if (
          this.filePreviewMode !== 'source' &&
          this.isMarkdownFile(filePath, contentType) &&
          window.markdownRenderer?.render
        ) {
          renderedContent = this.injectHeadingAnchors(
            window.markdownRenderer.render(text),
            anchors
          );
        }
        if (
          this.filePreviewMode === 'source' ||
          /\.(js|ts|tsx|jsx|json|css|html?|sh|py|sql|java|go|rs)$/i.test(filePath)
        ) {
          renderedContent = `<pre class="file-code-preview"><code>${this.escapeHtml(text)}</code></pre>`;
        }

        filePreview.innerHTML = this.renderPreviewShell({
          path: filePath,
          meta: contentType || 'text/plain',
          content: `<div class="file-preview-content">${renderedContent}</div>`,
          actions: `<a class="btn-secondary" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">下载文件</a>`
        });
        this.currentPreviewAnchors = anchors;
        this.updatePreviewToolbar({ type: previewType, anchors, showDownload: true });
        return;
      }

      filePreview.innerHTML = this.renderPreviewShell({
        path: filePath,
        content: '<div class="file-preview-empty">当前文件类型暂不支持在线预览</div>',
        actions: `<a class="btn-secondary" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">下载文件</a>`
      });
      this.renderPreviewModeBar(filePath, { canRender: false, canSource: false });
      this.updatePreviewToolbar({ type: 'generic', showDownload: true });
    } catch (error) {
      filePreview.innerHTML = this.renderPreviewShell({
        path: filePath,
        content: `<div class="file-preview-error">${this.escapeHtml(error.message || '预览失败')}</div>`,
        actions: `<a class="btn-secondary" href="${downloadUrl}" target="_blank" rel="noopener noreferrer">下载文件</a>`
      });
      this.renderPreviewModeBar(filePath, { canRender: false, canSource: false });
      this.updatePreviewToolbar({ type: 'generic', showDownload: true });
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

    listContainer.innerHTML = items
      .map(
        item => `
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
                    ${
                      (item.tags || []).length > 0
                        ? `
                        <div class="knowledge-tags">
                            ${(item.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    `
                        : ''
                    }
                </div>
            </div>
        `
      )
      .join('');
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
                        ${grouped.global
                          .map(
                            item => `
                            <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                ${item.icon} ${item.title}
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                </div>
            `);
    }

    // 项目知识
    Object.keys(grouped).forEach(projectId => {
      if (projectId === 'global') {
        return;
      }
      const projectName = this.getProjectName(projectId);
      const projectItems = grouped[projectId];

      html.push(`
                <div class="org-group">
                    <div class="org-group-header" onclick="toggleOrgGroup('${projectId}')">
                        <span>📁 ${projectName} (${projectItems.length})</span>
                    </div>
                    <div class="org-group-content" id="org-${projectId}">
                        ${projectItems
                          .map(
                            item => `
                            <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                ${item.icon} ${item.title}
                            </div>
                        `
                          )
                          .join('')}
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
      prd: { label: 'PRD文档', icon: '📄' },
      tech: { label: '技术方案', icon: '🤖' },
      analysis: { label: '市场分析', icon: '📊' },
      research: { label: '用户调研', icon: '👥' },
      design: { label: '设计稿', icon: '🎨' },
      other: { label: '其他', icon: '📋' }
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
                        ${typeItems
                          .map(
                            item => `
                            <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                ${item.icon} ${item.title}
                            </div>
                        `
                          )
                          .join('')}
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
      if (timeline.items.length === 0) {
        return;
      }

      html.push(`
                <div class="org-group">
                    <div class="org-group-header" onclick="toggleOrgGroup('time-${key}')">
                        <span>📅 ${timeline.label} (${timeline.items.length})</span>
                    </div>
                    <div class="org-group-content" id="org-time-${key}">
                        ${timeline.items
                          .map(
                            item => `
                            <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                ${item.icon} ${item.title}
                            </div>
                        `
                          )
                          .join('')}
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
      container.innerHTML =
        '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">暂无标签</div>';
      return;
    }

    const html = tags
      .map(tag => {
        const count = stats.byTag[tag];
        return `
                <div class="org-group">
                    <div class="org-group-header" onclick="filterByTag('${tag}')">
                        <span>🏷️ ${tag} (${count})</span>
                    </div>
                </div>
            `;
      })
      .join('');

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
                    ${
                      (item.tags || []).length > 0
                        ? `
                        <div style="margin-bottom: 16px;">
                            ${(item.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    `
                        : ''
                    }
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
    const tags = tagsInput
      ? tagsInput
          .split(/[,，]/)
          .map(t => t.trim())
          .filter(t => t)
      : [];

    const currentProjectId =
      window.stateManager?.state?.knowledge?.currentProjectId ||
      window.projectManager?.currentProjectId ||
      window.appState?.currentProject?.id ||
      this.state.currentProject ||
      null;

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
      prd: '#dbeafe',
      tech: '#e0e7ff',
      analysis: '#fce7f3',
      research: '#fef3c7',
      design: '#d1fae5',
      other: '#f3f4f6'
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
      prd: '#dbeafe',
      tech: '#e0e7ff',
      analysis: '#fce7f3',
      research: '#fef3c7',
      design: '#d1fae5',
      other: '#f3f4f6'
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
      prd: '#1e40af',
      tech: '#4338ca',
      analysis: '#9f1239',
      research: '#92400e',
      design: '#065f46',
      other: '#374151'
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
      prd: 'PRD',
      tech: '技术',
      analysis: '分析',
      research: '调研',
      design: '设计',
      summary: '纪要',
      idea: '创意',
      other: '其他'
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
      prd: '📄',
      tech: '🤖',
      analysis: '📊',
      research: '👥',
      design: '🎨',
      summary: '📝',
      idea: '💡',
      other: '📋'
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
