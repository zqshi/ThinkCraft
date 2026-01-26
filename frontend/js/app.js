/**
 * ThinkCraft 主入口文件
 * 初始化应用并导出全局函数
 */

import { appState } from './core/app-state.js';
import { sendMessage, quickReply } from './handlers/message-handler.js';
import {
  startNewChat,
  loadChats,
  loadChat,
  deleteChat,
  renameChat,
  togglePinChat,
  manageTagsForChat,
  toggleChatMenu,
  saveCurrentChat
} from './handlers/chat-manager.js';
import { handleKeyDown, handleKeyUp, quickStart } from './handlers/input-handler.js';
import {
  autoResize,
  closeAllChatMenus,
  closeChatMenu,
  focusInput,
  scrollToBottom
} from './utils/helpers.js';
import { SYSTEM_PROMPT } from './app-config.js';

// 导出全局函数供HTML onclick调用
window.sendMessage = sendMessage;
window.quickReply = quickReply;
window.startNewChat = startNewChat;
window.loadChats = loadChats;
window.loadChat = loadChat;
window.deleteChat = deleteChat;
window.renameChat = renameChat;
window.togglePinChat = togglePinChat;
window.manageTagsForChat = manageTagsForChat;
window.toggleChatMenu = toggleChatMenu;
window.saveCurrentChat = saveCurrentChat;
window.handleKeyDown = handleKeyDown;
window.handleKeyUp = handleKeyUp;
window.quickStart = quickStart;
window.autoResize = autoResize;
window.focusInput = focusInput;
window.scrollToBottom = scrollToBottom;
window.closeAllChatMenus = closeAllChatMenus;
window.closeChatMenu = closeChatMenu;

// 导出appState供调试
window.appState = appState;
window.SYSTEM_PROMPT = SYSTEM_PROMPT;

/**
 * 应用初始化
 */
function initApp() {
  // 清理localStorage中的旧数据（只保留mock数据）
  const saved = localStorage.getItem('thinkcraft_chats');
  if (saved && saved !== '[]') {
    try {
      const allChats = JSON.parse(saved);
      const mockChatIds = ['demo_fitness_app', 'chat_001', 'chat_002'];
      const filteredChats = allChats.filter(chat => mockChatIds.includes(chat.id));

      if (filteredChats.length < 3) {
        localStorage.removeItem('thinkcraft_chats');
      } else {
        localStorage.setItem('thinkcraft_chats', JSON.stringify(filteredChats));
      }
    } catch (e) {
      localStorage.removeItem('thinkcraft_chats');
    }
  }

  // 加载聊天列表
  loadChats();

  // 加载设置
  loadSettings();

  // 聚焦输入框
  focusInput();

  // 初始化组件
  if (window.modalManager) {
  }
  if (window.storageManager) {
    window.storageManager
      .init()
      .then(() => {
        window.loadGenerationStates && window.loadGenerationStates();
      })
      .catch(error => {});
  }
  if (window.stateManager) {
    window.stateManager.subscribe(newState => {
      window.updateGenerationButtonState && window.updateGenerationButtonState(newState.generation);
    });
  }
  if (window.businessPlanGenerator) {
  }

  // 自动加载demo对话
  setTimeout(() => {
    if (!appState.currentChat && appState.chats.length > 0) {
      const demoChat = appState.chats.find(c => c.id === 'demo_fitness_app');
      if (demoChat) {
        loadChat(demoChat.id);
      }
    }
  }, 100);
}

/**
 * 加载设置
 */
function loadSettings() {
  const saved = localStorage.getItem('thinkcraft_settings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      Object.assign(appState.settings, settings);
    } catch (e) {}
  }
}

/**
 * 页面关闭前保存
 */
window.addEventListener('beforeunload', e => {
  if (appState.messages.length > 0 && appState.settings.saveHistory) {
    saveCurrentChat();
  }
});

/**
 * Service Worker注册
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(registration => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            }
          });
        });
      })
      .catch(error => {});

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data && event.data.type === 'SYNC_START') {
      }
    });
  });
} else {
}

// 点击其他地方关闭菜单
document.addEventListener('click', () => {
  closeAllChatMenus();
});

// 滚动时关闭菜单
const chatHistory = document.querySelector('.chat-history');
if (chatHistory) {
  chatHistory.addEventListener('scroll', () => {
    closeAllChatMenus();
  });
}

// 窗口调整大小时关闭菜单
window.addEventListener('resize', () => {
  closeAllChatMenus();
});

// DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
