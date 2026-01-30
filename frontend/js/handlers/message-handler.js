/**
 * 消息处理模块
 * 处理用户消息发送、AI回复显示、打字机效果等
 */

import { appState } from '../core/app-state.js';
import { scrollToBottom, forceScrollToBottom } from '../utils/helpers.js';

/**
 * 发送消息到AI
 */
export async function sendMessage() {
    const desktopInput = document.getElementById('mainInput');
    const mobileInput = document.getElementById('mobileTextInput');
    const input = mobileInput && mobileInput.offsetParent !== null ? mobileInput : desktopInput;
    const message = input.value.trim();

    const currentChatId = appState.currentChat;
    const isCurrentChatTyping = currentChatId !== null && appState.typingChatId === currentChatId;
    const isCurrentChatLoading = currentChatId !== null && appState.pendingChatIds.has(currentChatId);
    if (!message || isCurrentChatTyping || isCurrentChatLoading) return;

    let chatId = appState.currentChat;
    if (appState.settings.saveHistory && chatId === null) {
        const base = Date.now();
        const suffix = Math.floor(Math.random() * 1000);
        chatId = base * 1000 + suffix;
        appState.currentChat = chatId;
        appState.chats.unshift({
            id: chatId,
            title: '新对话',
            messages: [],
            userData: {...appState.userData},
            conversationStep: 0,
            analysisCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        localStorage.setItem('thinkcraft_chats', JSON.stringify(appState.chats));
        if (window.loadChats) {
            window.loadChats();
        }
    }

    if (appState.messages.length === 0) {
        appState.analysisCompleted = false;
    }

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('messageList').style.display = 'block';

    addMessage('user', message, null, false, false, true);
    input.value = '';
    input.style.height = 'auto';

    if (input === mobileInput) {
        setTimeout(() => window.switchToVoiceMode && window.switchToVoiceMode(), 200);
    }

    appState.messages.push({ role: 'user', content: message });
    appState.conversationStep++;

    if (appState.settings.saveHistory && chatId !== null) {
        const index = appState.chats.findIndex(c => c.id == chatId);
        if (index !== -1) {
            appState.chats[index] = {
                ...appState.chats[index],
                messages: [...appState.messages],
                userData: {...appState.userData},
                conversationStep: appState.conversationStep,
                analysisCompleted: appState.analysisCompleted,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('thinkcraft_chats', JSON.stringify(appState.chats));
        }
    }

    if (chatId !== null) {
        appState.pendingChatIds.add(chatId);
    }
    appState.isLoading = appState.pendingChatIds.size > 0;

    try {
        const response = await fetch(`${appState.settings.apiUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: appState.messages.map(m => ({ role: m.role, content: m.content }))
            })
        });

        if (!response.ok) throw new Error(`API错误: ${response.status}`);

        const data = await response.json();
        if (data.code !== 0) throw new Error(data.error || '未知错误');

        const aiContent = data.data.content;
        if (appState.settings.saveHistory && chatId !== null) {
            const index = appState.chats.findIndex(c => c.id == chatId);
            if (index !== -1) {
                const chatMessages = Array.isArray(appState.chats[index].messages)
                    ? [...appState.chats[index].messages]
                    : [];
                chatMessages.push({ role: 'assistant', content: aiContent });
                appState.chats[index] = {
                    ...appState.chats[index],
                    messages: chatMessages,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('thinkcraft_chats', JSON.stringify(appState.chats));
            }
        }

        if (appState.currentChat == chatId) {
            appState.messages.push({ role: 'assistant', content: aiContent });
            appState.conversationStep++;
            handleAPIResponse(aiContent);
        }

        if (appState.settings.saveHistory && appState.currentChat == chatId) {
            window.saveCurrentChat && window.saveCurrentChat();
        }

    } catch (error) {
        const errorMsg = `抱歉，出现了错误：${error.message}\n\n请检查：\n1. 后端服务是否已启动（npm start）\n2. .env文件中的DEEPSEEK_API_KEY是否配置正确\n3. 网络连接是否正常`;
        if (appState.settings.saveHistory && chatId !== null) {
            const index = appState.chats.findIndex(c => c.id == chatId);
            if (index !== -1) {
                const chatMessages = Array.isArray(appState.chats[index].messages)
                    ? [...appState.chats[index].messages]
                    : [];
                chatMessages.push({ role: 'assistant', content: errorMsg });
                appState.chats[index] = {
                    ...appState.chats[index],
                    messages: chatMessages,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('thinkcraft_chats', JSON.stringify(appState.chats));
            }
        }
        if (appState.currentChat == chatId) {
            addMessage('assistant', errorMsg, null, false, false, true);
            appState.messages.push({ role: 'assistant', content: errorMsg });
            appState.conversationStep++;
        }

        if (appState.settings.saveHistory && appState.currentChat == chatId) {
            window.saveCurrentChat && window.saveCurrentChat();
        }
    } finally {
        if (chatId !== null) {
            appState.pendingChatIds.delete(chatId);
        }
        appState.isLoading = appState.pendingChatIds.size > 0;
    }
}

/**
 * 处理API响应，显示AI消息
 */
export function handleAPIResponse(content) {
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

    typeWriterWithCompletion(textElement, actionElement, content, 30, appState.currentChat);
    scrollToBottom();
}

/**
 * 添加消息到聊天界面
 */
export function addMessage(role, content, quickReplies = null, showButtons = false, skipTyping = false, skipStatePush = false) {
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
    `;

    if (role === 'assistant' && !showButtons && !skipTyping) {
        html += `<div class="message-text" id="typing-${Date.now()}"></div>`;
        messageDiv.innerHTML = html + '</div>';
        messageList.appendChild(messageDiv);

        const textElement = messageDiv.querySelector('.message-text');
        typeWriter(textElement, content, 30, appState.currentChat);
    } else {
        html += `<div class="message-text"></div>`;
    }

    if (quickReplies) {
        html += '<div class="message-actions">';
        quickReplies.forEach(reply => {
            html += `<button class="action-chip" onclick="window.quickReply('${reply}')">${reply}</button>`;
        });
        html += '</div>';
    }

    if (showButtons) {
        html += `
            <div class="report-buttons">
                <button class="view-report-btn" onclick="window.viewReport()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    查看完整报告
                </button>
                ${(window.canShareReport && window.canShareReport()) ? `
                <button class="share-btn" onclick="window.showShareCard()">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                    </svg>
                    创意分享
                </button>
                ` : ''}
            </div>
        `;
    }

    html += '</div>';

    if (role === 'user' || showButtons || skipTyping) {
        messageDiv.innerHTML = html;
        messageList.appendChild(messageDiv);
    }

    if ((showButtons || skipTyping) && role === 'assistant') {
        const textElement = messageDiv.querySelector('.message-text');
        if (textElement) {
            if (window.markdownRenderer) {
                textElement.innerHTML = window.markdownRenderer.render(content);
                textElement.classList.add('markdown-content');
            } else {
                textElement.textContent = content;
            }
        }
    } else if (role === 'user') {
        const textElement = messageDiv.querySelector('.message-text');
        if (textElement) textElement.textContent = content;
    }

    // 用户发送消息时强制滚动到底部
    if (role === 'user') {
        forceScrollToBottom();
    } else {
        scrollToBottom();
    }

    if (!skipStatePush) {
        appState.messages.push({ role, content, time });
    }

    return messageDiv;
}

/**
 * 打字机效果（支持Markdown渲染）
 */
export function typeWriter(element, text, speed = 30, chatId = null) {
    const targetChatId = chatId ?? appState.currentChat;
    appState.typingChatId = targetChatId;
    appState.isTyping = true;
    let i = 0;

    // 记录用户是否主动向上滚动
    let userScrolledUp = false;
    const container = document.getElementById('chatContainer');

    // 监听用户滚动行为
    const handleUserScroll = () => {
        if (!container) return;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        userScrolledUp = !isNearBottom;
    };

    container?.addEventListener('scroll', handleUserScroll);

    const timer = setInterval(() => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            // 只有当用户没有主动向上滚动时才自动滚动
            if (!userScrolledUp) {
                scrollToBottom();
            }
        } else {
            clearInterval(timer);
            container?.removeEventListener('scroll', handleUserScroll);

            if (appState.typingChatId === targetChatId) {
                appState.isTyping = false;
                appState.typingChatId = null;
            }

            // 打字机效果完成后，渲染Markdown
            if (window.markdownRenderer) {
                const renderedHTML = window.markdownRenderer.render(text);
                element.innerHTML = renderedHTML;
                element.classList.add('markdown-content');
            }
        }
    }, speed);
}

/**
 * 带完成检测的打字机效果（支持Markdown渲染）
 */
export function typeWriterWithCompletion(textElement, actionElement, text, speed = 30, chatId = null) {
    const targetChatId = chatId ?? appState.currentChat;
    appState.typingChatId = targetChatId;
    appState.isTyping = true;
    let i = 0;

    let displayText = text;
    let hasAnalysisMarker = false;

    if (text.includes('[ANALYSIS_COMPLETE]')) {
        hasAnalysisMarker = true;
        displayText = text.replace(/\n?\[ANALYSIS_COMPLETE\]\n?/g, '').trim();
    }

    // 记录用户是否主动向上滚动
    let userScrolledUp = false;
    const container = document.getElementById('chatContainer');

    // 监听用户滚动行为
    const handleUserScroll = () => {
        if (!container) return;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        userScrolledUp = !isNearBottom;
    };

    container?.addEventListener('scroll', handleUserScroll);

    const timer = setInterval(() => {
        if (i < displayText.length) {
            textElement.textContent += displayText.charAt(i);
            i++;
            // 只有当用户没有主动向上滚动时才自动滚动
            if (!userScrolledUp) {
                scrollToBottom();
            }
        } else {
            clearInterval(timer);
            container?.removeEventListener('scroll', handleUserScroll);

            if (appState.typingChatId === targetChatId) {
                appState.isTyping = false;
                appState.typingChatId = null;
            }

            // 打字机效果完成后，渲染Markdown
            if (window.markdownRenderer) {
                const renderedHTML = window.markdownRenderer.render(displayText);
                textElement.innerHTML = renderedHTML;
                textElement.classList.add('markdown-content');
            }

            if (hasAnalysisMarker && !appState.analysisCompleted) {
                appState.analysisCompleted = true;
                actionElement.style.display = 'flex';
                actionElement.innerHTML = `
                    <button class="view-report-btn" onclick="window.viewReport()">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        查看完整报告
                    </button>
                    <!-- 创意分享按钮已隐藏 -->
                    <!--
                    <button class="share-btn" onclick="window.showShareCard()">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                        </svg>
                        创意分享
                    </button>
                    -->
                `;
            }
        }
    }, speed);
}

/**
 * 快速回复
 */
export function quickReply(text) {
    const input = document.getElementById('mainInput');
    if (input) {
        input.value = text;
        sendMessage();
    }
}
