function getDefaultApiUrl() {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost && window.location.port !== '3000') {
    return 'http://127.0.0.1:3000';
  }
  return window.location.origin;
}

const STAGE_ID_ALIASES = {
  'strategy-validation': 'strategy',
  'strategy-review': 'strategy',
  'strategy-plan': 'strategy',
  'product-definition': 'requirement',
  'product-requirement': 'requirement',
  requirements: 'requirement',
  'ux-design': 'design',
  'ui-design': 'design',
  'product-design': 'design',
  'experience-design': 'design',
  'user-experience-design': 'design',
  'prototype-design': 'design',
  'architecture-design': 'architecture',
  'tech-architecture': 'architecture',
  'system-architecture': 'architecture',
  implementation: 'development',
  dev: 'development',
  qa: 'testing',
  test: 'testing',
  launch: 'deployment',
  release: 'deployment',
  operation: 'operation',
  ops: 'operation'
};

const ARTIFACT_TYPE_DEFS = {
  prd: { name: '产品需求文档', icon: '📋' },
  'user-story': { name: '用户故事', icon: '👤' },
  'feature-list': { name: '功能清单', icon: '📝' },
  design: { name: '设计稿', icon: '🎨' },
  'design-spec': { name: '设计规范', icon: '📐' },
  prototype: { name: '交互原型', icon: '🖼️' },
  code: { name: '代码', icon: '💻' },
  'frontend-code': { name: '前端源代码', icon: '💻' },
  'backend-code': { name: '后端源代码', icon: '🖥️' },
  'component-lib': { name: '组件库', icon: '🧩' },
  'api-doc': { name: 'API文档', icon: '📡' },
  'test-report': { name: '测试报告', icon: '📊' },
  'deployment-guide': { name: '部署指南', icon: '🚀' },
  document: { name: '文档', icon: '📄' },
  report: { name: '报告', icon: '📈' },
  plan: { name: '计划', icon: '📝' },
  'frontend-doc': { name: '前端开发文档', icon: '🧩' },
  'backend-doc': { name: '后端开发文档', icon: '🧱' },
  'strategy-doc': { name: '战略设计文档', icon: '🎯' },
  'research-analysis-doc': { name: '产品研究分析报告', icon: '🔎' },
  'ui-design': { name: 'UI设计方案', icon: '🎨' },
  'architecture-doc': { name: '系统架构设计', icon: '🏗️' },
  'marketing-plan': { name: '运营推广方案', icon: '📈' },
  'deploy-doc': { name: '部署文档', icon: '🚀' },
  'api-spec': { name: 'API接口规范', icon: '📡' },
  'tech-stack': { name: '技术栈选型', icon: '🧩' },
  'core-prompt-design': { name: '核心引导逻辑Prompt设计', icon: '🧠' },
  'growth-strategy': { name: '增长策略', icon: '📈' },
  'analytics-report': { name: '数据分析报告', icon: '📊' },
  'env-config': { name: '环境配置', icon: '🧩' },
  'release-notes': { name: '发布说明', icon: '📝' },
  'bug-list': { name: '缺陷清单', icon: '🐞' },
  'performance-report': { name: '性能报告', icon: '📊' },
  preview: { name: '可交互预览', icon: '🖥️' },
  'ui-preview': { name: 'UI预览', icon: '🖼️' },
  image: { name: '图片', icon: '🖼️' }
};

class ProjectManager {
  constructor() {
    this.projects = [];
    this.projectsLoaded = false;
    this.projectsLoadPromise = null;
    this.currentProject = null;
    this.currentProjectId = null;
    this.memberModalProjectId = null;
    this.currentStageId = null;
    this.stageTabState = {};
    this.stageArtifactState = {};
    this.stageDeliverableSelection = {};
    this.stageDeliverableSelectionByProject = this.loadStageDeliverableSelectionStore();
    this.artifactPollingTimer = null;
    this.artifactPollingProjectId = null;
    this.artifactPollingInFlight = false;
    this.executionRunsUnavailableByProject = {};
    this.artifactChunksUnavailableByProject = {};
    this.enableExecutionRunsPolling = true;
    this.workflowRouteHealthByProject = {};
    this.stageProgressTracker = {};
    this.agentMarket = [];
    this.agentMarketCategory = null;
    this.cachedHiredAgents = [];
    this.hiredAgentsFetchedAt = 0;
    this.hiredAgentsPromise = null;
    this.apiUrl = window.appState?.settings?.apiUrl || getDefaultApiUrl();
    this.storageManager = window.storageManager;
    this.stageDetailPanel = null;
    this.stageDetailOverlay = null;
    this.artifactTypeDefs = ARTIFACT_TYPE_DEFS;
  }

  getAuthToken() {
    return window.getAuthToken ? window.getAuthToken() : null;
  }

  buildAuthHeaders(extra = {}) {
    const token = this.getAuthToken();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra
    };
  }

  async fetchWithAuth(url, options = {}, retry = true) {
    if (window.requireAuth) {
      const ok = await window.requireAuth({ redirect: false, prompt: false });
      if (!ok) {
        throw new Error('未提供访问令牌');
      }
    }
    if (window.apiClient?.ensureFreshToken) {
      await window.apiClient.ensureFreshToken();
    }
    const headers = this.buildAuthHeaders(options.headers || {});
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 && retry && window.apiClient?.refreshAccessToken) {
      const refreshed = await window.apiClient.refreshAccessToken();
      if (refreshed) {
        return this.fetchWithAuth(url, options, false);
      }
    }
    return response;
  }

  loadStageDeliverableSelectionStore() {
    try {
      const raw = localStorage.getItem('tc_stage_deliverables_v1');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  persistStageDeliverableSelectionStore() {
    try {
      localStorage.setItem(
        'tc_stage_deliverables_v1',
        JSON.stringify(this.stageDeliverableSelectionByProject || {})
      );
    } catch (error) {
      // ignore
    }
  }

  normalizeIdeaId(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const strValue = String(value).trim();
    if (strValue === '') {
      return null;
    }
    const numValue = Number(strValue);
    if (!isNaN(numValue)) {
      return numValue;
    }
    return strValue;
  }

  normalizeIdeaIdForCompare(value) {
    if (value === null || value === undefined) {
      return '';
    }
    const raw = String(value).trim();
    if (!raw) {
      return '';
    }
    const dePrefixed = raw.replace(/^(idea-|chat-)/i, '');
    if (/^\d+$/.test(dePrefixed)) {
      return String(Number(dePrefixed));
    }
    return dePrefixed;
  }

  normalizeStageIdForWorkflow(stageId) {
    if (!stageId) return stageId;
    if (window.workflowExecutor?.normalizeStageId) {
      return window.workflowExecutor.normalizeStageId(stageId);
    }
    const normalized = String(stageId).trim();
    return STAGE_ID_ALIASES[normalized] || normalized;
  }

  resolveCatalogStageIdByAgents(agentIds = []) {
    const agents = Array.isArray(agentIds) ? agentIds : [];
    if (agents.includes('ui-ux-designer')) return 'design';
    if (agents.includes('tech-lead')) return 'architecture';
    if (agents.includes('frontend-developer') || agents.includes('backend-developer')) {
      return 'development';
    }
    if (agents.includes('qa-engineer')) return 'testing';
    if (agents.includes('devops')) return 'deployment';
    if (agents.includes('marketing') || agents.includes('operations')) return 'operation';
    if (agents.includes('strategy-design')) return 'strategy';
    if (agents.includes('product-manager')) return 'requirement';
    return null;
  }

  getArtifactIcon(artifactType) {
    const def = this.getArtifactTypeDefinition(artifactType);
    return def.icon;
  }

  renderHumanInLoopPanel() {
    return '';
  }

  async promptWorkflowRecommendation() {
    return;
  }

  async executeAllStages(projectId) {
    const options = arguments.length > 1 && typeof arguments[1] === 'object' ? arguments[1] : {};
    return window.projectManagerWorkflowRunner?.executeAllStages?.(this, projectId, options);
  }
}

function registerPmDelegates(moduleName, defs) {
  defs.forEach(def => {
    const config =
      typeof def === 'string'
        ? { method: def, delegate: def }
        : { ...def, delegate: def.delegate || def.method };
    ProjectManager.prototype[config.method] = function (...args) {
      const module = window[moduleName];
      const resolveFallback = () =>
        typeof config.fallback === 'function'
          ? config.fallback.call(this, ...args)
          : config.fallback;
      if (!module?.[config.delegate]) {
        const fallbackResult = resolveFallback();
        return config.promise ? Promise.resolve(fallbackResult) : fallbackResult;
      }
      const invokeArgs = config.passCtx === false ? args : [this, ...args];
      const result = config.bindThis
        ? module[config.delegate].call(this, ...args)
        : module[config.delegate](...invokeArgs);
      if (result !== undefined && result !== null) {
        return config.promise ? Promise.resolve(result) : result;
      }
      const fallbackResult = resolveFallback();
      return config.promise ? Promise.resolve(fallbackResult) : fallbackResult;
    };
  });
}

registerPmDelegates('projectManagerSetup', [
  { method: 'hydrateProjectStageOutputs', fallback: project => project },
  'init',
  {
    method: 'loadProjects',
    promise: true,
    fallback() {
      this.projectsLoaded = true;
      return this.projects;
    }
  },
  { method: 'buildKnowledgeFromArtifacts', fallback: () => [] },
  {
    method: 'getValidAgentIds',
    fallback: () =>
      new Set(['agent_001', 'agent_002', 'agent_003', 'agent_004', 'agent_005', 'agent_006'])
  },
  { method: 'getUserId', fallback: () => `guest_${Date.now()}` },
  'getWorkflowCatalog',
  { method: 'getWorkflowCategoryLabel', fallback: '统一产品开发' }
]);

registerPmDelegates('projectManagerData', [
  'createProject',
  'getProject',
  'getProjectByIdeaId',
  { method: 'updateProject', promise: true }
]);

registerPmDelegates('projectManagerSync', [
  { method: 'patchWorkflowArtifacts', fallback: workflow => workflow },
  { method: 'mergeExecutionState', fallback: remoteProject => remoteProject },
  { method: 'ensureProjectWorkflow', fallback: project => project },
  'startArtifactPolling',
  'stopArtifactPolling',
  'pollProjectArtifacts',
  { method: 'normalizeExecutionState', fallback: project => project }
]);

registerPmDelegates('projectManagerProjectActions', [
  'deleteProject',
  'confirmDeleteCurrentProject',
  'editCurrentProjectName',
  'openIdeaChat'
]);

registerPmDelegates('projectManagerProjectList', [
  'renderProjectList',
  { method: 'renderProjectCard', fallback: '' }
]);
registerPmDelegates('projectManagerUiUtils', [
  { method: 'calculateWorkflowProgress', fallback: 0 },
  'switchStage',
  'selectStage',
  'viewAllArtifacts',
  'confirmStage',
  'requestStageRevision',
  'addStageNote',
  'loadChatFromProject'
]);
registerPmDelegates('projectManagerCoreUtils', [
  { method: 'formatTimeAgo', fallback: '刚刚' },
  {
    method: 'escapeHtml',
    fallback(_text) {
      const value = _text === null || _text === undefined ? '' : String(_text);
      return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }
  },
  { method: 'mergeArtifacts', fallback: () => [] }
]);
registerPmDelegates('projectManagerPanelRenderer', [
  { method: 'renderProjectPanel', bindThis: true },
  { method: 'renderStageContent', bindThis: true },
  { method: 'renderStageAction', bindThis: true, fallback: '' },
  { method: 'renderWorkflowSteps', bindThis: true, fallback: '' },
  { method: 'renderStageDetailSection', bindThis: true, fallback: '' }
]);
registerPmDelegates('projectManagerStageUtils', [
  { method: 'getStageStatusLabel', fallback: status => status },
  { method: 'calculateStageProgress', fallback: 0 },
  { method: 'getAgentDefinition', fallback: null },
  {
    method: 'getArtifactTypeDefinition',
    fallback(artifactType) {
      return { name: artifactType, icon: '📄' };
    }
  },
  { method: 'normalizeArtifactTypeId', fallback: '' }
]);
registerPmDelegates('projectManagerDeliverables', [
  { method: 'getExpectedDeliverables', fallback: () => [] },
  { method: 'resolveSelectedArtifactTypes', fallback: () => [] },
  { method: 'normalizeDeliverableKey', passCtx: false, fallback: '' },
  { method: 'findArtifactForDeliverable', fallback: null },
  { method: 'getDeliverableStatusItems', fallback: () => [] },
  {
    method: 'getDeliverableProgressSummary',
    fallback: () => ({
      items: [],
      selectedItems: [],
      selectedCount: 0,
      generatedCount: 0,
      generatingCount: 0,
      totalCount: 0
    })
  },
  { method: 'renderDeliverableStatusPanel', fallback: '' },
  'generateAdditionalDeliverables',
  'regenerateStageDeliverable',
  'retryStageDeliverable',
  'deleteGeneratedDeliverable',
  { method: 'getMissingDeliverables', fallback: () => [] },
  { method: 'getMissingSelectedDeliverables', fallback: () => [] },
  { method: 'getMissingDeliverablesFromExpected', fallback: () => [] },
  { method: 'getMissingDeliverablesWithReason', fallback: () => [] },
  { method: 'hasGeneratedPrd', fallback: false },
  { method: 'validateStrategyDocDependency', fallback: false },
  { method: 'getStageSelectedDeliverables', fallback: () => [] },
  'toggleStageDeliverable',
  'startStageWithSelection'
]);
registerPmDelegates('projectManagerArtifactsView', [
  'switchDeliverableTab',
  'selectArtifact',
  'renderDeliverableContent',
  { method: 'getArtifactTypeLabel', fallback: '文档' },
  { method: 'renderStageArtifacts', fallback: '' },
  { method: 'getDocArtifacts', fallback: () => [] },
  { method: 'getDisplayArtifacts', fallback: () => [] },
  'openKnowledgeFromArtifact'
]);
registerPmDelegates('projectManagerPanelLifecycle', [
  'refreshProjectPanel',
  'updateProjectSelection',
  { method: 'extractHtmlFromContent', fallback: '' },
  { method: 'findPreviewArtifact', fallback: null },
  { method: 'buildPreviewArtifact', fallback: null },
  'openPreviewEntry',
  'openPreviewPanel',
  'downloadProjectArtifactBundle',
  'showStageArtifactsModal',
  'closeProjectPanel'
]);
registerPmDelegates('projectManagerPanelContent', [
  'renderProjectMembersPanel',
  'renderProjectIdeasPanel',
  'renderProjectKnowledgePanel',
  { method: 'getReportsByChatId', fallback: () => ({}) }
]);
registerPmDelegates('projectManagerReportPreview', ['viewIdeaReport']);
registerPmDelegates('projectManagerMembers', [
  'showMemberModal',
  'switchMemberModalTab',
  'renderMemberMarket',
  'buildFallbackAgentFromCatalog',
  { method: 'getRecommendedAgentsFromProjectWorkflow', fallback: () => [] },
  'renderMemberHired',
  'hireAgentToProject',
  'fireAgentFromProject',
  'handleFireAgent',
  { method: 'getMissingRolesAfterRemoval', fallback: () => [] },
  { method: 'getAgentMarketList', fallback: () => [] },
  { method: 'getUserHiredAgents', fallback: () => [] },
  { method: 'getRecommendedAgentsForStage', fallback: () => [] },
  { method: 'getRecommendedAgentsForStageFromCatalog', fallback: () => [] }
]);
registerPmDelegates('projectManagerIdeaFlow', [
  'showReplaceIdeaDialog',
  'confirmReplaceIdea',
  'saveIdeaKnowledge',
  'showCreateProjectDialog',
  { method: 'hasCompletedAnalysisReport', fallback: false },
  {
    method: 'getChatsWithCompletedAnalysis',
    fallback() {
      console.warn('[ProjectManager] projectManagerIdeaFlow.getChatsWithCompletedAnalysis 未加载');
      return [];
    }
  },
  { method: 'filterCompletedIdeas', fallback: () => [] },
  'confirmCreateProject',
  'createProjectWithWorkflow',
  'createProjectFromIdea'
]);
registerPmDelegates('projectManagerCollaboration', [
  'applyWorkflowCategory',
  { method: 'customizeWorkflow', fallback: null },
  'applyCollaborationSuggestion',
  { method: 'sortStagesByDependencies', fallback: () => [] },
  { method: 'buildWorkflowStages', fallback: null },
  { method: 'normalizeSuggestedStages', fallback: () => [] }
]);
registerPmDelegates('projectManagerEntrypoints', [
  'openCollaborationMode',
  'openProjectKnowledgePanel',
  'openProject'
]);
registerPmDelegates('projectManagerWorkflowRunner', [
  'ensureProjectPanelStyles',
  { method: 'checkBackendHealth', fallback: false },
  'syncWorkflowArtifactsFromServer',
  'renderWorkflowDetails',
  'startWorkflowExecution'
]);
registerPmDelegates('projectManagerArtifactPreview', [
  'openArtifactPreviewPanel',
  'closeArtifactPreviewPanel',
  'renderArtifactPreviewPanel',
  'openArtifactPreviewInNewWindow',
  'openArtifactEditor',
  'cancelArtifactEdits',
  'saveArtifactEdits',
  'copyArtifactContent',
  'downloadArtifact',
  { method: 'formatFileSize', passCtx: false, fallback: '0 B' }
]);

if (typeof window !== 'undefined') {
  window.ProjectManager = ProjectManager;
  window.projectManager = new ProjectManager();

  window.addEventListener('DOMContentLoaded', () => {
    if (window.projectManager) {
      window.projectManager.init();
    }
  });
}
