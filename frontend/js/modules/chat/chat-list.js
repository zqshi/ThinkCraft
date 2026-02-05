/**
 * 对话列表管理模块
 * 负责对话历史的加载、保存、删除、重命名等功能
 */

/* eslint-disable no-unused-vars, no-undef */

class ChatList {
  constructor() {
    this.state = window.state;
  }

  /**
   * 开始新对话
   */
  async startNewChat() {
    // ⭐ 静默保存当前对话（无需确认弹窗）
    if (state.messages.length > 0 && state.settings.saveHistory) {
      if (typeof saveCurrentChat === 'function') {
        await saveCurrentChat();
      }
    }

    // 保存当前输入草稿（切换前）
    if (window.stateManager?.setInputDraft) {
      const desktopInput = document.getElementById('mainInput');
      const mobileInput = document.getElementById('mobileTextInput');
      const activeInput =
        mobileInput && mobileInput.offsetParent !== null ? mobileInput : desktopInput;
      window.stateManager.setInputDraft(state.currentChat, activeInput ? activeInput.value : '');
    }

    // 重置所有state
    state.currentChat = null; // 重置为null表示新对话
    state.messages = [];
    state.conversationStep = 0;
    state.userData = {};
    state.analysisCompleted = false;
    state.autoScrollEnabled = true;
    state.autoScrollLocked = false;

    // 清空UI
    document.getElementById('emptyState').style.display = 'flex';
    document.getElementById('messageList').style.display = 'none';
    document.getElementById('messageList').innerHTML = '';

    // 智能检测：如果侧边栏处于覆盖模式（移动端），自动关闭并显示对话窗口
    const sidebar = document.getElementById('sidebar');
    const isOverlayMode = window.getComputedStyle(sidebar).position === 'fixed';
    if (isOverlayMode && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }

    // 切换到对话tab（如果当前在项目空间tab）
    if (typeof window.switchSidebarTab === 'function') {
      window.switchSidebarTab('chats');
    }

    // 关闭项目面板，显示对话容器
    const projectPanel = document.getElementById('projectPanel');
    const chatContainer = document.getElementById('chatContainer');
    const mainContent = document.querySelector('.main-content');

    if (projectPanel) {
      projectPanel.style.display = 'none';
      projectPanel.classList.remove('active');
    }
    if (chatContainer) {
      chatContainer.style.display = 'flex';
    }
    if (mainContent) {
      mainContent.classList.remove('project-panel-open');
    }

    // 刷新对话列表（移除active状态）
    this.loadChats();

    // 恢复新对话输入草稿
    if (window.stateManager?.getInputDraft) {
      const draft = window.stateManager.getInputDraft(null);
      const desktopInput = document.getElementById('mainInput');
      const mobileInput = document.getElementById('mobileTextInput');
      if (desktopInput) {
        desktopInput.value = draft;
        if (typeof autoResize === 'function') {
          autoResize(desktopInput);
        }
      }
      if (mobileInput) {
        mobileInput.value = draft;
      }
    }

    // 聚焦输入框
    if (typeof focusInput === 'function') {
      focusInput();
    }
  }

  /**
   * 加载对话列表
   */
  async loadChats(options = {}) {
    const { preferLocal = false } = options;
    // 1. 先清理所有已经portal到body的菜单
    document.querySelectorAll('.chat-item-menu').forEach(menu => {
      if (menu.parentElement === document.body) {
        menu.remove();
      }
    });

    const authToken = window.getAuthToken ? window.getAuthToken() : null;

    // 优先从后端加载对话列表
    if (!preferLocal && authToken && window.apiClient?.get) {
      try {
        const response = await window.apiClient.get('/api/chat', { page: 1, pageSize: 100 });
        if (response?.code === 0 && Array.isArray(response?.data?.chats)) {
          state.chats = response.data.chats.map(chat => ({
            id: chat.id,
            title: chat.title,
            titleEdited: Boolean(chat.titleEdited),
            messages: Array.isArray(chat.messages)
              ? chat.messages.map(msg => ({
                  role: msg.sender === 'user' ? 'user' : 'assistant',
                  content: msg.content
                }))
              : [],
            userData: chat.userData || {},
            conversationStep: chat.conversationStep || 0,
            analysisCompleted: chat.analysisCompleted || false,
            reportState: chat.reportState || null,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
            status: chat.status,
            tags: chat.tags || [],
            isPinned: chat.isPinned || false
          }));
          if (window.storageManager) {
            for (const chat of state.chats) {
              await window.storageManager.saveChat(chat);
            }
          }
        }
      } catch (error) {
        console.warn('[ChatList] 后端加载失败，回退本地缓存', error);
      }
    }

    // 从 IndexedDB 加载对话（后端失败时）
    if (!state.chats || state.chats.length === 0) {
      if (window.storageManager) {
        try {
          state.chats = await window.storageManager.getAllChats();
        } catch (error) {
          console.error('[ChatList] 加载对话失败:', error);
          state.chats = [];
        }
      } else {
        state.chats = [];
      }
    }

    // 排序：置顶优先，其次按 chat ID + requestID 倒序
    state.chats.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const aId = Number(a.id) || 0;
      const bId = Number(b.id) || 0;
      if (aId !== bId) return bId - aId;
      const aRequestId = Number(a.requestId ?? a.requestID ?? 0) || 0;
      const bRequestId = Number(b.requestId ?? b.requestID ?? 0) || 0;
      return bRequestId - aRequestId;
    });

    const historyDiv = document.getElementById('chatHistory');
    historyDiv.innerHTML = '';

    if (state.chats.length === 0) {
      historyDiv.innerHTML =
        '<div style="padding: 12px; text-align: center; color: var(--text-tertiary); font-size: 13px;">暂无历史记录</div>';
      return;
    }

    state.chats.forEach(chat => {
      const item = document.createElement('div');
      const isActive = String(state.currentChat) === String(chat.id);
      item.className = 'chat-item' + (chat.isPinned ? ' pinned' : '') + (isActive ? ' active' : '');
      item.dataset.chatId = chat.id;

      const tagsHTML = ''; // 标签功能已禁用

      item.innerHTML = `
                <svg class="chat-item-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
                </svg>
                <div style="flex: 1; min-width: 0; overflow: hidden;">
                    ${tagsHTML}
                    <span class="chat-item-content">${chat.title}</span>
                </div>
                <div class="chat-item-actions">
                    <button class="chat-item-more" onclick="toggleChatMenu(event, '${chat.id}')">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                        </svg>
                    </button>
                    <div class="chat-item-menu" id="menu-${chat.id}">
                        <div class="chat-item-menu-item" onclick="renameChat(event, '${chat.id}')">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            重命名
                        </div>
                        <div class="chat-item-menu-item" onclick="togglePinChat(event, '${chat.id}')" data-action="pin">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                            </svg>
                            ${chat.isPinned ? '取消置顶' : '置顶'}
                        </div>
                        <div class="chat-item-menu-item danger" onclick="deleteChat(event, '${chat.id}')">
                            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            删除
                        </div>
                    </div>
                </div>
            `;

      // 点击对话项加载对话
      item.addEventListener('click', e => {
        if (e.target.closest('.chat-item-more') || e.target.closest('.chat-item-menu')) {
          return;
        }
        this.loadChatById(chat.id);
      });

      historyDiv.appendChild(item);
    });
  }

  /**
   * 根据ID加载对话
   * @param {number} chatId - 对话ID
   */
  async loadChatById(chatId) {
    if (window.chatManager && typeof window.chatManager.loadChat === 'function') {
      await window.chatManager.loadChat(chatId);
      return;
    }
  }

  /**
   * 重命名对话
   * @param {Event} e - 事件对象
   * @param {number} chatId - 对话ID
   */
  async renameChat(e, chatId) {
    e.stopPropagation();
    const chat = state.chats.find(c => String(c.id) === String(chatId));
    if (!chat) return;

    const newTitle = prompt('修改对话标题', chat.title);
    if (newTitle && newTitle.trim()) {
      chat.title = newTitle.trim();
      chat.titleEdited = true;

      // 保存到 IndexedDB
      if (window.storageManager) {
        await window.storageManager.saveChat(chat);
      }

      if (window.apiClient?.put) {
        try {
          await window.apiClient.put(`/api/chat/${chatId}`, {
            title: chat.title,
            titleEdited: true
          });
        } catch (error) {
          console.warn('[ChatList] 重命名同步失败，将保留本地结果', error);
        }
      }

      await this.loadChats({ preferLocal: true });
    }
  }

  /**
   * 切换对话置顶状态
   * @param {Event} e - 事件对象
   * @param {number} chatId - 对话ID
   */
  async togglePinChat(e, chatId) {
    e.stopPropagation();
    const chat = state.chats.find(c => String(c.id) === String(chatId));
    if (!chat) return;

    chat.isPinned = !chat.isPinned;

    // 保存到 IndexedDB
    if (window.storageManager) {
      await window.storageManager.saveChat(chat);
    }

    if (window.apiClient?.put) {
      try {
        await window.apiClient.put(`/api/chat/${chatId}`, {
          isPinned: chat.isPinned
        });
      } catch (error) {
        console.warn('[ChatList] 置顶同步失败，将保留本地结果', error);
      }
    }

    await this.loadChats({ preferLocal: true });
  }

  /**
   * 删除对话
   * @param {Event} e - 事件对象
   * @param {number} chatId - 对话ID
   */
  async deleteChat(e, chatId) {
    e.stopPropagation();

    const normalizedChatId = String(chatId).trim();
    let linkedProject = null;

    if (window.storageManager?.getProjectByIdeaId) {
      try {
        linkedProject = await window.storageManager.getProjectByIdeaId(normalizedChatId);
      } catch (error) {
        console.warn('[ChatList] 检查项目关联失败:', error);
      }
    }

    let legacyLinkedProject = null;
    if (!linkedProject && window.state?.teamSpace?.projects) {
      legacyLinkedProject = window.state.teamSpace.projects.find(project => {
        if (!project || project.status === 'deleted') {
          return false;
        }
        const ideaId =
          project.ideaId !== undefined && project.ideaId !== null
            ? String(project.ideaId).trim()
            : '';
        const linkedIdeas = Array.isArray(project.linkedIdeas)
          ? project.linkedIdeas.map(id => String(id).trim())
          : [];
        return ideaId === normalizedChatId || linkedIdeas.includes(normalizedChatId);
      });
    }

    const relatedProject = linkedProject || legacyLinkedProject;
    if (relatedProject) {
      const projectName = relatedProject.name ? `“${relatedProject.name}”` : '';
      const message = projectName
        ? `该对话已创建项目${projectName}并引入创意，请先删除项目后再删除对话。`
        : '该对话已创建项目并引入创意，请先删除项目后再删除对话。';
      if (window.modalManager) {
        window.modalManager.alert(message, 'warning');
      } else {
        alert(message);
      }
      return;
    }

    if (!confirm('确定要删除这个对话吗？此操作不可恢复。')) {
      return;
    }

    // 关闭所有浮窗
    document.querySelectorAll('.chat-item-menu').forEach(menu => {
      menu.classList.remove('active');
      if (typeof restoreChatMenu === 'function') {
        restoreChatMenu(menu);
      }
    });
    document.querySelectorAll('.chat-item.menu-open').forEach(item => {
      item.classList.remove('menu-open');
    });

    // 同步删除后端会话（已登录时）
    const authToken = window.getAuthToken ? window.getAuthToken() : null;
    if (authToken && window.apiClient?.delete) {
      try {
        await window.apiClient.delete(`/api/chat/${chatId}`);
      } catch (error) {
        console.warn('[ChatList] 删除后端会话失败，继续删除本地缓存', error);
      }
    }

    state.chats = state.chats.filter(c => String(c.id) !== String(chatId));

    // 从 IndexedDB 删除
    if (window.storageManager) {
      await window.storageManager.deleteChat(chatId);
    }
    // 同步更新 localStorage 缓存，避免删除后仍被旧缓存读取
    try {
      localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
    } catch (error) {
      console.warn('[ChatList] 更新 localStorage 失败:', error);
    }

    // 如果删除的是当前对话，重置状态
    if (String(state.currentChat) === String(chatId)) {
      state.currentChat = null;
      state.messages = [];
      state.conversationStep = 0;
      state.userData = {};
      document.getElementById('emptyState').style.display = 'flex';
      document.getElementById('messageList').style.display = 'none';
      document.getElementById('messageList').innerHTML = '';
    }

    await this.loadChats();
  }

  /**
   * 清空所有历史记录
   */
  async clearAllHistory() {
    if (!confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
      return;
    }

    // 先清空当前对话的消息，防止 startNewChat() 重新保存
    state.messages = [];
    state.currentChat = null;
    state.userData = {};
    state.conversationStep = 0;
    state.analysisCompleted = false;

    // 清空对话列表
    const chatIds = state.chats.map(c => c.id);
    state.chats = [];

    // 从 IndexedDB 删除所有对话
    if (window.storageManager) {
      for (const chatId of chatIds) {
        await window.storageManager.deleteChat(chatId);
      }
    }

    // 清除其他存储
    localStorage.removeItem('thinkcraft_reports');
    localStorage.removeItem('thinkcraft_chats');
    sessionStorage.clear();

    // 清除IndexedDB（如果存在）
    if (window.storageManager && window.storageManager.clearAll) {
      window.storageManager.clearAll().catch(() => {});
    }

    // 重新加载对话列表
    this.loadChats();

    // 重置UI（不会触发保存，因为 messages 已经清空）
    this.startNewChat();

    // 关闭设置弹窗（桌面端和移动端）
    const settingsModal = document.getElementById('settingsModal');
    if (settingsModal) {
      settingsModal.classList.remove('active');
    }
    const bottomSheet = document.getElementById('bottomSettingsSheet');
    if (bottomSheet) {
      bottomSheet.classList.remove('active');
    }

    alert('✅ 历史记录已清除');
  }
}

// 创建全局实例
window.chatList = new ChatList();

// 暴露全局函数（向后兼容）
async function startNewChat() {
  await window.chatList.startNewChat();
}

async function loadChats() {
  await window.chatList.loadChats();
}

async function renameChat(e, chatId) {
  await window.chatList.renameChat(e, chatId);
}

async function togglePinChat(e, chatId) {
  await window.chatList.togglePinChat(e, chatId);
}

async function deleteChat(e, chatId) {
  await window.chatList.deleteChat(e, chatId);
}

async function clearAllHistory() {
  await window.chatList.clearAllHistory();
}

// 暴露到window对象
window.startNewChat = startNewChat;
window.loadChats = loadChats;
window.renameChat = renameChat;
window.togglePinChat = togglePinChat;
window.deleteChat = deleteChat;
window.clearAllHistory = clearAllHistory;
