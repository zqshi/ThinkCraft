/**
 * Legacy app state bootstrap (extracted from inline app boot)
 * Keep global `state` and related helpers intact.
 */
function getDefaultApiUrl() {
  if (window.location.hostname === 'localhost' && window.location.port === '8000') {
    return 'http://localhost:3000';
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
  settings: {
    darkMode: false,
    saveHistory: true,
    enableTeam: false, // 数字员工团队功能开关
    apiUrl: getDefaultApiUrl()
  }
};

// 系统提示词 - 从配置文件加载
// 修改提示词：编辑 config/system-prompts.js 文件
// 切换预设：修改配置文件中的 DEFAULT_PROMPT 变量
const SYSTEM_PROMPT = window.SYSTEM_PROMPTS
  ? window.SYSTEM_PROMPTS[window.DEFAULT_PROMPT]
  : `你是ThinkCraft AI思维助手，专业的创意分析和验证工具。

你的使命：
- 帮助用户系统地分析和验证想法
- 提出建设性的问题和洞察
- 生成结构化的分析报告

交互风格：
- 友好但专业，循序渐进
- 基于用户反馈灵活调整
- 每次只问1-2个问题，避免信息过载

当用户提出创意时，你应该逐步引导他们思考：
1. 核心想法是什么？
2. 目标用户是谁？他们的痛点是什么？
3. 解决方案有什么独特之处？
4. 如何验证这个想法的可行性？
5. 有哪些关键指标可以衡量成功？

始终保持建设性态度，鼓励用户深度思考。`;

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
  } catch (e) {}

  if (userNameEl) {
    userNameEl.textContent = 'ThinkCraft 用户';
  }
  if (userProfileName) {
    userProfileName.textContent = 'ThinkCraft 用户';
  }
}

window.state = state;
window.legacyState = state;
window.SYSTEM_PROMPT = SYSTEM_PROMPT;
window.updateUserNameDisplay = updateUserNameDisplay;
