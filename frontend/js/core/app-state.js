/**
 * ThinkCraft 全局状态管理
 * 管理应用的核心状态
 */

function getDefaultApiUrl() {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost && window.location.port !== '3000') {
    return 'http://localhost:3000';
  }
  return window.location.origin;
}

// 全局状态对象
export const appState = {
  currentChat: null,
  chats: [],
  messages: [],
  userData: {},
  conversationStep: 0,
  isTyping: false,
  isLoading: false,
  typingChatId: null,
  pendingChatIds: new Set(),
  analysisCompleted: false,
  autoScrollEnabled: true,
  autoScrollLocked: false,

  // 项目管理（v5新增）
  currentProject: null,
  projects: [],
  projectsLoaded: false,

  teamSpace: null,
  settings: {
    darkMode: false,
    saveHistory: true,
    enableTeam: false,
    apiUrl: getDefaultApiUrl()
  }
};

// 生成相关状态
export const generatedReports = {
  business: null,
  proposal: null
};

// 当前生成的章节配置
export let currentGeneratedChapters = [];

// 当前报告类型
export let currentReportType = 'business';

// 防抖定时器
export let saveDebounceTimer = null;

// 进度interval
export let progressInterval = null;

// 长按空格键定时器
export let spaceHoldTimer = null;
export let spaceHoldTriggered = false;

// 输入法组合状态（用于处理拼音输入法等）
export let isComposing = false;

// 更新函数
export function updateCurrentGeneratedChapters(chapters) {
  currentGeneratedChapters = chapters;
}

export function updateCurrentReportType(type) {
  currentReportType = type;
}

export function updateSaveDebounceTimer(timer) {
  saveDebounceTimer = timer;
}

export function updateProgressInterval(interval) {
  progressInterval = interval;
}

export function updateSpaceHoldTimer(timer) {
  spaceHoldTimer = timer;
}

export function updateSpaceHoldTriggered(triggered) {
  spaceHoldTriggered = triggered;
}

export function updateIsComposing(composing) {
  isComposing = composing;
}

// 项目状态更新函数（v5新增）
export function setCurrentProject(project) {
  appState.currentProject = project;
}

export function setProjects(projects) {
  appState.projects = projects;
  appState.projectsLoaded = true;
}

export function addProject(project) {
  appState.projects.unshift(project); // 添加到数组开头
}

export function updateProject(projectId, updates) {
  const index = appState.projects.findIndex(p => p.id === projectId);
  if (index !== -1) {
    appState.projects[index] = { ...appState.projects[index], ...updates };
  }
  // 如果是当前项目，也更新
  if (appState.currentProject && appState.currentProject.id === projectId) {
    appState.currentProject = { ...appState.currentProject, ...updates };
  }
}

export function removeProject(projectId) {
  appState.projects = appState.projects.filter(p => p.id !== projectId);
  // 如果删除的是当前项目，清空
  if (appState.currentProject && appState.currentProject.id === projectId) {
    appState.currentProject = null;
  }
}

export function clearCurrentProject() {
  appState.currentProject = null;
}
