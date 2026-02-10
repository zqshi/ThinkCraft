/**
 * 消息处理模块
 * 负责发送消息、接收AI回复、显示消息等核心聊天功能
 */

/* eslint-disable no-unused-vars, no-undef */

function detectAnalysisReportLikeContent(content) {
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

function isReportCompletionHint(content) {
  if (!content || typeof content !== 'string') return false;
  return /报告生成完毕|生成报告已完成|分析报告已生成|查看完整分析报告/.test(content);
}

function normalizeAIContentForDisplay(content) {
  if (!content || typeof content !== 'string') return content;
  if (detectAnalysisReportLikeContent(content)) {
    return '分析报告已生成，可点击下方按钮查看完整报告。\n\n[ANALYSIS_COMPLETE]';
  }
  return content;
}

class MessageHandler {
  constructor() {
    // 依赖注入
    this.state = window.state;
    this.lastFailedSend = null;
  }

  /**
   * 发送消息
   */
  async sendMessage() {
    // 兼容桌面端和移动端输入框
    const desktopInput = document.getElementById('mainInput');
    const mobileInput = document.getElementById('mobileTextInput');
    const input = mobileInput && mobileInput.offsetParent !== null ? mobileInput : desktopInput;
    const message = input.value.trim();

    if (!message || this.isCurrentChatBusy()) return;

    const wasNewChat = state.currentChat === null;
    let chatId = state.currentChat;
    if (state.settings.saveHistory && chatId === null) {
      let createdChat = null;
      let authToken = window.getAuthToken ? window.getAuthToken() : null;
      if (!authToken && window.requireAuth) {
        await window.requireAuth({ redirect: true, prompt: true });
        authToken = window.getAuthToken ? window.getAuthToken() : authToken;
      }

      if (window.apiClient?.post) {
        try {
          const response = await window.apiClient.post('/api/chat/create', { title: '新对话' });
          if (response?.code === 0 && response?.data?.id) {
            createdChat = response.data;
            chatId = createdChat.id;
          }
        } catch (error) {
          console.warn('[发送消息] 后端创建聊天失败:', error);
          const status = error?.status;
          if ((status === 401 || status === 403) && window.requireAuth) {
            await window.requireAuth({ redirect: true, prompt: true });
          } else if (window.toast?.error) {
            window.toast.error('后端不可用，无法创建对话', 4000);
          }
        }
      }

      if (!chatId) {
        const message = '无法创建对话，请检查后端服务或登录状态。';
        if (window.modalManager?.alert) {
          window.modalManager.alert(message, 'warning');
        } else if (window.toast?.warning) {
          window.toast.warning(message, 4000);
        } else {
          alert(message);
        }
        return;
      }

      state.currentChat = chatId;
      const newChat = {
        id: chatId,
        title: createdChat?.title || '新对话',
        titleEdited: createdChat?.titleEdited || false,
        messages: createdChat?.messages || [],
        userData: { ...state.userData },
        conversationStep: createdChat?.conversationStep || 0,
        analysisCompleted: createdChat?.analysisCompleted || false,
        reportState: createdChat?.reportState || null,
        createdAt: createdChat?.createdAt || new Date().toISOString(),
        updatedAt: createdChat?.updatedAt || new Date().toISOString()
      };
      state.chats.unshift(newChat);
      if (typeof loadChats === 'function') {
        loadChats();
      }
    }

    // 首次对话时重置分析状态
    if (state.messages.length === 0) {
      state.analysisCompleted = false;
    }

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('messageList').style.display = 'block';

    state.autoScrollEnabled = true;

    // 添加用户消息（skipStatePush=true，因为下面会手动push）
    const userMessageEl = this.addMessage('user', message, null, false, false, true);
    input.value = '';
    input.style.height = 'auto';
    if (window.stateManager?.clearInputDraft) {
      window.stateManager.clearInputDraft(chatId);
      if (wasNewChat) {
        window.stateManager.clearInputDraft(null);
      }
    }

    // 移动端：不自动切换输入模式，保持用户选择的模式
    // 用户可以通过点击按钮手动切换

    // 将消息添加到state.messages
    state.messages.push({
      role: 'user',
      content: message
    });

    // ⭐ 递增对话步骤
    state.conversationStep++;
    if (window.stateManager?.setConversationStep) {
      window.stateManager.setConversationStep(chatId, state.conversationStep);
    }

    // 同步用户消息到后端
    if (chatId && window.apiClient?.post) {
      window.apiClient
        .post('/api/chat/send-message', {
          chatId: String(chatId),
          content: message,
          type: 'text',
          sender: 'user'
        })
        .catch(() => {});
    }

    if (state.settings.saveHistory && chatId !== null) {
      const index = state.chats.findIndex(c => String(c.id) === String(chatId));
      if (index !== -1) {
        state.chats[index] = {
          ...state.chats[index],
          messages: [...state.messages],
          userData: { ...state.userData },
          conversationStep: state.conversationStep,
          analysisCompleted: state.analysisCompleted,
          updatedAt: new Date().toISOString()
        };
        // 本地缓存已禁用，无需持久化
      }
    }

    await this.requestAIResponse(chatId, {
      originalMessage: message,
      messagesSnapshot: Array.isArray(state.messages) ? [...state.messages] : [],
      userMessageEl
    });
  }

  /**
   * 处理API响应（显示AI回复）
   * @param {string} content - AI回复内容
   */
  handleAPIResponse(content, chatId = null) {
    const messageList = document.getElementById('messageList');
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-role">ThinkCraft</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text" id="typing-${Date.now()}"></div>
                <div class="message-actions" id="actions-${Date.now()}" style="display: none;"></div>
            </div>
        `;
    messageList.appendChild(messageDiv);

    const textElement = messageDiv.querySelector('.message-text');
    const actionElement = messageDiv.querySelector('.message-actions');

    // 使用打字机效果
    const targetChatId = chatId ?? state.currentChat;
    typeWriterWithCompletion(textElement, actionElement, content, 30, targetChatId);

    scrollToBottom();
  }

  /**
   * 请求AI响应（支持重试）
   * @param {string|number} chatId
   * @param {Object} options
   * @param {string} options.originalMessage
   * @param {Array} options.messagesSnapshot
   */
  async requestAIResponse(chatId, options = {}) {
    const {
      originalMessage = null,
      messagesSnapshot = null,
      userMessageEl = null,
      autoRetry = true,
      attempt = 0
    } = options;
    if (!window.apiClient?.post) {
      if (window.toast?.error) {
        window.toast.error('后端不可用，请稍后重试', 4000);
      }
      return;
    }

    if (chatId !== null) {
      state.pendingChatIds.add(chatId);
    }
    state.isLoading = state.pendingChatIds.size > 0;

    try {
      const payloadMessages = Array.isArray(messagesSnapshot) ? messagesSnapshot : state.messages;
      const payload = {
        messages: payloadMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      };

      const data = await window.apiClient.post('/api/chat', payload);
      if (data.code !== 0) {
        throw new Error(data.error || '未知错误');
      }

      const rawContent = data.data.content || data.data.message;
      if (!rawContent) {
        throw new Error('AI返回的内容为空');
      }

      const aiContent = normalizeAIContentForDisplay(rawContent);

      if (state.settings.saveHistory && chatId !== null) {
        const index = state.chats.findIndex(c => String(c.id) === String(chatId));
        if (index !== -1) {
          const chatMessages = Array.isArray(state.chats[index].messages)
            ? [...state.chats[index].messages]
            : [];
          chatMessages.push({ role: 'assistant', content: aiContent });
          state.chats[index] = {
            ...state.chats[index],
            messages: chatMessages,
            updatedAt: new Date().toISOString()
          };
        }
      }

      if (String(state.currentChat) === String(chatId)) {
        state.messages.push({
          role: 'assistant',
          content: aiContent
        });

        state.conversationStep++;
        if (window.stateManager?.setConversationStep) {
          window.stateManager.setConversationStep(chatId, state.conversationStep);
        }

        this.handleAPIResponse(aiContent, chatId);
      }

      if (
        state.settings.saveHistory &&
        String(state.currentChat) === String(chatId) &&
        typeof saveCurrentChat === 'function'
      ) {
        await saveCurrentChat();
      }

      if (window.chatManager?.requestAutoTitle) {
        window.chatManager.requestAutoTitle(chatId, {
          reason: 'first_reply',
          messages: Array.isArray(state.messages) ? [...state.messages] : []
        });
      }

      if (chatId && window.apiClient?.post) {
        window.apiClient
          .post('/api/chat/send-message', {
            chatId: String(chatId),
            content: aiContent,
            type: 'text',
            sender: 'assistant'
          })
          .catch(() => {});
      }
      if (userMessageEl) {
        this.clearRetryAction(userMessageEl);
      }
      this.lastFailedSend = null;
    } catch (error) {
      const status = error?.status;
      if ((status === 401 || status === 403) && window.requireAuth) {
        await window.requireAuth({ redirect: true, prompt: true });
        return;
      }

      if (autoRetry && attempt === 0) {
        if (window.toast?.info) {
          window.toast.info('请求失败，正在自动重试...', 2000);
        }
        await this.requestAIResponse(chatId, {
          originalMessage,
          messagesSnapshot,
          userMessageEl,
          autoRetry: false,
          attempt: 1
        });
        return;
      }

      if (window.toast?.error) {
        window.toast.error(`发送失败：${error.message}（可点击重试）`, 4000);
      }
      this.lastFailedSend = {
        chatId,
        message: originalMessage,
        messagesSnapshot: Array.isArray(messagesSnapshot) ? messagesSnapshot : null,
        userMessageEl,
        timestamp: Date.now()
      };

      const errorMsg = `发送失败：${error.message}`;
      if (String(state.currentChat) === String(chatId)) {
        const errorEl = this.addMessage('assistant', errorMsg, null, false, true, true);
        this.attachRetryAction(userMessageEl || errorEl);
      }
    } finally {
      if (chatId !== null) {
        state.pendingChatIds.delete(chatId);
      }
      state.isLoading = state.pendingChatIds.size > 0;
    }
  }

  /**
   * 为错误消息添加重试按钮
   * @param {HTMLElement} messageDiv
   */
  attachRetryAction(messageDiv) {
    if (!messageDiv) return;
    const contentEl = messageDiv.querySelector('.message-content');
    if (!contentEl) return;
    const existing = contentEl.querySelector('.message-actions.retry-actions');
    if (existing) {
      existing.remove();
    }
    const actions = document.createElement('div');
    actions.className = 'message-actions retry-actions';
    actions.style.display = 'flex';
    actions.innerHTML = `
            <button class="view-report-btn" onclick="retryLastSend()">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v6h6M20 20v-6h-6M5 9a7 7 0 0112-3l3 3M19 15a7 7 0 01-12 3l-3-3"/>
                </svg>
                重试发送
            </button>
        `;
    contentEl.appendChild(actions);
  }

  /**
   * 移除重试按钮
   * @param {HTMLElement} messageDiv
   */
  clearRetryAction(messageDiv) {
    if (!messageDiv) return;
    const contentEl = messageDiv.querySelector('.message-content');
    if (!contentEl) return;
    const existing = contentEl.querySelector('.message-actions.retry-actions');
    if (existing) {
      existing.remove();
    }
  }

  /**
   * 重试上一次失败的发送
   */
  async retryLastSend() {
    const record = this.lastFailedSend;
    if (!record || !record.chatId) {
      if (window.toast?.warning) {
        window.toast.warning('没有可重试的消息', 3000);
      }
      return;
    }
    if (String(state.currentChat) !== String(record.chatId)) {
      if (window.toast?.warning) {
        window.toast.warning('当前对话已切换，无法重试该消息', 4000);
      }
      return;
    }
    if (this.isCurrentChatBusy()) {
      if (window.toast?.info) {
        window.toast.info('当前对话正在处理中，请稍后重试', 3000);
      }
      return;
    }

    const lastUserMsg = [...state.messages].reverse().find(m => m.role === 'user');
    if (record.message && lastUserMsg?.content && record.message !== lastUserMsg.content) {
      if (window.toast?.warning) {
        window.toast.warning('对话内容已更新，无法重试旧消息', 4000);
      }
      return;
    }

    if (window.toast?.info) {
      window.toast.info('正在重试发送...', 2000);
    }
    await this.requestAIResponse(record.chatId, {
      originalMessage: record.message,
      messagesSnapshot: record.messagesSnapshot,
      userMessageEl: record.userMessageEl,
      autoRetry: false,
      attempt: 1
    });
  }

  /**
   * 添加消息到界面
   * @param {string} role - 角色（user/assistant）
   * @param {string} content - 消息内容
   * @param {Array} quickReplies - 快捷回复选项
   * @param {boolean} showButtons - 是否显示按钮
   * @param {boolean} skipTyping - 是否跳过打字机效果
   * @param {boolean} skipStatePush - 是否跳过添加到state
   * @returns {HTMLElement} 创建的消息元素
   */
  addMessage(
    role,
    content,
    quickReplies = null,
    showButtons = false,
    skipTyping = false,
    skipStatePush = false
  ) {
    const messageList = document.getElementById('messageList');
    const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatar = role === 'user' ? '👤' : '🤖';
    const roleName = role === 'user' ? '你' : 'ThinkCraft';

    let html = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-role">${roleName}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text" id="msg-${Date.now()}"></div>
        `;

    if (quickReplies && quickReplies.length > 0) {
      html += `<div class="quick-replies">`;
      quickReplies.forEach(reply => {
        html += `<button class="quick-reply-btn" onclick="quickReply('${reply}')">${reply}</button>`;
      });
      html += `</div>`;
    }

    if (showButtons) {
      html += `
                <div class="message-actions">
                    <button class="view-report-btn" onclick="viewReport()">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        查看完整报告
                    </button>
                </div>
            `;
    }

    html += `</div>`;
    messageDiv.innerHTML = html;
    messageList.appendChild(messageDiv);

    const textElement = messageDiv.querySelector('.message-text');

    if (role === 'assistant' && !skipTyping) {
      typeWriter(textElement, content, 30, state.currentChat);
    } else {
      // 处理 [ANALYSIS_COMPLETE] 标记
      let displayContent = content;
      let hasAnalysisMarker = false;

      if (content.includes('[ANALYSIS_COMPLETE]')) {
        hasAnalysisMarker = true;
        displayContent = content.replace(/\n?\[ANALYSIS_COMPLETE\]\n?/g, '').trim();
      } else if (role === 'assistant' && detectAnalysisReportLikeContent(content)) {
        // 兼容旧数据：历史消息可能没有标记，但内容像完整报告
        hasAnalysisMarker = true;
      } else if (role === 'assistant' && isReportCompletionHint(content)) {
        // 兼容：仅有“报告生成完毕/查看完整报告”提示语
        hasAnalysisMarker = true;
      }

      textElement.textContent = displayContent;
      if (window.markdownRenderer && role === 'assistant') {
        const renderedHTML = window.markdownRenderer.render(displayContent);
        textElement.innerHTML = renderedHTML;
        textElement.classList.add('markdown-content');
      }

      // 如果有分析完成标记且是加载历史对话，验证报告状态后显示按钮
      if (hasAnalysisMarker && skipTyping) {
        // 异步验证报告状态
        if (window.reportStatusManager) {
          window.reportStatusManager
            .shouldShowReportButton(state.currentChat, 'analysis')
            .then(buttonState => {
              if (buttonState.shouldShow) {
                const actionElement = document.createElement('div');
                actionElement.className = 'message-actions';
                actionElement.style.display = 'flex';
                actionElement.innerHTML = `
                                <button class="view-report-btn ${buttonState.buttonState}"
                                        onclick="viewReport()"
                                        data-state="${buttonState.buttonState}">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                    ${buttonState.buttonText}
                                </button>
                            `;
                messageDiv.querySelector('.message-content').appendChild(actionElement);
              } else if (hasAnalysisMarker) {
                // 兼容：报告数据缺失但有完成标记，仍显示按钮
                const actionElement = document.createElement('div');
                actionElement.className = 'message-actions';
                actionElement.style.display = 'flex';
                actionElement.innerHTML = `
                                <button class="view-report-btn" onclick="viewReport()">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                    查看完整报告
                                </button>
                            `;
                messageDiv.querySelector('.message-content').appendChild(actionElement);
              }
            })
            .catch(error => {
              console.error('[MessageHandler] 验证报告状态失败:', error);
              // 回退：显示默认按钮
              const actionElement = document.createElement('div');
              actionElement.className = 'message-actions';
              actionElement.style.display = 'flex';
              actionElement.innerHTML = `
                            <button class="view-report-btn" onclick="viewReport()">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                查看完整报告
                            </button>
                        `;
              messageDiv.querySelector('.message-content').appendChild(actionElement);
            });
        } else {
          // 回退：reportStatusManager 未初始化，显示默认按钮
          console.warn('[MessageHandler] reportStatusManager 未初始化，使用默认按钮');
          const actionElement = document.createElement('div');
          actionElement.className = 'message-actions';
          actionElement.style.display = 'flex';
          actionElement.innerHTML = `
                        <button class="view-report-btn" onclick="viewReport()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            查看完整报告
                        </button>
                    `;
          messageDiv.querySelector('.message-content').appendChild(actionElement);
        }

        // 设置状态标志
        state.analysisCompleted = true;
        if (window.stateManager?.setAnalysisCompleted) {
          window.stateManager.setAnalysisCompleted(state.currentChat, true);
        }
      }
    }

    scrollToBottom();

    // 只在非跳过模式下才添加到state
    if (!skipStatePush) {
      state.messages.push({ role, content, time });
    }

    // 返回创建的DOM元素，供调用者使用
    return messageDiv;
  }

  /**
   * 快捷回复
   * @param {string} text - 回复文本
   */
  quickReply(text) {
    document.getElementById('mainInput').value = text;
    if (window.stateManager?.setInputDraft) {
      window.stateManager.setInputDraft(window.state?.currentChat, text);
    }
    this.sendMessage();
  }

  /**
   * 检查当前对话是否忙碌
   * @returns {boolean}
   */
  isCurrentChatBusy() {
    const currentChatId = state.currentChat;
    const isTyping = currentChatId !== null && state.typingChatId === currentChatId;
    const isLoading = currentChatId !== null && state.pendingChatIds.has(currentChatId);
    return isTyping || isLoading;
  }
}

// 创建全局实例
window.messageHandler = new MessageHandler();

// 暴露全局函数（向后兼容）
function sendMessage() {
  window.messageHandler.sendMessage();
}

function addMessage(
  role,
  content,
  quickReplies = null,
  showButtons = false,
  skipTyping = false,
  skipStatePush = false
) {
  return window.messageHandler.addMessage(
    role,
    content,
    quickReplies,
    showButtons,
    skipTyping,
    skipStatePush
  );
}

function handleAPIResponse(content) {
  window.messageHandler.handleAPIResponse(content);
}

function quickReply(text) {
  window.messageHandler.quickReply(text);
}

function isCurrentChatBusy() {
  return window.messageHandler.isCurrentChatBusy();
}

function retryLastSend() {
  window.messageHandler.retryLastSend();
}

// 暴露到window对象
window.sendMessage = sendMessage;
window.addMessage = addMessage;
window.handleAPIResponse = handleAPIResponse;
window.quickReply = quickReply;
window.isCurrentChatBusy = isCurrentChatBusy;
