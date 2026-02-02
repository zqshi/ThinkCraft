/**
 * 消息处理模块
 * 负责发送消息、接收AI回复、显示消息等核心聊天功能
 */

/* eslint-disable no-unused-vars, no-undef */

class MessageHandler {
    constructor() {
        // 依赖注入
        this.state = window.state;
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

        let chatId = state.currentChat;
        if (state.settings.saveHistory && chatId === null) {
            chatId = generateChatId();
            state.currentChat = chatId;
            const newChat = {
                id: chatId,
                title: '新对话',
                messages: [],
                userData: {...state.userData},
                conversationStep: 0,
                analysisCompleted: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            state.chats.unshift(newChat);
            localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
            if (window.storageManager) {
                await window.storageManager.saveChat(newChat);
            }
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
        this.addMessage('user', message, null, false, false, true);
        input.value = '';
        input.style.height = 'auto';

        // 移动端：不自动切换输入模式，保持用户选择的模式
        // 用户可以通过点击按钮手动切换

        // 将消息添加到state.messages
        state.messages.push({
            role: 'user',
            content: message
        });

        // ⭐ 递增对话步骤
        state.conversationStep++;

        if (state.settings.saveHistory && chatId !== null) {
            const index = state.chats.findIndex(c => c.id == chatId);
            if (index !== -1) {
                state.chats[index] = {
                    ...state.chats[index],
                    messages: [...state.messages],
                    userData: {...state.userData},
                    conversationStep: state.conversationStep,
                    analysisCompleted: state.analysisCompleted,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
                if (window.storageManager) {
                    await window.storageManager.saveChat(state.chats[index]);
                }
            }
        }

        // 设置加载状态
        if (chatId !== null) {
            state.pendingChatIds.add(chatId);
        }
        state.isLoading = state.pendingChatIds.size > 0;

        try {
            // 调用后端API
            const response = await fetch(`${state.settings.apiUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: state.messages.map(m => ({
                        role: m.role,
                        content: m.content
                    }))
                })
            });

            if (!response.ok) {
                throw new Error(`API错误: ${response.status}`);
            }

            const data = await response.json();

            if (data.code !== 0) {
                throw new Error(data.error || '未知错误');
            }

            const aiContent = data.data.content || data.data.message;

            if (!aiContent) {
                throw new Error('AI返回的内容为空');
            }

            if (state.settings.saveHistory && chatId !== null) {
                const index = state.chats.findIndex(c => c.id == chatId);
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
                    localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
                    if (window.storageManager) {
                        await window.storageManager.saveChat(state.chats[index]);
                    }
                }
            }

            if (state.currentChat == chatId) {
                // 将AI回复添加到当前对话
                state.messages.push({
                    role: 'assistant',
                    content: aiContent
                });

                // ⭐ AI回复后再次递增
                state.conversationStep++;

                // 显示AI回复（带打字机效果）
                this.handleAPIResponse(aiContent);
            }

            // AI回复后更新对话
            if (state.settings.saveHistory && state.currentChat == chatId && typeof saveCurrentChat === 'function') {
                await saveCurrentChat();
            }

        } catch (error) {
            const errorMsg = `抱歉，出现了错误：${error.message}\n\n请检查：\n1. 后端服务是否已启动（npm start）\n2. .env文件中的DEEPSEEK_API_KEY是否配置正确\n3. 网络连接是否正常`;
            if (state.settings.saveHistory && chatId !== null) {
                const index = state.chats.findIndex(c => c.id == chatId);
                if (index !== -1) {
                    const chatMessages = Array.isArray(state.chats[index].messages)
                        ? [...state.chats[index].messages]
                        : [];
                    chatMessages.push({ role: 'assistant', content: errorMsg });
                    const updatedChat = {
                        ...state.chats[index],
                        messages: chatMessages,
                        updatedAt: new Date().toISOString()
                    };
                    state.chats[index] = updatedChat;
                    // 保存到 IndexedDB
                    if (window.storageManager) {
                        await window.storageManager.saveChat(updatedChat);
                    }
                }
            }
            if (state.currentChat == chatId) {
                this.addMessage('assistant', errorMsg, null, false, false, true);  // skipStatePush=true，避免重复
                // 手动添加错误消息到state
                state.messages.push({
                    role: 'assistant',
                    content: errorMsg
                });

                // ⭐ 错误消息也算一步
                state.conversationStep++;
            }

            // 即使出错也保存对话
            if (state.settings.saveHistory && state.currentChat == chatId && typeof saveCurrentChat === 'function') {
                await saveCurrentChat();
            }
        } finally {
            if (chatId !== null) {
                state.pendingChatIds.delete(chatId);
            }
            state.isLoading = state.pendingChatIds.size > 0;
        }
    }

    /**
     * 处理API响应（显示AI回复）
     * @param {string} content - AI回复内容
     */
    handleAPIResponse(content) {
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
        typeWriterWithCompletion(textElement, actionElement, content, 30, state.currentChat);

        scrollToBottom();
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
    addMessage(role, content, quickReplies = null, showButtons = false, skipTyping = false, skipStatePush = false) {
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
                    window.reportStatusManager.shouldShowReportButton(
                        state.currentChat,
                        'analysis'
                    ).then(buttonState => {
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
                        }
                    }).catch(error => {
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

function addMessage(role, content, quickReplies = null, showButtons = false, skipTyping = false, skipStatePush = false) {
    return window.messageHandler.addMessage(role, content, quickReplies, showButtons, skipTyping, skipStatePush);
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

// 暴露到window对象
window.sendMessage = sendMessage;
window.addMessage = addMessage;
window.handleAPIResponse = handleAPIResponse;
window.quickReply = quickReply;
window.isCurrentChatBusy = isCurrentChatBusy;
