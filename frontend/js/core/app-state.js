/**
 * ThinkCraft 全局状态管理
 * 管理应用的核心状态
 */

// 全局状态对象
export const appState = {
    currentChat: null,
    chats: [],
    messages: [],
    userData: {},
    conversationStep: 0,
    isTyping: false,
    isLoading: false,
    analysisCompleted: false,
    currentProject: null,
    teamSpace: null,
    settings: {
        darkMode: false,
        saveHistory: true,
        enableTeam: false,
        apiUrl: 'http://localhost:3000'
    }
};

// 生成相关状态
export const generatedReports = {
    business: null,
    proposal: null,
    demo: null
};

// 当前生成的章节配置
export let currentGeneratedChapters = [];

// 当前报告类型
export let currentReportType = 'business';

// 当前Demo配置
export let currentDemoType = 'web';
export let currentDemoFeatures = [];

// 防抖定时器
export let saveDebounceTimer = null;

// 进度interval
export let progressInterval = null;

// 长按空格键定时器
export let spaceHoldTimer = null;
export let spaceHoldTriggered = false;

// 更新函数
export function updateCurrentGeneratedChapters(chapters) {
    currentGeneratedChapters = chapters;
}

export function updateCurrentReportType(type) {
    currentReportType = type;
}

export function updateCurrentDemoType(type) {
    currentDemoType = type;
}

export function updateCurrentDemoFeatures(features) {
    currentDemoFeatures = features;
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
