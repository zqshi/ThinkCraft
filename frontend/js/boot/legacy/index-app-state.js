/**
 * Legacy app state bootstrap (extracted from inline app boot)
 * Keep global `state` and related helpers intact.
 */
function getDefaultApiUrl() {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost && window.location.port !== '3000') {
    return 'http://127.0.0.1:3000';
  }
  return window.location.origin;
}

const state = {
  currentChat: null,
  chats: [],
  messages: [],
  userData: {},
  conversationStep: 0,
  isTyping: false,
  isLoading: false,
  typingChatId: null,
  pendingChatIds: new Set(),
  analysisCompleted: false, // 防止重复显示报告按钮
  autoScrollEnabled: true, // 允许自动滚动；用户手动滚动上方时会关闭
  autoScrollLocked: false, // 用户手动上滑后锁定，直到回到底部
  currentProject: null, // 当前打开的项目ID
  teamSpace: null, // 团队空间数据（延迟初始化）
  generation: {}, // 报告生成状态 { [chatId]: { business: {...}, proposal: {...}, analysis: {...} } }
  settings: {
    darkMode: false,
    saveHistory: true,
    enableTeam: false, // 数字员工团队功能开关
    apiUrl: getDefaultApiUrl()
  }
};

function updateUserNameDisplay() {
  const userNameEl = document.getElementById('userName');
  const userProfileName = document.querySelector('.user-profile-name');

  try {
    const userInfo = sessionStorage.getItem('thinkcraft_user');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      if (user.phone) {
        if (userNameEl) {
          userNameEl.textContent = user.phone;
        }
        if (userProfileName) {
          userProfileName.textContent = user.phone;
        }
        return;
      }
    }
  } catch (_error) {
    // ignore malformed legacy user info payloads
  }

  if (userNameEl) {
    userNameEl.textContent = 'ThinkCraft 用户';
  }
  if (userProfileName) {
    userProfileName.textContent = 'ThinkCraft 用户';
  }
}

window.state = state;
window.legacyState = state;
window.updateUserNameDisplay = updateUserNameDisplay;
