/**
 * 对话管理器模块
 * 负责对话的保存、加载和菜单交互
 *
 * @module ChatManager
 * @description 处理对话的持久化、菜单显示和交互逻辑
 *
 * @requires state - 全局状态管理器
 * @requires generateChatId - ID生成函数
 * @requires loadChats - 对话列表加载函数
 */

/* eslint-disable no-unused-vars, no-undef */

class ChatManager {
  constructor() {
    this.state = window.state;
    this.autoTitleCooldownMs = 30000;
    this.autoTitleInFlight = new Set();
    this.autoTitleLastAt = new Map();
    this.autoTitleLastMessageCount = new Map();
    this.defaultChatTitles = new Set(['新对话', '新会话', '未命名对话']);
    this.missingChatIds = this.loadMissingChatIds();
    this.incompleteReportWarningKeys = new Set();
    this.handleReportStatusChanged = this.handleReportStatusChanged.bind(this);
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('tc:report-status-changed', this.handleReportStatusChanged);
    }
  }

  async handleReportStatusChanged(event) {
    try {
      const detail = event?.detail || {};
      if (String(detail.type || '') !== 'analysis') {
        return;
      }
      const chatId = String(detail.chatId || '');
      if (!chatId || String(this.state.currentChat || '') !== chatId) {
        return;
      }
      await this.ensureReportActionForChat(chatId);
    } catch (error) {
      console.error('[ChatManager] 报告状态事件处理失败:', error);
    }
  }

  loadMissingChatIds() {
    try {
      const raw = sessionStorage.getItem('tc_missing_chats');
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.map(id => String(id)).filter(Boolean));
    } catch (error) {
      return new Set();
    }
  }

  persistMissingChatIds() {
    try {
      sessionStorage.setItem('tc_missing_chats', JSON.stringify([...this.missingChatIds]));
    } catch (error) {
      // ignore storage write errors
    }
  }

  async pruneMissingChat(chatId) {
    const targetId = String(chatId);
    this.state.chats = this.state.chats.filter(c => String(c.id) !== targetId);

    if (window.storageManager?.deleteChat) {
      await window.storageManager.deleteChat(targetId).catch(() => {});
    }

    try {
      localStorage.setItem('thinkcraft_chats', JSON.stringify(this.state.chats));
    } catch (storageError) {
      // ignore local storage write failures
    }

    if (String(this.state.currentChat) === targetId) {
      this.state.currentChat = null;
      this.state.messages = [];
      this.state.userData = {};
      this.state.conversationStep = 0;
      this.state.analysisCompleted = false;
    }
  }

  isReportLikeContent(content) {
    if (!content || typeof content !== 'string') return false;
    if (content.includes('[ANALYSIS_COMPLETE]')) return false;

    const trimmed = content.trim();
    if (trimmed.length < 1200) return false;

    const head = trimmed.slice(0, 300);
    const hasReportTitle = /分析报告|创意分析报告|完整报告|报告摘要/.test(head);
    const headingCount = (trimmed.match(/^#{1,3}\s+/gm) || []).length;
    const sectionCount = (trimmed.match(/^\s*[一二三四五六七八九十]\s*、/gm) || []).length;
    const hasKeywords = /(核心定义|核心洞察|边界条件|可行性分析|关键挑战|结构化行动|思维盲点)/.test(
      trimmed
    );

    return (hasReportTitle || hasKeywords) && headingCount + sectionCount >= 3;
  }

  isReportCompletionHint(content) {
    if (!content || typeof content !== 'string') return false;
    return /报告生成完毕|生成报告已完成|分析报告已生成|可点击.*查看完整报告/.test(content);
  }

  getActiveInputValue() {
    const desktopInput = document.getElementById('mainInput');
    const mobileInput = document.getElementById('mobileTextInput');
    const activeInput =
      mobileInput && mobileInput.offsetParent !== null ? mobileInput : desktopInput;
    return activeInput ? activeInput.value : '';
  }

  normalizeAutoTitle(rawTitle) {
    if (!rawTitle || typeof rawTitle !== 'string') return '';
    let title = rawTitle.trim();
    title = title.replace(/^["'“”]+|["'“”]+$/g, '');
    title = title.replace(/\s+/g, ' ');
    title = title.replace(/[。！？!?]+$/g, '');
    if (title.length > 30) {
      title = title.slice(0, 30).trim();
    }
    return title;
  }

  isNotFoundError(error) {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('404') || message.includes('not found') || message.includes('不存在');
  }

  buildFallbackTitle(messages) {
    const firstUser = messages.find(m => m && m.role === 'user' && typeof m.content === 'string');
    if (!firstUser) return '';
    let title = firstUser.content.trim().slice(0, 30);
    if (firstUser.content.length > 30) {
      title += '...';
    }
    return title;
  }

  async applyAutoTitle(chatId, title) {
    if (!title) return;
    const targetId = String(chatId);
    const index = this.state.chats.findIndex(c => String(c.id) === targetId);
    if (index === -1) return;
    const current = this.state.chats[index];
    if (current.titleEdited) return;
    if (current.title === title) return;

    const updated = {
      ...current,
      title,
      titleEdited: false,
      updatedAt: new Date().toISOString()
    };
    this.state.chats[index] = updated;

    if (window.storageManager) {
      await window.storageManager.saveChat(updated);
    }

    if (window.apiClient?.put) {
      window.apiClient
        .put(`/api/chat/${chatId}`, {
          title,
          titleEdited: false
        })
        .catch(() => {});
    }

    if (window.chatList?.loadChats) {
      window.chatList.loadChats({ preferLocal: true });
    } else if (typeof loadChats === 'function') {
      loadChats({ preferLocal: true });
    }
  }

  async requestAutoTitle(chatId, options = {}) {
    const { reason = 'unknown', messages = null } = options;
    if (!chatId) return;
    const targetId = String(chatId);
    if (this.autoTitleInFlight.has(targetId)) return;

    const lastAt = this.autoTitleLastAt.get(targetId);
    if (lastAt && Date.now() - lastAt < this.autoTitleCooldownMs) return;

    let chat = this.state.chats.find(c => String(c.id) === targetId);
    if (!chat && window.storageManager?.getChat) {
      chat = await window.storageManager.getChat(targetId).catch(() => null);
    }
    if (!chat || chat.titleEdited) return;
    const currentTitle = String(chat.title || '').trim();
    // 仅在默认标题阶段触发自动命名，避免对话过程中频繁改名
    if (currentTitle && !this.defaultChatTitles.has(currentTitle)) return;

    const sourceMessages = Array.isArray(messages)
      ? messages
      : String(this.state.currentChat) === targetId
        ? this.state.messages
        : chat.messages;
    const normalizedMessages = (sourceMessages || [])
      .filter(m => m && typeof m.content === 'string')
      .map(m => ({
        role: m.role || m.sender || 'user',
        content: m.content
      }));
    const userMessageCount = normalizedMessages.filter(m => m.role === 'user').length;
    if (normalizedMessages.length < 2 || userMessageCount === 0) return;

    const lastMessageCount = this.autoTitleLastMessageCount.get(targetId);
    if (lastMessageCount && lastMessageCount >= normalizedMessages.length) return;

    this.autoTitleInFlight.add(targetId);
    try {
      const payloadMessages = normalizedMessages.slice(-10);
      if (window.apiClient?.post) {
        const response = await window.apiClient.post(`/api/chat/${chatId}/auto-title`, {
          messages: payloadMessages,
          reason
        });
        const title = this.normalizeAutoTitle(response?.data?.title || response?.data?.content);
        if (title) {
          await this.applyAutoTitle(chatId, title);
          this.autoTitleLastMessageCount.set(targetId, normalizedMessages.length);
          return;
        }
      }

      const fallback = this.normalizeAutoTitle(this.buildFallbackTitle(payloadMessages));
      if (fallback) {
        await this.applyAutoTitle(chatId, fallback);
        this.autoTitleLastMessageCount.set(targetId, normalizedMessages.length);
      }
    } catch (error) {
      const fallback = this.normalizeAutoTitle(this.buildFallbackTitle(normalizedMessages));
      if (fallback) {
        await this.applyAutoTitle(chatId, fallback);
        this.autoTitleLastMessageCount.set(targetId, normalizedMessages.length);
      }
    } finally {
      this.autoTitleInFlight.delete(targetId);
      this.autoTitleLastAt.set(targetId, Date.now());
    }
  }

  applyInputDraft(chatId) {
    const draft = window.stateManager?.getInputDraft
      ? window.stateManager.getInputDraft(chatId)
      : '';
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

  /**
   * 保存当前对话
   *
   * @description
   * 将当前对话保存到 IndexedDB。
   * 如果是新对话（currentChat为null），创建新记录并分配ID。
   * 如果是现有对话，更新记录。
   * 自动从第一条用户消息提取标题（如果未手动编辑）。
   */
  async saveCurrentChat() {
    if (!this.state.settings.saveHistory || this.state.messages.length === 0) return;

    // 从第一条用户消息提取标题
    let title = '新对话';
    const existingChat =
      this.state.currentChat !== null
        ? this.state.chats.find(c => String(c.id) === String(this.state.currentChat))
        : null;
    const titleEdited = Boolean(existingChat?.titleEdited);
    const existingTitle = String(existingChat?.title || '').trim();
    if (titleEdited && existingTitle) {
      title = existingTitle;
    } else if (existingTitle && !this.defaultChatTitles.has(existingTitle)) {
      // 已有有效标题（含自动命名），保持稳定，不在后续保存中反复改写
      title = existingTitle;
    } else {
      // 仅在默认标题时，使用首条用户消息作为兜底标题
      const firstUserMsg = this.state.messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        title = firstUserMsg.content.substring(0, 30);
        if (firstUserMsg.content.length > 30) {
          title += '...';
        }
      }
    }

    const now = new Date().toISOString();
    let chat;

    // 核心逻辑：区分创建新对话和更新现有对话
    if (this.state.currentChat === null) {
      // 场景1：创建新对话
      const chatId = generateChatId();
      chat = {
        id: chatId,
        title: title,
        titleEdited: false,
        messages: [...this.state.messages],
        userData: { ...this.state.userData },
        conversationStep: this.state.conversationStep,
        analysisCompleted: this.state.analysisCompleted,
        createdAt: now,
        updatedAt: now
      };

      this.state.currentChat = chatId; // 设置当前对话ID
      this.state.chats.unshift(chat);
    } else {
      // 场景2：更新现有对话
      const index = this.state.chats.findIndex(
        c => String(c.id) === String(this.state.currentChat)
      );
      if (index !== -1) {
        chat = {
          ...this.state.chats[index],
          title: title,
          titleEdited: this.state.chats[index].titleEdited || false,
          messages: [...this.state.messages],
          userData: { ...this.state.userData },
          conversationStep: this.state.conversationStep,
          analysisCompleted: this.state.analysisCompleted,
          updatedAt: now
        };
        this.state.chats[index] = chat;
      } else {
        // 降级处理：当前对话ID不存在，使用现有ID创建新对话
        chat = {
          id: this.state.currentChat,
          title: title,
          titleEdited: titleEdited || false,
          messages: [...this.state.messages],
          userData: { ...this.state.userData },
          conversationStep: this.state.conversationStep,
          analysisCompleted: this.state.analysisCompleted,
          createdAt: now,
          updatedAt: now
        };
        this.state.chats.unshift(chat);
      }
    }

    // 保存到 IndexedDB
    if (window.storageManager) {
      await window.storageManager.saveChat(chat);
    }

    // 刷新对话列表
    if (typeof loadChats === 'function') {
      loadChats();
    }
  }

  /**
   * 根据ID加载对话
   *
   * @param {number|string} chatId - 对话ID
   * @returns {Promise<void>}
   *
   * @description
   * 加载指定ID的对话，包括消息、用户数据和对话状态。
   * 自动保存当前对话（如果有变更）。
   * 更新UI显示。
   */
  async loadChat(chatId) {
    const targetId = String(chatId);
    if (this.missingChatIds.has(targetId)) {
      await this.pruneMissingChat(targetId);
      if (window.chatList?.loadChats) {
        await window.chatList.loadChats({ preferLocal: false });
      } else if (typeof loadChats === 'function') {
        await loadChats({ preferLocal: false });
      }
      return;
    }

    let chat = this.state.chats.find(c => String(c.id) === String(chatId));

    // 如果已登录，优先从后端拉取最新状态
    const authToken = window.getAuthToken ? window.getAuthToken() : null;
    if (authToken && window.apiClient?.get) {
      try {
        const response = await window.apiClient.get(`/api/chat/${chatId}`);
        if (response?.code === 0 && response?.data?.id) {
          const serverChat = response.data;
          const normalizedChat = {
            id: serverChat.id,
            title: serverChat.title,
            titleEdited: Boolean(serverChat.titleEdited),
            messages: Array.isArray(serverChat.messages)
              ? serverChat.messages.map(msg => ({
                  role: msg.sender === 'user' ? 'user' : 'assistant',
                  content: msg.content
                }))
              : [],
            userData: serverChat.userData || {},
            conversationStep: serverChat.conversationStep || 0,
            analysisCompleted: serverChat.analysisCompleted || false,
            reportState: serverChat.reportState || null,
            createdAt: serverChat.createdAt,
            updatedAt: serverChat.updatedAt,
            status: serverChat.status,
            tags: serverChat.tags || [],
            isPinned: serverChat.isPinned || false
          };

          chat = normalizedChat;
          const existingIndex = this.state.chats.findIndex(c => String(c.id) === String(chatId));
          if (existingIndex !== -1) {
            this.state.chats[existingIndex] = normalizedChat;
          } else {
            this.state.chats.unshift(normalizedChat);
          }
          if (window.storageManager) {
            await window.storageManager.saveChat(normalizedChat);
          }
        }
      } catch (error) {
        if (this.isNotFoundError(error)) {
          console.warn('[ChatManager] 会话在后端不存在，清理本地残留会话', { chatId, error });
          this.missingChatIds.add(String(chatId));
          this.persistMissingChatIds();
          await this.pruneMissingChat(chatId);
          if (window.chatList?.loadChats) {
            await window.chatList.loadChats({ preferLocal: false });
          } else if (typeof loadChats === 'function') {
            await loadChats({ preferLocal: false });
          }
          return;
        }

        console.warn('[ChatManager] 拉取后端会话失败，使用本地缓存', error);
      }
    }

    if (!chat) {
      console.warn('[ChatManager] 会话数据缺失，清理不可用会话', { chatId });
      this.missingChatIds.add(targetId);
      this.persistMissingChatIds();
      await this.pruneMissingChat(chatId);
      if (window.chatList?.loadChats) {
        await window.chatList.loadChats({ preferLocal: false });
      } else if (typeof loadChats === 'function') {
        await loadChats({ preferLocal: false });
      }
      return;
    }

    const currentChatId = this.state.currentChat;
    if (currentChatId && String(currentChatId) !== String(chatId)) {
      this.requestAutoTitle(currentChatId, {
        reason: 'switch_chat',
        messages: Array.isArray(this.state.messages) ? [...this.state.messages] : []
      });
    }

    // 🔧 保存当前输入草稿（切换前）
    if (window.stateManager?.setInputDraft) {
      window.stateManager.setInputDraft(this.state.currentChat, this.getActiveInputValue());
    }

    // 🔧 保存当前会话的报告生成状态到 IndexedDB
    if (this.state.currentChat && this.state.currentChat !== chatId) {
      if (typeof window.reportButtonManager?.saveCurrentSessionState === 'function') {
        await window.reportButtonManager.saveCurrentSessionState(this.state.currentChat);
      }
    }

    // 保存当前对话
    if (
      this.state.currentChat &&
      this.state.currentChat !== chatId &&
      this.state.messages.length > 0 &&
      this.state.settings.saveHistory
    ) {
      await this.saveCurrentChat();
    }

    // 加载选中的对话
    this.state.currentChat = chat.id;
    this.state.messages = Array.isArray(chat.messages) ? [...chat.messages] : [];
    this.state.userData = chat.userData || {};
    this.state.conversationStep = chat.conversationStep || 0;
    this.state.analysisCompleted = chat.analysisCompleted || false;
    if (window.stateManager?.applyReportState && chat.reportState) {
      window.stateManager.applyReportState(chat.id, chat.reportState);
    }

    // 将报告状态写入 IndexedDB，便于按钮恢复
    if (window.storageManager && chat.reportState) {
      try {
        const reportTypes = ['analysis', 'business', 'proposal'];
        for (const type of reportTypes) {
          const stateEntry = chat.reportState?.[type];
          if (!stateEntry) continue;
          const existing = await window.storageManager.getReportByChatIdAndType(chat.id, type);
          const nextData = stateEntry.data ?? existing?.data ?? null;
          const nextStatus = stateEntry.status ?? existing?.status;
          if (nextStatus === 'completed' && !nextData) {
            const warningKey = `${chat.id}:${type}`;
            if (!this.incompleteReportWarningKeys.has(warningKey)) {
              this.incompleteReportWarningKeys.add(warningKey);
              console.warn('[ChatManager] 跳过写入完成状态但缺少数据的报告', {
                chatId: chat.id,
                type,
                status: nextStatus
              });
            }
            continue;
          }
          await window.storageManager.saveReport({
            id: existing?.id,
            type,
            chatId: chat.id,
            data: nextData,
            status: nextStatus,
            progress: stateEntry.progress ?? existing?.progress,
            startTime: stateEntry.startTime ?? existing?.startTime,
            endTime: stateEntry.endTime ?? existing?.endTime,
            error: stateEntry.error ?? existing?.error ?? null,
            selectedChapters: stateEntry.selectedChapters ?? existing?.selectedChapters ?? []
          });
        }
      } catch (error) {
        console.error('[ChatManager] 恢复报告状态失败，继续加载会话', {
          chatId: chat.id,
          error
        });
      }
    }

    // 兼容旧数据：为历史报告类消息补充完成标记并持久化
    let didNormalizeReportMarker = false;
    const normalizedMessages = this.state.messages.map(msg => {
      if (!msg || msg.role !== 'assistant' || typeof msg.content !== 'string') {
        return msg;
      }
      if (msg.content.includes('[ANALYSIS_COMPLETE]')) {
        return msg;
      }
      if (this.isReportLikeContent(msg.content)) {
        didNormalizeReportMarker = true;
        return {
          ...msg,
          content: `${msg.content}\n\n[ANALYSIS_COMPLETE]`
        };
      }
      return msg;
    });

    if (didNormalizeReportMarker) {
      this.state.messages = normalizedMessages;
      chat.messages = normalizedMessages;
      chat.analysisCompleted = true;
      if (window.storageManager) {
        await window.storageManager.saveChat(chat);
      }
    }

    // 清空并重新渲染消息列表
    const messageList = document.getElementById('messageList');
    messageList.innerHTML = '';
    document.getElementById('emptyState').style.display = 'none';
    messageList.style.display = 'block';

    // 渲染所有消息
    this.state.messages.forEach(msg => {
      if (window.messageHandler) {
        window.messageHandler.addMessage(msg.role, msg.content, null, false, true, true);
      }
    });

    // 兼容：历史消息缺少按钮时，按会话状态补齐
    await this.ensureReportActionForChat(chatId);

    // 智能检测：如果侧边栏处于覆盖模式（移动端），自动关闭并显示对话窗口
    const sidebar = document.getElementById('sidebar');
    const isOverlayMode = window.getComputedStyle(sidebar).position === 'fixed';
    if (isOverlayMode && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
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

    // 刷新对话列表（更新active状态）
    if (typeof loadChats === 'function') {
      loadChats();
    }

    // 🔧 恢复该会话的输入草稿
    this.applyInputDraft(chatId);

    // 🔧 加载新会话的报告生成状态
    if (typeof window.reportGenerator?.loadGenerationStatesForChat === 'function') {
      await window.reportGenerator.loadGenerationStatesForChat(chatId);
    }

    // 滚动到底部
    if (typeof scrollToBottom === 'function') {
      scrollToBottom(true);
    }

    // 聚焦输入框
    if (typeof focusInput === 'function') {
      focusInput();
    }
  }

  async ensureReportActionForChat(chatId) {
    const messageList = document.getElementById('messageList');
    if (!messageList) return;

    const assistantMessages = messageList.querySelectorAll('.message.assistant');
    if (!assistantMessages.length) return;

    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    if (!lastAssistant) return;

    const existingAction = lastAssistant.querySelector('.message-actions .view-report-btn');

    const buildButtonHtml = buttonState => {
      const state = buttonState?.buttonState || 'completed';
      const text = buttonState?.buttonText || '查看完整报告';
      return `
                <button class="view-report-btn ${state}"
                        onclick="viewReport()"
                        data-state="${state}">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                        ${text}
                </button>
            `;
    };

    const renderButton = buttonState => {
      const actionElement = document.createElement('div');
      actionElement.className = 'message-actions';
      actionElement.style.display = 'flex';
      actionElement.innerHTML = buildButtonHtml(buttonState);
      const targetContent =
        resolveTargetMessageContent() || lastAssistant.querySelector('.message-content');
      if (!targetContent) return;
      if (targetContent.querySelector('.message-actions .view-report-btn')) return;
      targetContent.appendChild(actionElement);
    };

    const updateExistingButton = buttonState => {
      if (!existingAction) return false;
      const state = buttonState?.buttonState || 'completed';
      const text = buttonState?.buttonText || '查看完整报告';
      existingAction.className = `view-report-btn ${state}`;
      existingAction.setAttribute('data-state', state);
      existingAction.innerHTML = `
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                ${text}
            `;
      return true;
    };

    const resolveTargetMessageContent = () => {
      // 优先找到带报告完成标记/提示的最后一条assistant消息
      const assistantStates = (this.state.messages || []).filter(
        msg => msg && msg.role === 'assistant'
      );
      let targetIndex = -1;
      for (let i = assistantStates.length - 1; i >= 0; i -= 1) {
        const content = assistantStates[i]?.content;
        if (!content || typeof content !== 'string') continue;
        if (
          content.includes('[ANALYSIS_COMPLETE]') ||
          this.isReportLikeContent(content) ||
          this.isReportCompletionHint(content)
        ) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) {
        return lastAssistant.querySelector('.message-content');
      }
      const targetMessageEl = assistantMessages[targetIndex];
      if (!targetMessageEl) {
        return lastAssistant.querySelector('.message-content');
      }
      return targetMessageEl.querySelector('.message-content');
    };

    if (window.reportStatusManager) {
      try {
        const buttonState = await window.reportStatusManager.shouldShowReportButton(
          chatId,
          'analysis'
        );
        if (buttonState.shouldShow) {
          if (updateExistingButton(buttonState)) {
            return;
          }
          renderButton(buttonState);
          return;
        }
      } catch (error) {
        console.error('[ChatManager] 补齐报告按钮失败:', error);
      }
    }

    const hasMarker = this.state.messages?.some(
      msg =>
        msg &&
        msg.role === 'assistant' &&
        typeof msg.content === 'string' &&
        (msg.content.includes('[ANALYSIS_COMPLETE]') || msg.content.includes('SIS_COMPLETE]'))
    );
    const hasReportLike = this.state.messages?.some(
      msg =>
        msg &&
        msg.role === 'assistant' &&
        typeof msg.content === 'string' &&
        this.isReportLikeContent(msg.content)
    );
    const hasCompletionHint = this.state.messages?.some(
      msg =>
        msg &&
        msg.role === 'assistant' &&
        typeof msg.content === 'string' &&
        this.isReportCompletionHint(msg.content)
    );
    if (this.state.analysisCompleted || hasMarker || hasReportLike || hasCompletionHint) {
      if (updateExistingButton()) {
        return;
      }
      renderButton();
    }
  }

  /**
   * 切换对话菜单显示状态
   *
   * @param {Event} e - 事件对象
   * @param {number|string} chatId - 对话ID
   *
   * @description
   * 显示或隐藏对话项的操作菜单。
   * 自动关闭其他已打开的菜单。
   * 使用portal模式将菜单移到body下，避免被父容器裁剪。
   */
  toggleChatMenu(e, chatId) {
    e.stopPropagation();
    const menu = document.getElementById(`menu-${chatId}`);
    const button = e.currentTarget;
    const chatItem = button.closest('.chat-item');

    // 关闭所有其他菜单，并移除 menu-open 类
    document.querySelectorAll('.chat-item-menu').forEach(m => {
      if (m.id !== `menu-${chatId}`) {
        m.classList.remove('active');
        this.restoreChatMenu(m);
      }
    });
    document.querySelectorAll('.chat-item.menu-open').forEach(item => {
      item.classList.remove('menu-open');
    });

    // 切换当前菜单
    if (menu.classList.contains('active')) {
      menu.classList.remove('active');
      this.restoreChatMenu(menu);
      chatItem.classList.remove('menu-open');
    } else {
      this.portalChatMenu(menu, chatId);
      this.syncPinMenuLabel(menu, chatId);

      // 计算菜单位置
      const rect = button.getBoundingClientRect();
      menu.style.position = 'fixed';
      menu.style.top = `${rect.bottom + 4}px`;
      menu.style.left = `${rect.left - 120}px`;
      menu.style.zIndex = '1000';

      menu.classList.add('active');
      chatItem.classList.add('menu-open');
    }
  }

  /**
   * 将菜单移到body下（portal模式）
   *
   * @param {HTMLElement} menu - 菜单元素
   * @param {number|string} chatId - 对话ID
   *
   * @description
   * 将菜单元素移到document.body下，避免被父容器的overflow裁剪。
   * 保存chatId到dataset，用于后续恢复。
   */
  portalChatMenu(menu, chatId) {
    menu.dataset.chatId = chatId;
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
  }

  /**
   * 同步置顶菜单项的文本
   *
   * @param {HTMLElement} menu - 菜单元素
   * @param {number|string} chatId - 对话ID
   *
   * @description
   * 根据对话的置顶状态，更新菜单中"置顶/取消置顶"项的文本。
   */
  syncPinMenuLabel(menu, chatId) {
    const chat = this.state.chats.find(c => String(c.id) === String(chatId));
    if (!chat) return;
    const label = menu.querySelector('[data-action="pin"]');
    if (label) {
      // 清除所有文本节点，避免重复
      Array.from(label.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          node.remove();
        }
      });
      // 添加新的文本节点
      const newText = document.createTextNode(chat.isPinned ? '取消置顶' : '置顶');
      label.appendChild(newText);
    }
  }

  /**
   * 恢复菜单到原始位置
   *
   * @param {HTMLElement} menu - 菜单元素
   *
   * @description
   * 将菜单从body移回到对应的chat-item-actions容器中。
   * 如果找不到原始容器，则从DOM中移除菜单。
   */
  restoreChatMenu(menu) {
    const menuId = menu.id || '';
    const menuChatId = menu.dataset.chatId || (menuId.startsWith('menu-') ? menuId.slice(5) : '');
    if (!menuChatId) return;
    const chatItem = document.querySelector(`.chat-item[data-chat-id="${menuChatId}"]`);
    const actions = chatItem ? chatItem.querySelector('.chat-item-actions') : null;
    if (actions && menu.parentElement !== actions) {
      actions.appendChild(menu);
    } else if (!actions && menu.parentElement === document.body) {
      menu.remove();
    }
  }

  /**
   * 重新打开对话菜单
   *
   * @param {number|string} chatId - 对话ID
   *
   * @description
   * 在下一帧重新打开指定对话的菜单。
   * 用于在重命名、置顶等操作后保持菜单打开状态。
   */
  reopenChatMenu(chatId) {
    requestAnimationFrame(() => {
      const button = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-item-more`);
      if (!button) return;
      this.toggleChatMenu({ stopPropagation() {}, currentTarget: button }, chatId);
    });
  }

  /**
   * 关闭指定对话的菜单
   *
   * @param {number|string} chatId - 对话ID
   *
   * @description
   * 关闭指定对话的菜单并恢复到原始位置。
   * 移除所有menu-open类。
   */
  closeChatMenu(chatId) {
    const menu = document.getElementById(`menu-${chatId}`);
    if (menu) {
      menu.classList.remove('active');
      this.restoreChatMenu(menu);
    }
    // 移除所有 menu-open 类
    document.querySelectorAll('.chat-item.menu-open').forEach(item => {
      item.classList.remove('menu-open');
    });
  }
}

// 创建全局实例
window.chatManager = new ChatManager();

// 暴露全局函数（向后兼容）
async function saveCurrentChat() {
  await window.chatManager.saveCurrentChat();
}

function loadChat(chatId) {
  return window.chatManager.loadChat(chatId);
}

function toggleChatMenu(e, chatId) {
  window.chatManager.toggleChatMenu(e, chatId);
}

function portalChatMenu(menu, chatId) {
  window.chatManager.portalChatMenu(menu, chatId);
}

function syncPinMenuLabel(menu, chatId) {
  window.chatManager.syncPinMenuLabel(menu, chatId);
}

function restoreChatMenu(menu) {
  window.chatManager.restoreChatMenu(menu);
}

function reopenChatMenu(chatId) {
  window.chatManager.reopenChatMenu(chatId);
}

function closeChatMenu(chatId) {
  window.chatManager.closeChatMenu(chatId);
}
