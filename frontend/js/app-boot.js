// ⭐ 页面关闭/刷新前自动保存当前对话
        window.addEventListener('beforeunload', (e) => {
            if (state.messages.length > 0 && state.settings.saveHistory) {
                saveCurrentChat();
                }
        });

        function autoResize(textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }

        // ==================== 长按空格键语音输入 ====================
        let spaceHoldTimer = null;
        let spaceHoldTriggered = false;
        let isComposing = false;  // 输入法组合状态

        function handleKeyDown(e) {
            // Enter键发送消息（但不在输入法组合状态中）
            if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                e.preventDefault();
                sendMessage();
                return;
            }

            // 长按空格键触发语音输入（类似微信）
            if (e.code === 'Space' && !e.repeat && e.target.id === 'mainInput') {
                spaceHoldTriggered = false;
                spaceHoldTimer = setTimeout(() => {
                    spaceHoldTriggered = true;
                    e.preventDefault();
                    handleVoice();  // 启动语音输入
                    if (navigator.vibrate) navigator.vibrate(50);  // 震动反馈
                    }, 300);  // 300ms触发
            }
        }

        function handleCompositionStart(e) {
            isComposing = true;
        }

        function handleCompositionEnd(e) {
            isComposing = false;
        }

        function handleKeyUp(e) {
            // 清除长按计时器
            if (e.code === 'Space') {
                clearTimeout(spaceHoldTimer);
                // 如果已触发语音，阻止空格输入
                if (spaceHoldTriggered) {
                    e.preventDefault();
                    spaceHoldTriggered = false;
                }
            }
        }

        function quickStart(type) {
            const prompts = {
                '创业想法': '我有一个创业想法，想验证一下可行性',
                '产品功能': '我在思考一个产品功能，需要分析一下',
                '解决方案': '我遇到了一个问题，想找到最佳解决方案',
                '职业发展': '我在考虑职业发展方向，需要规划一下'
            };
            document.getElementById('mainInput').value = prompts[type];
            sendMessage();
        }

        function isCurrentChatBusy() {
            const currentChatId = state.currentChat;
            const isTyping = currentChatId !== null && state.typingChatId === currentChatId;
            const isLoading = currentChatId !== null && state.pendingChatIds.has(currentChatId);
            return isTyping || isLoading;
        }

        function canShareReport() {
            return Boolean(window.lastGeneratedReport && window.lastGeneratedReport.chapters);
        }

        function updateShareLinkButtonVisibility() {
            const btn = document.getElementById('shareLinkBtn');
            if (!btn) return;
            btn.style.display = canShareReport() ? 'inline-flex' : 'none';
        }

        function getDefaultIconSvg(size = 48, className = 'empty-icon') {
            return `
                <svg class="${className}" width="${size}" height="${size}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
            `;
        }

        function buildIconSvg(paths, size, className) {
            return `
                <svg class="${className}" width="${size}" height="${size}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    ${paths.map(d => `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${d}"/>`).join('')}
                </svg>
            `;
        }

        function resolveAgentIconKey(key) {
            const value = String(key || '');
            if (/市场|📊/.test(value)) return 'chart';
            if (/技术|架构|工程|⚙️|👨‍💻|👩‍💻/.test(value)) return 'cog';
            if (/增长|营销|📈/.test(value)) return 'trend';
            if (/组织|团队|👥/.test(value)) return 'users';
            if (/财务|资金|💰|💵/.test(value)) return 'dollar';
            if (/风险|⚠️/.test(value)) return 'shield';
            if (/产品|创意|💡/.test(value)) return 'lightbulb';
            if (/项目|📋/.test(value)) return 'clipboard';
            if (/文档|📎/.test(value)) return 'document';
            if (/竞争|⚔️/.test(value)) return 'shield';
            if (/综合|🤖/.test(value)) return 'default';
            return 'default';
        }

        function getAgentIconSvg(key, size = 28, className = 'agent-avatar-icon') {
            const iconKey = resolveAgentIconKey(key);
            const icons = {
                default: [
                    'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                ],
                lightbulb: [
                    'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
                ],
                chart: [
                    'M3 3v18h18',
                    'M8 17V9',
                    'M12 17V5',
                    'M16 17v-7'
                ],
                cog: [
                    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
                    'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                ],
                trend: [
                    'M3 17l6-6 4 4 7-7',
                    'M14 7h7v7'
                ],
                users: [
                    'M16 7a4 4 0 11-8 0 4 4 0 018 0z',
                    'M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                ],
                dollar: [
                    'M12 8c-2.761 0-5 1.343-5 3s2.239 3 5 3 5 1.343 5 3-2.239 3-5 3m0-12V6m0 12v2'
                ],
                shield: [
                    'M12 3l7 4v5c0 5-3.5 9.5-7 11-3.5-1.5-7-6-7-11V7l7-4z'
                ],
                clipboard: [
                    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                ],
                document: [
                    'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                ]
            };

            return buildIconSvg(icons[iconKey] || icons.default, size, className);
        }

        async function sendMessage() {
            // 兼容桌面端和移动端输入框
            const desktopInput = document.getElementById('mainInput');
            const mobileInput = document.getElementById('mobileTextInput');
            const input = mobileInput && mobileInput.offsetParent !== null ? mobileInput : desktopInput;
            const message = input.value.trim();

            if (!message || isCurrentChatBusy()) return;

            let chatId = state.currentChat;
            if (state.settings.saveHistory && chatId === null) {
                chatId = generateChatId();
                state.currentChat = chatId;
                state.chats.unshift({
                    id: chatId,
                    title: '新对话',
                    messages: [],
                    userData: {...state.userData},
                    conversationStep: 0,
                    analysisCompleted: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
                loadChats();
            }

            // 首次对话时重置分析状态
            if (state.messages.length === 0) {
                state.analysisCompleted = false;
            }

            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('messageList').style.display = 'block';

            state.autoScrollEnabled = true;

            // 添加用户消息（skipStatePush=true，因为下面会手动push）
            addMessage('user', message, null, false, false, true);
            input.value = '';
            input.style.height = 'auto';

            // 移动端文本模式发送后自动切回语音模式
            if (input === mobileInput) {
                setTimeout(() => switchToVoiceMode(), 200);
            }

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
                }
            }

            // 设置加载状态
            if (chatId !== null) {
                state.pendingChatIds.add(chatId);
            }
            state.isLoading = state.pendingChatIds.size > 0;

            try {
                if (typeof window.loadSystemPrompts === 'function') {
                    await window.loadSystemPrompts();
                }
                const resolvedSystemPrompt =
                    window.SYSTEM_PROMPTS && window.DEFAULT_PROMPT
                        ? window.SYSTEM_PROMPTS[window.DEFAULT_PROMPT]
                        : undefined;
                if (resolvedSystemPrompt) {
                    console.log('[Chat] systemPrompt preview:', resolvedSystemPrompt.slice(0, 80));
                } else {
                    console.warn('[Chat] systemPrompt missing, using model default');
                }

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
                        })),
                        systemPrompt: resolvedSystemPrompt
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
                    handleAPIResponse(aiContent);
                }

                // AI回复后更新对话
                if (state.settings.saveHistory && state.currentChat == chatId) {
                    saveCurrentChat();
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
                        state.chats[index] = {
                            ...state.chats[index],
                            messages: chatMessages,
                            updatedAt: new Date().toISOString()
                        };
                        localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
                    }
                }
                if (state.currentChat == chatId) {
                    addMessage('assistant', errorMsg, null, false, false, true);  // skipStatePush=true，避免重复
                    // 手动添加错误消息到state
                    state.messages.push({
                        role: 'assistant',
                        content: errorMsg
                    });

                    // ⭐ 错误消息也算一步
                    state.conversationStep++;
                }

                // 即使出错也保存对话
                if (state.settings.saveHistory && state.currentChat == chatId) {
                    saveCurrentChat();
                }
            } finally {
                if (chatId !== null) {
                    state.pendingChatIds.delete(chatId);
                }
                state.isLoading = state.pendingChatIds.size > 0;
            }
        }

        function handleAPIResponse(content) {
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

            // 使用新的打字函数
            typeWriterWithCompletion(textElement, actionElement, content, 30, state.currentChat);

            scrollToBottom();
        }

        function addMessage(role, content, quickReplies = null, showButtons = false, skipTyping = false, skipStatePush = false) {
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

            // 历史对话直接显示，不使用打字机效果
            if (role === 'assistant' && !showButtons && !skipTyping) {
                html += `<div class="message-text" id="typing-${Date.now()}"></div>`;
                messageDiv.innerHTML = html + '</div>';
                messageList.appendChild(messageDiv);

                const textElement = messageDiv.querySelector('.message-text');
                typeWriter(textElement, content, 30, state.currentChat);
            } else {
                html += `<div class="message-text"></div>`;
            }

            if (quickReplies) {
                html += '<div class="message-actions">';
                quickReplies.forEach(reply => {
                    html += `<button class="action-chip" onclick="quickReply('${reply}')">${reply}</button>`;
                });
                html += '</div>';
            }

            if (showButtons) {
                html += `
                    <div class="report-buttons">
                        <button class="view-report-btn" onclick="viewReport()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            查看完整报告
                        </button>
                        ${canShareReport() ? `
                        <button class="share-btn" onclick="showShareCard()">
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

            scrollToBottom();

            // 只在非跳过模式下才添加到state
            if (!skipStatePush) {
                state.messages.push({ role, content, time });
            }

            // 返回创建的DOM元素，供调用者使用
            return messageDiv;
        }

        function typeWriter(element, text, speed = 30, chatId = null) {
            const targetChatId = chatId ?? state.currentChat;
            state.typingChatId = targetChatId;
            state.isTyping = true;
            let i = 0;
            const timer = setInterval(() => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    scrollToBottom();
                } else {
                    clearInterval(timer);
                    if (state.typingChatId === targetChatId) {
                        state.isTyping = false;
                        state.typingChatId = null;
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

        function typeWriterWithCompletion(textElement, actionElement, text, speed = 30, chatId = null) {
            const targetChatId = chatId ?? state.currentChat;
            state.typingChatId = targetChatId;
            state.isTyping = true;
            let i = 0;

            // 防御性检查：确保 text 不是 undefined 或 null
            if (!text || typeof text !== 'string') {
                console.error('[typeWriterWithCompletion] Invalid text:', text);
                textElement.textContent = '错误：收到无效的消息内容';
                state.isTyping = false;
                state.typingChatId = null;
                return;
            }

            // 检测并移除标记
            let displayText = text;
            let hasAnalysisMarker = false;

            if (text.includes('[ANALYSIS_COMPLETE]')) {
                hasAnalysisMarker = true;
                displayText = text.replace(/\n?\[ANALYSIS_COMPLETE\]\n?/g, '').trim();
            }

            const timer = setInterval(() => {
                if (i < displayText.length) {
                    textElement.textContent += displayText.charAt(i);
                    i++;
                    scrollToBottom();
                } else {
                    clearInterval(timer);
                    if (state.typingChatId === targetChatId) {
                        state.isTyping = false;
                        state.typingChatId = null;
                    }

                    // 打字机效果完成后，渲染Markdown
                    if (window.markdownRenderer) {
                        const renderedHTML = window.markdownRenderer.render(displayText);
                        textElement.innerHTML = renderedHTML;
                        textElement.classList.add('markdown-content');
                    }

                    // 打字完成后：首次检测到标记时显示按钮
                    if (hasAnalysisMarker && !state.analysisCompleted) {
                        state.analysisCompleted = true;

                        actionElement.style.display = 'flex';
                        actionElement.innerHTML = `
                            <button class="view-report-btn" onclick="viewReport()">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                查看完整报告
                            </button>
                            <!-- 创意分享按钮已隐藏 -->
                        `;
                    }
                }
            }, speed);
        }

        function quickReply(text) {
            document.getElementById('mainInput').value = text;
            sendMessage();
        }

        const AUTO_SCROLL_BOTTOM_THRESHOLD = 2;

        function isNearBottom(container) {
            return (container.scrollHeight - container.scrollTop - container.clientHeight) <= AUTO_SCROLL_BOTTOM_THRESHOLD;
        }

        function initChatAutoScroll() {
            const container = document.getElementById('chatContainer');
            if (!container) return;
            if (typeof state.autoScrollEnabled !== 'boolean') {
                state.autoScrollEnabled = true;
            }
            if (typeof state.autoScrollLocked !== 'boolean') {
                state.autoScrollLocked = false;
            }
            const lockAutoScroll = () => {
                state.autoScrollLocked = true;
                state.autoScrollEnabled = false;
                container.style.scrollBehavior = 'auto';
            };
            let lastScrollTop = container.scrollTop;
            state.autoScrollEnabled = isNearBottom(container);

            container.addEventListener('scroll', () => {
                const currentTop = container.scrollTop;
                const scrolledUp = currentTop < lastScrollTop;

                if (scrolledUp) {
                    lockAutoScroll();
                }
                if (isNearBottom(container)) {
                    state.autoScrollLocked = false;
                    state.autoScrollEnabled = true;
                } else {
                    state.autoScrollEnabled = false;
                }

                lastScrollTop = currentTop;
                container.style.scrollBehavior = state.autoScrollLocked ? 'auto' : 'smooth';
            });

            container.addEventListener('wheel', () => {
                lockAutoScroll();
            }, { passive: true });

            let touchStartY = null;
            container.addEventListener('touchstart', (event) => {
                if (event.touches && event.touches.length) {
                    touchStartY = event.touches[0].clientY;
                }
            }, { passive: true });

            container.addEventListener('touchmove', (event) => {
                if (touchStartY === null || !event.touches || !event.touches.length) return;
                const currentY = event.touches[0].clientY;
                if (currentY - touchStartY > 5) {
                    lockAutoScroll();
                }
            }, { passive: true });

            container.addEventListener('keydown', (event) => {
                if (event.key === 'PageUp' || event.key === 'Home' || event.key === 'ArrowUp') {
                    lockAutoScroll();
                }
            });
        }

        function scrollToBottom(force = false) {
            const container = document.getElementById('chatContainer');
            if (!container) return;
            if (!force && (state.autoScrollLocked || !state.autoScrollEnabled)) return;
            container.scrollTop = container.scrollHeight;
        }

        function focusInput() {
            document.getElementById('mainInput').focus();
        }

        function startNewChat() {
            // ⭐ 静默保存当前对话（无需确认弹窗）
            if (state.messages.length > 0 && state.settings.saveHistory) {
                saveCurrentChat();
            }

            // 重置所有state
            state.currentChat = null;  // 重置为null表示新对话
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
            const menuToggle = document.querySelector('.menu-toggle');

            if (sidebar && menuToggle) {
                // 通过检查菜单按钮是否可见来判断是否为移动端模式
                const isOverlayMode = window.getComputedStyle(menuToggle).display !== 'none';

                if (isOverlayMode && sidebar.classList.contains('active')) {
                    // 移动端模式且侧边栏打开：关闭侧边栏，显示对话窗口
                    sidebar.classList.remove('active');
                    }
            }

            focusInput();

            }

        // 防抖定时器
        let saveDebounceTimer = null;

        // 防抖保存函数（300ms延迟）
        function debouncedSaveCurrentChat() {
            if (saveDebounceTimer) {
                clearTimeout(saveDebounceTimer);
            }
            saveDebounceTimer = setTimeout(() => {
                saveCurrentChat();
            }, 300);
        }

        function generateChatId() {
            const base = Date.now();
            const suffix = Math.floor(Math.random() * 1000);
            return base * 1000 + suffix;
        }

        function saveCurrentChat() {
            if (!state.settings.saveHistory || state.messages.length === 0) return;

            // 从第一条用户消息提取标题
            let title = '新对话';
            const firstUserMsg = state.messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                title = firstUserMsg.content.substring(0, 30);
                if (firstUserMsg.content.length > 30) {
                    title += '...';
                }
            }

            const now = new Date().toISOString();

            // 核心逻辑：区分创建新对话和更新现有对话
            if (state.currentChat === null) {
                // 场景1：创建新对话
                const chatId = generateChatId();
                const chat = {
                    id: chatId,
                    title: title,
                    messages: [...state.messages],
                    userData: {...state.userData},
                    conversationStep: state.conversationStep,
                    analysisCompleted: state.analysisCompleted,
                    createdAt: now,
                    updatedAt: now
                };

                state.currentChat = chatId;  // 设置当前对话ID
                state.chats.unshift(chat);
                } else {
                // 场景2：更新现有对话
                const index = state.chats.findIndex(c => c.id == state.currentChat);
                if (index !== -1) {
                    state.chats[index] = {
                        ...state.chats[index],
                        title: title,
                        messages: [...state.messages],
                        userData: {...state.userData},
                        conversationStep: state.conversationStep,
                        analysisCompleted: state.analysisCompleted,
                        updatedAt: now
                    };
                    } else {
                    // 降级处理：当前对话ID不存在，使用现有ID创建新对话
                    const chat = {
                        id: state.currentChat,
                        title: title,
                        messages: [...state.messages],
                        userData: {...state.userData},
                        conversationStep: state.conversationStep,
                        analysisCompleted: state.analysisCompleted,
                        createdAt: now,
                        updatedAt: now
                    };
                    state.chats.unshift(chat);
                }
            }

            localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
            loadChats();
        }

        function loadChats() {
            const saved = localStorage.getItem('thinkcraft_chats');

            if (!saved || saved === '[]') {
                state.chats = [];
            } else {
                // 加载已保存的数据
                state.chats = JSON.parse(saved);
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
                historyDiv.innerHTML = '<div style="padding: 12px; text-align: center; color: var(--text-tertiary); font-size: 13px;">暂无历史记录</div>';
                return;
            }

            state.chats.forEach(chat => {
                const item = document.createElement('div');
                item.className = 'chat-item' + (chat.isPinned ? ' pinned' : '') + (state.currentChat == chat.id ? ' active' : '');
                item.dataset.chatId = chat.id;

                // 渲染标签 - 已禁用
                // const autoTags = chat.tags?.auto || [];
                // const userTags = chat.tags?.user || [];
                // const tagsHTML = (autoTags.length > 0 || userTags.length > 0) ? `
                //     <div class="chat-item-tags">
                //         ${autoTags.map(tag => `<span class="tag tag-auto">${tag}</span>`).join('')}
                //         ${userTags.map(tag => `<span class="tag tag-user">${tag}</span>`).join('')}
                //     </div>
                // ` : '';
                const tagsHTML = ''; // 不显示标签

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
                        <span class="chat-item-menu-label" data-role="pin-label">${chat.isPinned ? '取消置顶' : '置顶'}</span>
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
                item.addEventListener('click', () => {
                    loadChat(chat.id);
                });
                historyDiv.appendChild(item);
            });
        }

        function portalChatMenu(menu, chatId) {
            menu.dataset.chatId = chatId;
            if (menu.parentElement !== document.body) {
                document.body.appendChild(menu);
            }
        }

        function syncPinMenuLabel(menu, chatId) {
            const chat = state.chats.find(c => c.id == chatId);
            if (!chat) return;
            const label = menu.querySelector('[data-role="pin-label"]');
            if (label) {
                label.textContent = chat.isPinned ? '取消置顶' : '置顶';
            }
        }

        function restoreChatMenu(menu) {
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

        function toggleChatMenu(e, chatId) {
            e.stopPropagation();
            const menu = document.getElementById(`menu-${chatId}`);
            const button = e.currentTarget;
            const chatItem = button.closest('.chat-item');

            // 关闭所有其他菜单，并移除 menu-open 类
            document.querySelectorAll('.chat-item-menu').forEach(m => {
                if (m.id !== `menu-${chatId}`) {
                    m.classList.remove('active');
                    restoreChatMenu(m);
                }
            });
            document.querySelectorAll('.chat-item.menu-open').forEach(item => {
                item.classList.remove('menu-open');
            });

            // 切换当前菜单
            const isOpen = menu.classList.contains('active');
            menu.classList.toggle('active');

            // 如果打开菜单
            if (!isOpen) {
                // 给当前对话项添加 menu-open 类，提升 z-index
                chatItem.classList.add('menu-open');

                portalChatMenu(menu, chatId);
                syncPinMenuLabel(menu, chatId);
                menu.style.position = 'fixed';

                // 双重 requestAnimationFrame 确保菜单完全渲染
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        // 获取按钮位置（相对于视口）
                        const buttonRect = button.getBoundingClientRect();

                        // 显示在按钮下方，贴近更多按钮
                        const menuWidth = menu.offsetWidth || 140;
                        const top = buttonRect.bottom + 6;
                        let left = buttonRect.right - menuWidth;
                        const minLeft = 8;
                        const maxLeft = window.innerWidth - menuWidth - 8;
                        left = Math.min(Math.max(left, minLeft), maxLeft);

                        // 应用位置
                        menu.style.left = `${left}px`;
                        menu.style.top = `${top}px`;
                    });
                });
            } else {
                // 关闭菜单时移除 menu-open 类
                chatItem.classList.remove('menu-open');
                restoreChatMenu(menu);
            }
        }

        function reopenChatMenu(chatId) {
            requestAnimationFrame(() => {
                const button = document.querySelector(`.chat-item[data-chat-id="${chatId}"] .chat-item-more`);
                if (!button) return;
                toggleChatMenu({ stopPropagation() {}, currentTarget: button }, chatId);
            });
        }

        // 辅助函数：关闭指定的聊天菜单
        function closeChatMenu(chatId) {
            const menu = document.getElementById(`menu-${chatId}`);
            if (menu) {
                menu.classList.remove('active');
                restoreChatMenu(menu);
            }
            // 移除所有 menu-open 类
            document.querySelectorAll('.chat-item.menu-open').forEach(item => {
                item.classList.remove('menu-open');
            });
        }

        function renameChat(e, chatId) {
            e.stopPropagation();
            const chat = state.chats.find(c => c.id == chatId);
            if (!chat) return;

            const newTitle = prompt('修改对话标题', chat.title);
            if (newTitle && newTitle.trim()) {
                chat.title = newTitle.trim();
                localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
                loadChats();
                reopenChatMenu(chatId);
            }
        }

        function togglePinChat(e, chatId) {
            e.stopPropagation();
            const chat = state.chats.find(c => c.id == chatId);
            if (!chat) return;

            chat.isPinned = !chat.isPinned;
            localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
            loadChats();
            reopenChatMenu(chatId);
        }

        // 管理标签
        function manageTagsForChat(e, chatId) {
            e.stopPropagation();
            const chat = state.chats.find(c => c.id == chatId);
            if (!chat) return;

            // 确保tags对象存在
            if (!chat.tags) {
                chat.tags = { auto: [], user: [] };
            }

            const currentUserTags = chat.tags.user || [];
            const tagsStr = currentUserTags.join(', ');

            const newTagsStr = prompt(
                '管理用户标签（多个标签用逗号分隔）\n\n' +
                'AI自动标签：' + (chat.tags.auto || []).join(', ') + '\n' +
                '当前用户标签：' + tagsStr,
                tagsStr
            );

            if (newTagsStr !== null) {
                // 解析新标签
                const newTags = newTagsStr
                    .split(',')
                    .map(t => t.trim())
                    .filter(t => t.length > 0 && t.length <= 10); // 限制长度

                chat.tags.user = newTags;
                localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));
                loadChats();
                reopenChatMenu(chatId);
            }
        }

        function deleteChat(e, chatId) {
            e.stopPropagation();

            if (!confirm('确定要删除这个对话吗？此操作不可恢复。')) {
                return;
            }

            // 关闭所有浮窗
            document.querySelectorAll('.chat-item-menu').forEach(menu => {
                menu.classList.remove('active');
                restoreChatMenu(menu);
            });
            document.querySelectorAll('.chat-item.menu-open').forEach(item => {
                item.classList.remove('menu-open');
            });

            state.chats = state.chats.filter(c => c.id != chatId);
            localStorage.setItem('thinkcraft_chats', JSON.stringify(state.chats));

            // 如果删除的是当前对话，重置状态
            if (state.currentChat == chatId) {
                state.currentChat = null;
                state.messages = [];
                state.conversationStep = 0;
                state.userData = {};
                document.getElementById('emptyState').style.display = 'flex';
                document.getElementById('messageList').style.display = 'none';
                document.getElementById('messageList').innerHTML = '';
            }

            loadChats();
        }

        // 点击页面其他地方关闭所有菜单
        document.addEventListener('click', () => {
            document.querySelectorAll('.chat-item-menu').forEach(menu => {
                menu.classList.remove('active');
                restoreChatMenu(menu);
            });
            // 移除所有 menu-open 类
            document.querySelectorAll('.chat-item.menu-open').forEach(item => {
                item.classList.remove('menu-open');
            });
        });

        // 滚动和窗口调整大小时关闭所有菜单
        const chatHistory = document.querySelector('.chat-history');
        if (chatHistory) {
            chatHistory.addEventListener('scroll', () => {
                document.querySelectorAll('.chat-item-menu').forEach(menu => {
                    menu.classList.remove('active');
                    restoreChatMenu(menu);
                });
                // 移除所有 menu-open 类
                document.querySelectorAll('.chat-item.menu-open').forEach(item => {
                    item.classList.remove('menu-open');
                });
            });
        }

        window.addEventListener('resize', () => {
            document.querySelectorAll('.chat-item-menu').forEach(menu => {
                menu.classList.remove('active');
                restoreChatMenu(menu);
            });
            // 移除所有 menu-open 类
            document.querySelectorAll('.chat-item.menu-open').forEach(item => {
                item.classList.remove('menu-open');
            });
        });

        function loadChat(id) {
            state.autoScrollEnabled = true;
            state.autoScrollLocked = false;
            state.autoScrollLocked = false;

            // 兼容数字和字符串ID，统一转换比较
            const targetId = typeof id === 'string' && !isNaN(id) ? Number(id) : id;
            const chat = state.chats.find(c => c.id == targetId);  // 使用 == 而非 === 做宽松比较

            if (!chat) {
                console.error('Chat not found:', id);
                return;
            }

            // ⭐ 静默保存当前对话（无需确认弹窗）
            if (state.currentChat && state.currentChat != targetId && state.messages.length > 0) {
                saveCurrentChat();
            }

            // 🔧 确保显示聊天容器，隐藏知识库面板，显示输入框
            const chatContainer = document.getElementById('chatContainer');
            const knowledgePanel = document.getElementById('knowledgePanel');
            const inputContainer = document.getElementById('inputContainer');

            if (chatContainer) chatContainer.style.display = 'flex';
            if (knowledgePanel) knowledgePanel.style.display = 'none';
            if (inputContainer) inputContainer.style.display = 'block'; // 显示输入框

            // 恢复完整state
            const chatMessages = Array.isArray(chat.messages) ? chat.messages : [];
            state.currentChat = chat.id;  // 使用原始ID
            state.messages = [...chatMessages];
            state.userData = chat.userData ? {...chat.userData} : {};
            state.conversationStep = chat.conversationStep || chatMessages.length;
            state.analysisCompleted = chat.analysisCompleted || false;

            document.getElementById('emptyState').style.display = 'none';
            const messageList = document.getElementById('messageList');
            messageList.style.display = 'block';
            messageList.innerHTML = '';

            chatMessages.forEach((msg, index) => {
                const isLastMessage = index === chatMessages.length - 1;
                const shouldShowButton = isLastMessage && msg.role === 'assistant' && chat.analysisCompleted;

                // 移除消息中的[ANALYSIS_COMPLETE]标记
                let content = msg.content;
                if (content.includes('[ANALYSIS_COMPLETE]')) {
                    content = content.replace(/\n?\[ANALYSIS_COMPLETE\]\n?/g, '').trim();
                }

                if (shouldShowButton) {
                    // 最后一条AI消息且已完成分析，显示按钮（skipTyping=true, skipStatePush=true）
                    addMessage(msg.role, content, null, true, true, true);
                } else {
                    // skipTyping=true, skipStatePush=true（因为消息已经在state.messages中）
                    addMessage(msg.role, content, null, false, true, true);
                }
            });

            // 智能检测：如果侧边栏处于覆盖模式（移动端），自动关闭并显示对话内容
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.querySelector('.menu-toggle');

            if (sidebar && menuToggle) {
                // 通过检查菜单按钮是否可见来判断是否为移动端模式
                const isOverlayMode = window.getComputedStyle(menuToggle).display !== 'none';

                if (isOverlayMode && sidebar.classList.contains('active')) {
                    // 移动端模式且侧边栏打开：关闭侧边栏，显示对话内容
                    sidebar.classList.remove('active');
                    }
            }

            // 刷新历史列表以更新激活状态
            loadChats();

            }

        // 查看报告
        function viewReport() {
            const reportModal = document.getElementById('reportModal');
            if (reportModal) {
                reportModal.classList.add('active');
            }

            // 让出主线程，确保弹窗先渲染
            requestAnimationFrame(() => {
                generateDetailedReport().catch(error => {
                    console.error('Failed to generate report:', error);
                    const reportContent = document.getElementById('reportContent');
                    if (reportContent) {
                        reportContent.innerHTML = `
                            <div style="text-align: center; padding: 60px 20px;">
                                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                                <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                                    报告生成失败
                                </div>
                                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                                    ${error.message || '生成报告时发生未知错误'}
                                </div>
                                <button class="btn-primary" onclick="generateDetailedReport()">重试</button>
                            </div>
                        `;
                    }
                });
            });
        }

        // 重新生成创意报告
        async function regenerateInsightsReport() {
            // 确认操作
            if (!confirm('确定要重新生成分析报告吗？\n\n这将使用AI重新分析您的创意对话，可能会生成不同的洞察内容。')) {
                return;
            }

            // 重新生成报告
            await generateDetailedReport();
        }

        // 生成详细报告（AI驱动）
        async function generateDetailedReport() {
            const reportContent = document.getElementById('reportContent');

            // 检查是否有足够的对话历史
            if (state.messages.length < 2) {
                reportContent.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                        <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                            对话内容不足
                        </div>
                        <div style="font-size: 14px; color: var(--text-secondary);">
                            请先与AI进行至少一轮完整的对话，然后再生成分析报告。
                        </div>
                    </div>
                `;
                return;
            }

            // 显示加载状态
            reportContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="margin-bottom: 20px;">${getDefaultIconSvg(48)}</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                        AI正在生成分析报告...
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                        这可能需要10-20秒，请稍候
                    </div>
                    <div class="score-bar" style="max-width: 300px; margin: 0 auto;">
                        <div class="score-track">
                            <div class="score-fill" style="width: 0%; animation: loading 2s infinite;"></div>
                        </div>
                    </div>
                </div>
                <style>
                    @keyframes loading {
                        0% { width: 0%; }
                        50% { width: 70%; }
                        100% { width: 100%; }
                    }
                </style>
            `;

            try {
                const apiBaseUrl = state.settings.apiUrl || window.location.origin;
                const apiClient = window.apiClient || (window.APIClient ? new window.APIClient(apiBaseUrl) : null);
                if (!apiClient) {
                    throw new Error('API 客户端未初始化，请刷新页面重试。');
                }
                if (apiClient.setBaseURL) {
                    apiClient.setBaseURL(apiBaseUrl);
                }
                window.apiClient = apiClient;

                const data = await apiClient.request('/api/report/generate', {
                    method: 'POST',
                    body: {
                        messages: state.messages.map(m => ({
                            role: m.role,
                            content: m.content
                        }))
                    },
                    timeout: 120000,
                    retry: 1
                });

                if (data && data.code !== 0) {
                    throw new Error(data.error || '未知错误');
                }

                const reportData = data?.data?.report;

                // 验证报告数据结构
                if (!reportData || !reportData.chapters) {
                    throw new Error('后端返回的报告数据格式不正确。请重启后端服务（Ctrl+C 然后 npm start）以加载最新代码。');
                }

                // 缓存最后一次生成的报告，供导出使用
                window.lastGeneratedReport = reportData;
                updateShareLinkButtonVisibility();

                // 渲染AI生成的报告
                renderAIReport(reportData);

            } catch (error) {
                reportContent.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                        <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                            报告生成失败
                        </div>
                        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                            ${error.message}
                        </div>
                        <button class="btn-primary" onclick="generateDetailedReport()">重试</button>
                    </div>
                `;
                updateShareLinkButtonVisibility();
            }
        }

        // 渲染AI生成的报告
        function renderAIReport(reportData) {
    const reportContent = document.getElementById('reportContent');
    const normalizeArray = (value) => Array.isArray(value) ? value : [];
    const normalizeObject = (value) => (value && typeof value === 'object') ? value : {};
    const normalizeText = (value, fallback = '待补充') => (value === undefined || value === null || value === '') ? fallback : value;

    // 验证数据结构
    if (!reportData || !reportData.chapters) {
        reportContent.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                    报告数据格式错误
                </div>
                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                    后端返回的数据格式不正确。<br>
                    请重启后端服务以加载最新代码：<br>
                    <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; margin-top: 8px; display: inline-block;">
                        Ctrl+C 然后 npm start
                    </code>
                </div>
                <button class="btn-primary" onclick="generateDetailedReport()">重试</button>
            </div>
        `;
        return;
    }

    const ch1 = normalizeObject(reportData.chapters.chapter1);
    const ch2 = normalizeObject(reportData.chapters.chapter2);
    const ch3 = normalizeObject(reportData.chapters.chapter3);
    const ch4 = normalizeObject(reportData.chapters.chapter4);
    const ch5 = normalizeObject(reportData.chapters.chapter5);
    const ch6 = normalizeObject(reportData.chapters.chapter6);
    const ch2Assumptions = normalizeArray(ch2.assumptions);
    const ch3Limitations = normalizeArray(ch3.limitations);
    const ch4Stages = normalizeArray(ch4.stages);
    const ch5BlindSpots = normalizeArray(ch5.blindSpots);
    const ch5KeyQuestions = normalizeArray(ch5.keyQuestions);
    const ch6ImmediateActions = normalizeArray(ch6.immediateActions);
    const ch6ExtendedIdeas = normalizeArray(ch6.extendedIdeas);
    const ch6MidtermPlan = normalizeObject(ch6.midtermPlan);
    const ch3Prerequisites = normalizeObject(ch3.prerequisites);
    const coreDefinition = normalizeText(reportData.coreDefinition);
    const problem = normalizeText(reportData.problem);
    const solution = normalizeText(reportData.solution);
    const targetUser = normalizeText(reportData.targetUser);

    reportContent.innerHTML = `
        <!-- 报告内容 -->
        <div id="insights-plan" class="report-tab-content active">

            <!-- 第一章：创意定义与演化 -->
            <div class="report-section">
                <div class="report-section-title">${normalizeText(ch1.title, '创意定义与演化')}</div>
                <div class="document-chapter">
                    <div class="chapter-content" style="padding-left: 0;">
                        <h4>1. 原始表述</h4>
                        <div class="highlight-box">
                            ${normalizeText(ch1.originalIdea || reportData.initialIdea)}
                        </div>

                        <h4>2. 核心定义（对话后）</h4>
                        <p><strong>一句话概括：</strong>${coreDefinition}</p>

                        <h4>3. 价值主张</h4>
                        <ul>
                            <li><strong>解决的根本问题：</strong>${problem}</li>
                            <li><strong>提供的独特价值：</strong>${solution}</li>
                            <li><strong>目标受益者：</strong>${targetUser}</li>
                        </ul>

                        <h4>4. 演变说明</h4>
                        <p>${normalizeText(ch1.evolution)}</p>
                    </div>
                </div>
            </div>

            <!-- 第二章：核心洞察与根本假设 -->
            <div class="report-section">
                <div class="report-section-title">${normalizeText(ch2.title, '核心洞察与根本假设')}</div>
                <div class="document-chapter">
                    <div class="chapter-content" style="padding-left: 0;">
                        <h4>1. 识别的根本需求</h4>
                        <div class="highlight-box">
                            <strong>表层需求：</strong>${normalizeText(ch2.surfaceNeed)}<br><br>
                            <strong>深层动力：</strong>${normalizeText(ch2.deepMotivation)}
                        </div>

                        <h4>2. 核心假设清单</h4>
                        <p><strong>创意成立所依赖的关键前提（未经完全验证）：</strong></p>
                        <ul>
                            ${ch2Assumptions.map(assumption => `<li>${assumption}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>

            <!-- 第三章：边界条件与应用场景 -->
            <div class="report-section">
                <div class="report-section-title">${normalizeText(ch3.title, '边界条件与应用场景')}</div>
                <div class="document-chapter">
                    <div class="chapter-content" style="padding-left: 0;">
                        <h4>1. 理想应用场景</h4>
                        <div class="highlight-box">
                            ${normalizeText(ch3.idealScenario)}
                        </div>

                        <h4>2. 潜在限制因素</h4>
                        <p><strong>创意在以下情况下可能效果打折或失效：</strong></p>
                        <ul>
                            ${ch3Limitations.map(limit => `<li>${limit}</li>`).join('')}
                        </ul>

                        <h4>3. 必要前置条件</h4>
                        <div class="analysis-grid">
                            <div class="analysis-card">
                                <div class="analysis-card-header">
                                    <div class="analysis-icon">🔧</div>
                                    <div class="analysis-card-title">技术基础</div>
                                </div>
                                <div class="analysis-card-content">
                                    ${normalizeText(ch3Prerequisites.technical)}
                                </div>
                            </div>
                            <div class="analysis-card">
                                <div class="analysis-card-header">
                                    <div class="analysis-icon">💰</div>
                                    <div class="analysis-card-title">资源要求</div>
                                </div>
                                <div class="analysis-card-content">
                                    ${normalizeText(ch3Prerequisites.resources)}
                                </div>
                            </div>
                            <div class="analysis-card">
                                <div class="analysis-card-header">
                                    <div class="analysis-icon">🤝</div>
                                    <div class="analysis-card-title">合作基础</div>
                                </div>
                                <div class="analysis-card-content">
                                    ${normalizeText(ch3Prerequisites.partnerships)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 第四章：可行性分析与关键挑战 -->
            <div class="report-section">
                <div class="report-section-title">${normalizeText(ch4.title, '可行性分析与关键挑战')}</div>
                <div class="document-chapter">
                    <div class="chapter-content" style="padding-left: 0;">
                        <h4>1. 实现路径分解</h4>
                        <p><strong>将大创意拆解为关键模块/发展阶段：</strong></p>
                        <ol>
                            ${ch4Stages.map((stage, idx) => `
                                <li><strong>${normalizeText(stage?.stage, `阶段 ${idx + 1}`)}：</strong>${normalizeText(stage?.goal)} - ${normalizeText(stage?.tasks)}</li>
                            `).join('')}
                        </ol>

                        <h4>2. 最大障碍预判</h4>
                        <div class="highlight-box">
                            <strong>⚠️ 最大单一风险点：</strong>${normalizeText(ch4.biggestRisk)}<br><br>
                            <strong>预防措施：</strong>${normalizeText(ch4.mitigation)}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 第五章：思维盲点与待探索问题 -->
            <div class="report-section">
                <div class="report-section-title">${normalizeText(ch5.title, '思维盲点与待探索问题')}</div>
                <div class="document-chapter">
                    <div class="chapter-content" style="padding-left: 0;">
                        <h4>1. 对话中暴露的空白</h4>
                        <div class="highlight-box">
                            <strong>⚠️ 未深入考虑的领域：</strong>
                            <ul style="margin-top: 12px; margin-bottom: 0;">
                            ${ch5BlindSpots.map(spot => `<li>${spot}</li>`).join('')}
                            </ul>
                        </div>

                        <h4>2. 关键待验证问题</h4>
                        <p><strong>以下问题需通过调研、实验或原型才能回答：</strong></p>
                        <div class="analysis-grid">
                            ${ch5KeyQuestions.map((item, idx) => `
                                <div class="analysis-card">
                                    <div class="analysis-card-header">
                                        <div class="analysis-icon">❓</div>
                                        <div class="analysis-card-title">决定性问题 ${idx + 1}</div>
                                    </div>
                                    <div class="analysis-card-content">
                                        ${normalizeText(item?.question)}<br><br>
                                        <strong>验证方法：</strong>${normalizeText(item?.validation)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 第六章：结构化行动建议 -->
            <div class="report-section">
                <div class="report-section-title">${normalizeText(ch6.title, '结构化行动建议')}</div>
                <div class="document-chapter">
                    <div class="chapter-content" style="padding-left: 0;">
                        <h4>1. 立即验证步骤（下周内）</h4>
                        <div class="highlight-box">
                            <strong>🎯 本周行动清单：</strong>
                            <ul style="margin-top: 12px; margin-bottom: 0;">
                                ${ch6ImmediateActions.map(action => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>

                        <h4>2. 中期探索方向（1-3个月）</h4>
                        <p><strong>为解答待探索问题，规划以下研究计划：</strong></p>
                        <ul>
                            <li><strong>用户研究：</strong>${normalizeText(ch6MidtermPlan.userResearch)}</li>
                            <li><strong>市场调研：</strong>${normalizeText(ch6MidtermPlan.marketResearch)}</li>
                            <li><strong>原型开发：</strong>${normalizeText(ch6MidtermPlan.prototyping)}</li>
                            <li><strong>合作探索：</strong>${normalizeText(ch6MidtermPlan.partnerships)}</li>
                        </ul>

                        <h4>3. 概念延伸提示</h4>
                        <p><strong>对话中衍生的关联创意方向：</strong></p>
                        <ul>
                            ${ch6ExtendedIdeas.map(idea => `<li>${idea}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
    updateShareLinkButtonVisibility();
}

        function closeReport() {
            if (window.modalManager && window.modalManager.isOpen('reportModal')) {
                window.modalManager.close('reportModal');
            } else {
                document.getElementById('reportModal').classList.remove('active');
            }
        }

        // Tab 切换逻辑
        function switchReportTab(tabName) {
            // 移除所有 tab 的 active 状态
            const tabs = document.querySelectorAll('.report-tab');
            tabs.forEach(tab => tab.classList.remove('active'));

            // 移除所有 tab 内容的 active 状态
            const tabContents = document.querySelectorAll('.report-tab-content');
            tabContents.forEach(content => content.classList.remove('active'));

            // 激活当前 tab
            if (tabName === 'insights') {
                tabs[0].classList.add('active');
                document.getElementById('insights-plan').classList.add('active');
            } else if (tabName === 'business') {
                tabs[1].classList.add('active');
                document.getElementById('business-plan').classList.add('active');
            } else if (tabName === 'product') {
                tabs[2].classList.add('active');
                document.getElementById('product-plan').classList.add('active');
            }
        }

        // 显示分享卡片
        function showShareCard() {
            const shareModal = document.getElementById('shareModal');
            if (!shareModal) {
                alert('分享功能未初始化，请刷新页面重试。');
                return;
            }
            // 确保卡片内容元素存在
            updateShareCard();
            shareModal.classList.add('active');
        }

        function updateShareCard() {
            const shareModal = document.getElementById('shareModal');
            if (!shareModal) {
                console.warn('Share modal missing.');
                return;
            }

            const titleEl = shareModal.querySelector('#shareIdeaTitle');
            const tag1El = shareModal.querySelector('#shareTag1');
            const tag2El = shareModal.querySelector('#shareTag2');
            const dateEl = shareModal.querySelector('#shareDate');

            if (!titleEl || !tag1El || !tag2El || !dateEl) {
                console.warn('Share card elements missing.');
                return;
            }

            const userData = state?.userData || {};
            if (titleEl) {
                titleEl.textContent = userData.initialIdea || '创意验证工具';
            }

            const tags = [userData.targetUser || '创业者', '思维工具'];
            if (tag1El) tag1El.textContent = tags[0];
            if (tag2El) tag2El.textContent = tags[1];

            // 设置生成日期
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            if (dateEl) dateEl.textContent = dateStr;
        }

        function closeShareModal() {
            if (window.modalManager && window.modalManager.isOpen('shareModal')) {
                window.modalManager.close('shareModal');
            } else {
                document.getElementById('shareModal').classList.remove('active');
            }
        }

        // 下载卡片为图片
        function downloadCard() {
            const card = document.getElementById('shareCard');
            if (!card) return;
            html2canvas(card, {
                scale: 2,
                backgroundColor: null,
                logging: false
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = 'thinkcraft-' + Date.now() + '.png';
                link.href = canvas.toDataURL();
                link.click();
            });
        }

        // 复制分享文案
        function copyShareText() {
            const text = `我用 ThinkCraft AI 深度分析了我的想法"${state.userData.initialIdea || '新创意'}"

🎯 目标用户：${state.userData.targetUser}
💡 核心方案：${state.userData.solution}
📊 综合评分：85分

这是一份基于五看三定、SWOT等专业方法论的AI分析报告，欢迎给我提意见！

#ThinkCraft #AI思维助手 #创意验证`;

            navigator.clipboard.writeText(text).then(() => {
                alert('✅ 文案已复制到剪贴板！\n\n可以直接粘贴到微信、微博等平台分享。');
            });
        }

        // 导出完整PDF
        async function exportFullReport() {
            try {
                // 获取当前报告数据
                const reportContent = document.getElementById('reportContent');
                if (!reportContent) {
                    alert('❌ 无法获取报告内容');
                    return;
                }

                // 确保有可导出的报告数据
                if (!window.lastGeneratedReport || !window.lastGeneratedReport.chapters) {
                    await generateDetailedReport();
                }

                // 显示加载提示
                alert('📄 正在生成PDF，请稍候...');

                // 从实际生成的报告中获取数据
                let reportData = window.lastGeneratedReport || {};

                // 调用后端API生成PDF
                const response = await fetch(`${state.settings.apiUrl}/api/pdf-export/report`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        reportData: reportData,
                        ideaTitle: state.userData.idea || '创意分析报告'
                    })
                });

                if (!response.ok) {
                    throw new Error('PDF生成失败');
                }

                const contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/pdf')) {
                    const errorText = await response.text();
                    throw new Error(errorText || '返回内容不是PDF文件');
                }

                const arrayBuffer = await response.arrayBuffer();
                const header = new TextDecoder('ascii').decode(arrayBuffer.slice(0, 5));
                if (header !== '%PDF-') {
                    throw new Error('PDF文件头校验失败');
                }

                // 下载PDF文件
                const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${state.userData.idea || '创意分析报告'}.pdf`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                }, 1000);

                alert('✅ PDF已导出成功！');

            } catch (error) {
                alert(`❌ PDF导出失败: ${error.message}`);
            }
        }

        // 生成分享链接
        async function generateShareLink() {
            try {
                // 获取当前报告数据
                let reportData = window.lastGeneratedReport || {};

                // 调用后端API创建分享
                const response = await fetch(`${state.settings.apiUrl}/api/share/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'insight-report',
                        data: reportData,
                        title: state.userData.idea || '创意分析报告'
                    })
                });

                if (!response.ok) {
                    throw new Error('创建分享失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || '创建分享失败');
                }

                const { shareUrl, expiresAt } = result.data;

                // 关闭报告弹窗
                closeReport();

                // 更新分享卡片
                updateShareCard();

                // 显示分享链接信息
                const shareModal = document.getElementById('shareModal');
                if (!shareModal) {
                    throw new Error('分享弹窗未初始化');
                }
                const shareCard = shareModal.querySelector('.share-card-footer');
                if (shareCard) {
                    const linkDisplay = document.createElement('div');
                    linkDisplay.style.cssText = 'margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 8px;';
                    linkDisplay.innerHTML = `
                        <p style="font-size: 14px; color: #333; margin-bottom: 10px;"><strong>分享链接：</strong></p>
                        <input type="text" value="${shareUrl}" readonly
                               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px;"
                               onclick="this.select()">
                        <p style="font-size: 12px; color: #999; margin-top: 10px;">
                            链接有效期至: ${new Date(expiresAt).toLocaleString('zh-CN')}
                        </p>
                        <button onclick="copyToClipboard('${shareUrl}')"
                                style="margin-top: 10px; padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            📋 复制链接
                        </button>
                    `;
                    shareModal.querySelector('.modal-body').appendChild(linkDisplay);
                }

                shareModal.classList.add('active');

            } catch (error) {
                alert(`❌ 创建分享失败: ${error.message}`);
            }
        }

        // 复制到剪贴板辅助函数
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('✅ 链接已复制到剪贴板！');
            }).catch(err => {
                alert('❌ 复制失败，请手动复制');
            });
        }

        /* ===== 生成按钮状态管理 ===== */

        // 存储已生成的报告数据
        const generatedReports = {
            business: null,
            proposal: null,
            demo: null
        };

        // 处理生成按钮点击
        function handleGenerationBtnClick(type) {
            const btnId = type === 'business' ? 'businessPlanBtn' :
                         type === 'proposal' ? 'proposalBtn' : 'demoBtn';
            const btn = document.getElementById(btnId);
            const currentStatus = btn ? btn.dataset.status : 'idle';

            // 根据按钮当前状态决定行为
            if (currentStatus === 'completed') {
                // 已完成：查看报告
                const report = generatedReports[type];
                if (report) {
                    viewGeneratedReport(type, report);
                } else {
                    // 重新生成
                    startGenerationFlow(type);
                }
            } else if (currentStatus === 'generating') {
                // 生成中：不做任何操作（按钮已禁用）
                return;
            } else {
                // idle或error状态：开始生成
                startGenerationFlow(type);
            }
        }

        // 开始生成流程
        function startGenerationFlow(type) {
            // 确保businessPlanGenerator已初始化
            if (!window.businessPlanGenerator) {
                try {
                    // 尝试初始化所需的依赖
                    if (!window.modalManager) window.modalManager = new ModalManager();
                    if (!window.apiClient) window.apiClient = new APIClient('http://localhost:3000');
                    if (!window.stateManager) window.stateManager = new StateManager();
                    if (!window.agentProgressManager) window.agentProgressManager = new AgentProgressManager(window.modalManager);

                    // 创建businessPlanGenerator实例
                    window.businessPlanGenerator = new BusinessPlanGenerator(
                        window.apiClient,
                        window.stateManager,
                        window.agentProgressManager
                    );
                    } catch (error) {
                    alert('系统初始化失败，请刷新页面重试');
                    return;
                }
            }

            if (type === 'business') {
                if (typeof window.businessPlanGenerator.showChapterSelection === 'function') {
                    window.businessPlanGenerator.showChapterSelection('business');
                } else {
                    alert('系统功能异常，请刷新页面重试');
                }
            } else if (type === 'proposal') {
                if (typeof window.businessPlanGenerator.showChapterSelection === 'function') {
                    window.businessPlanGenerator.showChapterSelection('proposal');
                } else {
                    alert('系统功能异常，请刷新页面重试');
                }
            } else if (type === 'demo') {
                startDemoGeneration();
            }
        }

        // 查看已生成的报告
        async function viewGeneratedReport(type, report) {
            if (type === 'business' || type === 'proposal') {
                // 设置当前报告类型
                currentReportType = type;

                // 显示商业计划书/产品立项材料
                const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';
                document.getElementById('businessReportTitle').textContent = typeTitle;

                // 如果report包含chapters数据，直接显示
                if (report && report.chapters) {
                    const chapters = report.chapters;
                    currentGeneratedChapters = chapters.map(ch => ch.chapterId);

                    // 生成报告内容（使用真实的AI生成内容）
                    const reportContent = `
                        <div class="report-section">
                            <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid var(--border); margin-bottom: 30px;">
                                <h1 style="font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                                    ${state.userData.idea || '创意项目'}
                                </h1>
                                <p style="font-size: 16px; color: var(--text-secondary);">
                                    ${typeTitle} · AI生成于 ${new Date(report.timestamp || Date.now()).toLocaleDateString()}
                                </p>
                                ${report.costStats ? `<p style="font-size: 14px; color: var(--text-tertiary); margin-top: 8px;">
                                    使用 ${report.totalTokens} tokens · 成本 ${report.costStats.costString}
                                </p>` : ''}
                            </div>

                            ${chapters.map((ch, index) => `
                                <div class="report-section" style="margin-bottom: 40px;">
                                    <div class="report-section-title">${index + 1}. ${ch.title}</div>
                                    <div class="document-chapter">
                                        <div class="chapter-content" style="padding-left: 0;">
                                            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                                                <strong>分析师：</strong>${getAgentIconSvg(ch.emoji || ch.agent, 16, 'agent-inline-icon')} ${ch.agent}
                                            </p>

                                            <div style="line-height: 1.8; white-space: pre-wrap; font-size: 15px;">
                                                ${ch.content || '<p style="color: var(--text-secondary);">内容生成中...</p>'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}

                            <div style="text-align: center; padding: 30px 0; border-top: 2px solid var(--border); margin-top: 40px;">
                                <p style="color: var(--text-secondary); font-size: 14px;">
                                    本报告由 ThinkCraft AI 自动生成 | 数据仅供参考
                                </p>
                            </div>
                        </div>
                    `;

                    document.getElementById('businessReportContent').innerHTML = reportContent;
                    document.getElementById('businessReportModal').classList.add('active');
                } else {
                    // 如果没有数据，提示错误
                    window.modalManager.alert('报告数据加载失败', 'error');
                }
            } else if (type === 'demo') {
                // 显示Demo预览
                showDemoPreview();
            }
        }

        // 更新生成按钮状态
        function updateGenerationButtonState(generationState) {
            const type = generationState.type;
            if (!type) return;

            const btnMap = {
                'business': 'businessPlanBtn',
                'proposal': 'proposalBtn',
                'demo': 'demoBtn'
            };

            const btnId = btnMap[type];
            if (!btnId) return;

            const btn = document.getElementById(btnId);
            if (!btn) return;

            const iconSpan = btn.querySelector('.btn-icon');
            const textSpan = btn.querySelector('.btn-text');
            const status = generationState.status;

            // 移除所有状态类
            btn.classList.remove('btn-idle', 'btn-generating', 'btn-completed', 'btn-error');
            btn.disabled = false;

            // 根据状态更新按钮
            switch (status) {
                case 'idle':
                    btn.classList.add('btn-idle');
                    btn.dataset.status = 'idle';
                    updateButtonContent(type, iconSpan, textSpan, 'idle');
                    break;

                case 'selecting':
                    // 章节选择中，保持原样
                    btn.dataset.status = 'selecting';
                    break;

                case 'generating':
                    btn.classList.add('btn-generating');
                    btn.dataset.status = 'generating';
                    btn.disabled = true;
                    updateButtonContent(type, iconSpan, textSpan, 'generating', generationState.progress);
                    break;

                case 'completed':
                    btn.classList.add('btn-completed');
                    btn.dataset.status = 'completed';
                    updateButtonContent(type, iconSpan, textSpan, 'completed');
                    // 保存生成的报告
                    generatedReports[type] = generationState.results;
                    break;

                case 'error':
                    btn.classList.add('btn-error');
                    btn.dataset.status = 'error';
                    updateButtonContent(type, iconSpan, textSpan, 'error');
                    break;
            }
        }

        // 更新按钮内容
        function updateButtonContent(type, iconSpan, textSpan, status, progress = null) {
            const config = {
                business: {
                    idle: { icon: '📊', text: '商业计划书' },
                    generating: { icon: '⏳', text: '生成中...' },
                    completed: { icon: '✅', text: '商业计划书（查看）' },
                    error: { icon: '❌', text: '生成失败（重试）' }
                },
                proposal: {
                    idle: { icon: '📋', text: '产品立项材料' },
                    generating: { icon: '⏳', text: '生成中...' },
                    completed: { icon: '✅', text: '产品立项材料（查看）' },
                    error: { icon: '❌', text: '生成失败（重试）' }
                },
                demo: {
                    idle: { icon: '🚀', text: '开始生成Demo' },
                    generating: { icon: '⏳', text: '生成中...' },
                    completed: { icon: '✅', text: '查看Demo' },
                    error: { icon: '❌', text: '生成失败（重试）' }
                }
            };

            const content = config[type][status];
            if (content) {
                iconSpan.textContent = content.icon;

                if (status === 'generating' && progress && progress.percentage !== undefined) {
                    // 显示进度百分比
                    const percentage = Math.max(0, Math.min(100, progress.percentage));
                    textSpan.textContent = `生成中 ${percentage}%`;
                    } else {
                    textSpan.textContent = content.text;
                }
            }
        }

        // 从存储加载已生成的报告状态
        async function loadGenerationStates() {
            try {
                // 从IndexedDB加载已保存的报告
                const reports = await window.storageManager.getAllReports();

                if (reports && reports.length > 0) {
                    // 按类型分组
                    reports.forEach(report => {
                        if (report.type === 'business' || report.type === 'proposal' || report.type === 'demo') {
                            generatedReports[report.type] = report.data;

                            // 更新按钮为已完成状态
                            const btnId = report.type === 'business' ? 'businessPlanBtn' :
                                         report.type === 'proposal' ? 'proposalBtn' : 'demoBtn';
                            const btn = document.getElementById(btnId);
                            if (btn) {
                                btn.classList.add('btn-completed');
                                btn.dataset.status = 'completed';

                                const iconSpan = btn.querySelector('.btn-icon');
                                const textSpan = btn.querySelector('.btn-text');
                                updateButtonContent(report.type, iconSpan, textSpan, 'completed');
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Failed to load reports:', error);
            }
        }

        // 显示商业计划书模态框
        function showBusinessPlanModal() {
            window.businessPlanGenerator.showChapterSelection('business');
        }

        // 显示产品立项材料模态框
        function showProjectProposalModal() {
            window.businessPlanGenerator.showChapterSelection('proposal');
        }

        // Mock章节数据
        const MOCK_CHAPTERS = {
            business: {
                core: [
                    { id: 1, title: '执行摘要', desc: '一页纸概述项目核心亮点、市场机会和融资需求', agent: '综合分析师', emoji: '🤖', time: 30 },
                    { id: 2, title: '问题与市场分析', desc: '目标市场规模、用户痛点、市场机会分析', agent: '市场分析师', emoji: '📊', time: 45 },
                    { id: 3, title: '解决方案与产品演进', desc: '产品定位、核心功能、技术优势、发展路线图', agent: '技术架构师', emoji: '⚙️', time: 40 },
                    { id: 5, title: '商业模式与营收规划', desc: '收入模式、定价策略、营收预测', agent: '财务顾问', emoji: '💰', time: 50 },
                    { id: 11, title: '愿景与路线图', desc: '长期愿景、发展路线图、退出策略', agent: '综合分析师', emoji: '🤖', time: 30 }
                ],
                optional: [
                    { id: 4, title: '竞争格局与核心壁垒', desc: '竞品分析、差异化优势、竞争壁垒', agent: '市场分析师', emoji: '📊', time: 35 },
                    { id: 6, title: '市场与增长策略', desc: '市场进入策略、获客渠道、增长规划', agent: '增长策略师', emoji: '📈', time: 40 },
                    { id: 7, title: '团队架构', desc: '核心团队、关键岗位、人才需求', agent: '组织架构顾问', emoji: '👥', time: 30 },
                    { id: 8, title: '财务预测', desc: '5年财务模型、收入/成本预测、盈利能力分析', agent: '财务顾问', emoji: '💰', time: 60 },
                    { id: 9, title: '融资需求与资金使用', desc: '融资金额、资金用途、里程碑规划', agent: '财务顾问', emoji: '💰', time: 35 },
                    { id: 10, title: '风险评估与应对', desc: '关键风险识别、应对措施、风险缓释策略', agent: '风险评估专家', emoji: '⚠️', time: 35 }
                ]
            },
            proposal: {
                core: [
                    { id: 1, title: '项目摘要', desc: '项目背景、目标、核心价值', agent: '综合分析师', emoji: '🤖', time: 30 },
                    { id: 2, title: '问题洞察', desc: '核心痛点、市场缺口分析', agent: '市场分析师', emoji: '📊', time: 40 },
                    { id: 3, title: '解决方案（三层架构）', desc: '协议层、引擎层、网络层设计', agent: '技术架构师', emoji: '⚙️', time: 50 }
                ],
                optional: [
                    { id: 4, title: '竞争与壁垒', desc: '竞争分析与技术壁垒', agent: '市场分析师', emoji: '📊', time: 35 },
                    { id: 5, title: '商业模式', desc: '收入模式与定价策略', agent: '财务顾问', emoji: '💰', time: 45 },
                    { id: 6, title: '市场与增长', desc: '市场策略与增长路径', agent: '增长策略师', emoji: '📈', time: 40 },
                    { id: 7, title: '团队要求', desc: '团队构成与能力要求', agent: '组织架构顾问', emoji: '👥', time: 25 },
                    { id: 8, title: '财务预测与里程碑', desc: '财务模型与关键里程碑', agent: '财务顾问', emoji: '💰', time: 55 },
                    { id: 9, title: '风险与挑战', desc: '风险识别与应对策略', agent: '风险评估专家', emoji: '⚠️', time: 30 },
                    { id: 10, title: '结论', desc: '总结与展望', agent: '综合分析师', emoji: '🤖', time: 20 }
                ]
            }
        };

        // 当前选择的类型
        let currentReportType = 'business';

        // 显示章节选择模态框
        function showChapterSelectionModal(type) {
            currentReportType = type;
            const chapters = MOCK_CHAPTERS[type];
            const typeTitle = type === 'business' ? '商业计划书' : '产品立项材料';

            // 更新标题
            document.querySelector('#chapterSelectionModal .modal-title').textContent =
                `选择需要生成的${typeTitle}章节`;

            // 渲染章节列表
            const chapterListHTML = `
                <div class="chapter-group">
                    <h3>核心章节（必选）</h3>
                    ${chapters.core.map(ch => `
                        <label class="chapter-item disabled">
                            <input type="checkbox" checked disabled data-chapter="${ch.id}" data-time="${ch.time}">
                            <div class="chapter-info">
                                <span class="chapter-name">${ch.title}</span>
                                <span class="chapter-desc">${ch.desc}</span>
                                <div>
                                    <span class="badge">AI自动生成</span>
                                </div>
                            </div>
                        </label>
                    `).join('')}
                </div>

                <div class="chapter-group">
                    <h3>深度分析章节（可选）</h3>
                    ${chapters.optional.map(ch => `
                        <label class="chapter-item">
                            <input type="checkbox" data-chapter="${ch.id}" data-time="${ch.time}" onchange="updateChapterStats()">
                            <div class="chapter-info">
                                <span class="chapter-name">${ch.title}</span>
                                <span class="chapter-desc">${ch.desc}</span>
                                <div>
                                    <span class="badge agent">${getAgentIconSvg(ch.emoji || ch.agent, 14, 'agent-badge-icon')} ${ch.agent}</span>
                                    <span class="badge time">预计${ch.time}s</span>
                                </div>
                            </div>
                        </label>
                    `).join('')}
                </div>
            `;

            document.getElementById('chapterList').innerHTML = chapterListHTML;
            updateChapterStats();
            document.getElementById('chapterSelectionModal').classList.add('active');
        }

        // 更新章节统计
        function updateChapterStats() {
            if (window.businessPlanGenerator) {
                window.businessPlanGenerator.updateChapterStats();
            }
        }

        // 关闭章节选择模态框
        function closeChapterSelection() {
            if (window.modalManager && window.modalManager.isOpen('chapterSelectionModal')) {
                window.modalManager.close('chapterSelectionModal');
            } else {
                document.getElementById('chapterSelectionModal').classList.remove('active');
            }
        }

        // 开始生成
        function startGeneration() {
            window.businessPlanGenerator.startGeneration();
        }

        // 显示Agent进度模态框
        function showAgentProgressModal(selectedChapters) {
            const chapters = MOCK_CHAPTERS[currentReportType];
            const allChapters = [...chapters.core, ...chapters.optional];
            const chaptersToGenerate = allChapters.filter(ch => selectedChapters.includes(ch.id));

            // 构建Agent列表
            const agentListHTML = chaptersToGenerate.map((ch, index) => `
                <div class="agent-item pending" id="agent-${index}">
                    <div class="agent-avatar" id="avatar-${index}">${getAgentIconSvg(ch.emoji || ch.agent, 28, 'agent-avatar-icon')}</div>
                    <div class="agent-info">
                        <h4>${ch.agent}</h4>
                        <p class="task">${ch.title}</p>
                        <p class="status" id="status-${index}">⏸️ 等待中</p>
                    </div>
                </div>
            `).join('');

            document.getElementById('agentList').innerHTML = agentListHTML;
            document.getElementById('agentProgressModal').classList.add('active');

            // 模拟进度更新
            simulateProgress(chaptersToGenerate);
        }

        // 模拟进度更新
        let progressInterval = null;
        function simulateProgress(chapters) {
            let currentIndex = 0;
            let progress = 0;
            const totalChapters = chapters.length;

            // 更新进度文本
            document.getElementById('progressText').textContent =
                `正在生成 ${totalChapters} 个章节，已完成 0 个（0%）`;

            progressInterval = setInterval(() => {
                if (currentIndex < totalChapters) {
                    const agentItem = document.getElementById(`agent-${currentIndex}`);
                    const avatar = document.getElementById(`avatar-${currentIndex}`);
                    const status = document.getElementById(`status-${currentIndex}`);

                    // 设置为工作中
                    agentItem.classList.remove('pending');
                    agentItem.classList.add('working');
                    avatar.classList.add('spinning');
                    status.textContent = '⏳ 分析中...';

                    // 2秒后完成
                    setTimeout(() => {
                        agentItem.classList.remove('working');
                        agentItem.classList.add('completed');
                        avatar.classList.remove('spinning');
                        status.textContent = '✅ 已完成';

                        currentIndex++;
                        progress = Math.round((currentIndex / totalChapters) * 100);

                        // 更新进度条
                        document.getElementById('progressFill').style.width = `${progress}%`;
                        document.getElementById('progressText').textContent =
                            `正在生成 ${totalChapters} 个章节，已完成 ${currentIndex} 个（${progress}%）`;

                        // 全部完成
                        if (currentIndex === totalChapters) {
                            clearInterval(progressInterval);
                            setTimeout(() => {
                                closeAgentProgress();
                                // 显示生成的报告
                                showGeneratedBusinessReport(selectedChapters);
                            }, 1000);
                        }
                    }, 2000);
                }
            }, 2500);
        }

        // 关闭Agent进度模态框
        function closeAgentProgress() {
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            if (window.modalManager && window.modalManager.isOpen('agentProgressModal')) {
                window.modalManager.close('agentProgressModal');
            } else {
                document.getElementById('agentProgressModal').classList.remove('active');
            }
        }

        // 取消生成
        function cancelGeneration() {
            if (window.agentProgressManager) {
                window.agentProgressManager.cancel();
            }
        }

        // 存储当前生成的章节配置
        let currentGeneratedChapters = [];

        // 显示生成的商业计划书/产品立项报告
        function showGeneratedBusinessReport(selectedChapters) {
            // 保存当前配置
            currentGeneratedChapters = selectedChapters;

            const chapters = MOCK_CHAPTERS[currentReportType];
            const allChapters = [...chapters.core, ...chapters.optional];
            const generatedChapters = allChapters.filter(ch => selectedChapters.includes(ch.id));

            // 更新标题
            const typeTitle = currentReportType === 'business' ? '商业计划书' : '产品立项材料';
            document.getElementById('businessReportTitle').textContent = typeTitle;

            // 生成报告内容
            const reportContent = `
                <div class="report-section">
                    <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid var(--border); margin-bottom: 30px;">
                        <h1 style="font-size: 28px; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                            ${state.userData.idea || '创意项目'}
                        </h1>
                        <p style="font-size: 16px; color: var(--text-secondary);">
                            ${typeTitle} · AI生成于 ${new Date().toLocaleDateString()}
                        </p>
                    </div>

                    ${generatedChapters.map((ch, index) => `
                        <div class="report-section" style="margin-bottom: 40px;">
                            <div class="report-section-title">${index + 1}. ${ch.title}</div>
                            <div class="document-chapter">
                                <div class="chapter-content" style="padding-left: 0;">
                                    <p style="color: var(--text-secondary); margin-bottom: 20px;">
                                        <strong>分析师：</strong>${getAgentIconSvg(ch.emoji || ch.agent, 16, 'agent-inline-icon')} ${ch.agent}
                                    </p>

                                    <div class="highlight-box">
                                        <h4>核心观点</h4>
                                        <p>${ch.desc}</p>
                                    </div>

                                    <h4>详细分析</h4>
                                    <p>基于您的创意"${state.userData.idea || '创意项目'}"，我们从以下维度进行了深入分析：</p>

                                    <ul>
                                        <li><strong>市场机会：</strong>目标市场规模可观，用户需求明确</li>
                                        <li><strong>竞争优势：</strong>具备差异化价值主张和技术壁垒</li>
                                        <li><strong>实施可行性：</strong>资源要求合理，风险可控</li>
                                    </ul>

                                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-top: 20px;">
                                        <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                                            💡 <strong>AI建议：</strong>建议在MVP阶段重点验证核心假设，快速迭代优化产品方向。
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}

                    <div style="text-align: center; padding: 30px 0; border-top: 2px solid var(--border); margin-top: 40px;">
                        <p style="color: var(--text-secondary); font-size: 14px;">
                            本报告由ThinkCraft AI生成，共 ${generatedChapters.length} 个章节
                        </p>
                    </div>
                </div>
            `;

            document.getElementById('businessReportContent').innerHTML = reportContent;
            document.getElementById('businessReportModal').classList.add('active');
        }

        // 关闭商业报告
        function closeBusinessReport() {
            if (window.modalManager && window.modalManager.isOpen('businessReportModal')) {
                window.modalManager.close('businessReportModal');
            } else {
                document.getElementById('businessReportModal').classList.remove('active');
            }
        }

        // 重新生成商业报告
        function regenerateBusinessReport() {
            if (!confirm('确定要重新生成报告吗？\n\n这将使用AI重新分析并生成新的报告内容。')) {
                return;
            }

            // 调用businessPlanGenerator的重新生成方法
            if (window.businessPlanGenerator) {
                closeBusinessReport();
                window.businessPlanGenerator.regenerate();
            }
        }

        // 调整商业报告章节
        function adjustBusinessReportChapters() {
            // 关闭当前报告
            closeBusinessReport();

            // 重新打开章节选择模态框
            showChapterSelectionModal(currentReportType);

            // 恢复之前的选择状态
            setTimeout(() => {
                const checkboxes = document.querySelectorAll('#chapterList input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    const chapterId = parseInt(cb.dataset.chapter);
                    if (currentGeneratedChapters.includes(chapterId) && !cb.disabled) {
                        cb.checked = true;
                    } else if (!cb.disabled) {
                        cb.checked = false;
                    }
                });
                updateChapterStats();
            }, 100);
        }

        // 导出商业报告PDF
        async function exportBusinessReport() {
            try {
                const typeTitle = currentReportType === 'business' ? '商业计划书' : '产品立项材料';

                // 获取已生成的报告数据
                const reportData = generatedReports[currentReportType];
                if (!reportData || !reportData.chapters) {
                    alert('❌ 无报告数据可导出');
                    return;
                }

                alert('📄 正在生成PDF，请稍候...');

                // 调用后端API生成PDF
                const response = await fetch(`${state.settings.apiUrl}/api/pdf-export/business-plan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        chapters: reportData.chapters,
                        title: state.userData.idea || typeTitle,
                        type: currentReportType
                    })
                });

                if (!response.ok) {
                    throw new Error('PDF生成失败');
                }

                // 下载PDF文件
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${typeTitle}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                alert('✅ PDF已导出成功！');

            } catch (error) {
                alert(`❌ PDF导出失败: ${error.message}`);
            }
        }

        // 分享商业报告
        async function shareBusinessReport() {
            try {
                const typeTitle = currentReportType === 'business' ? '商业计划书' : '产品立项材料';
                const reportData = generatedReports[currentReportType];

                if (!reportData) {
                    alert('❌ 无报告数据可分享');
                    return;
                }

                // 调用后端API创建分享
                const response = await fetch(`${state.settings.apiUrl}/api/share/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: currentReportType,
                        data: reportData,
                        title: state.userData.idea || typeTitle
                    })
                });

                if (!response.ok) {
                    throw new Error('创建分享失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || '创建分享失败');
                }

                const { shareUrl, expiresAt } = result.data;

                // 显示分享链接
                const message = `🔗 分享链接已生成！\n\n${shareUrl}\n\n链接有效期至: ${new Date(expiresAt).toLocaleString('zh-CN')}\n\n点击"确定"复制链接`;

                if (confirm(message)) {
                    copyToClipboard(shareUrl);
                }

            } catch (error) {
                alert(`❌ 创建分享失败: ${error.message}`);
            }
        }

        /* ===== Demo生成功能 ===== */

        // 存储Demo生成相关数据
        let currentDemoType = 'web'; // 默认生成web应用
        let currentDemoFeatures = [];

        // 开始Demo生成流程（简化版：直接生成，不选择类型）
        function startDemoGeneration() {
            // 关闭报告模态框
            closeReport();

            // 更新状态
            window.stateManager.startGeneration('demo', []);

            // 直接开始生成
            showDemoGenerationProgress();
        }

        // 关闭Demo类型选择
        function closeDemoTypeSelection() {
            if (window.modalManager && window.modalManager.isOpen('demoTypeModal')) {
                window.modalManager.close('demoTypeModal');
            } else {
                document.getElementById('demoTypeModal').classList.remove('active');
            }
            window.currentDemoProjectId = null;
        }

        // 选择Demo类型
        function selectDemoType(type) {
            currentDemoType = type;

            const typeNames = {
                'web': '网站应用',
                'app': '移动应用',
                'miniapp': '小程序',
                'admin': '管理后台'
            };

            // 关闭类型选择
            closeDemoTypeSelection();

            // 显示功能确认
            showDemoFeaturesConfirmation();
        }

        // 显示Demo功能确认
        function showDemoFeaturesConfirmation() {
            // 基于创意自动生成功能列表
            const features = generateDemoFeatures();
            currentDemoFeatures = features;

            const featuresHTML = `
                <div class="chapter-group">
                    <h3>核心功能（必选）</h3>
                    ${features.core.map((feature, index) => `
                        <label class="chapter-item disabled">
                            <input type="checkbox" checked disabled>
                            <div class="chapter-info">
                                <span class="chapter-name">${feature.title}</span>
                                <span class="chapter-desc">${feature.desc}</span>
                            </div>
                        </label>
                    `).join('')}
                </div>

                <div class="chapter-group">
                    <h3>增强功能（可选）</h3>
                    ${features.optional.map((feature, index) => `
                        <label class="chapter-item">
                            <input type="checkbox" data-feature="${index}">
                            <div class="chapter-info">
                                <span class="chapter-name">${feature.title}</span>
                                <span class="chapter-desc">${feature.desc}</span>
                            </div>
                        </label>
                    `).join('')}
                </div>
            `;

            document.getElementById('demoFeaturesList').innerHTML = featuresHTML;
            document.getElementById('demoFeaturesModal').classList.add('active');
        }

        // 生成Demo功能列表（基于创意内容）
        function generateDemoFeatures() {
            const typeFeatures = {
                'web': {
                    core: [
                        { title: '首页展示', desc: '产品介绍、核心价值展示' },
                        { title: '功能介绍页', desc: '详细功能说明和使用场景' },
                        { title: '响应式布局', desc: '适配桌面端和移动端' }
                    ],
                    optional: [
                        { title: '用户注册/登录', desc: '账号体系和权限管理' },
                        { title: '数据可视化', desc: '图表展示和数据分析' },
                        { title: '支付功能', desc: '在线支付和订单管理' },
                        { title: '评论互动', desc: '用户评论和社交互动' }
                    ]
                },
                'app': {
                    core: [
                        { title: '启动页面', desc: '品牌展示和引导页' },
                        { title: '主界面框架', desc: '底部导航和核心模块' },
                        { title: '用户中心', desc: '个人信息和设置' }
                    ],
                    optional: [
                        { title: '推送通知', desc: '消息推送和提醒' },
                        { title: '离线功能', desc: '离线使用和数据同步' },
                        { title: '分享功能', desc: '内容分享到社交平台' },
                        { title: '地图定位', desc: '位置服务和地图展示' }
                    ]
                },
                'miniapp': {
                    core: [
                        { title: '首页', desc: '核心功能入口' },
                        { title: '列表页', desc: '内容列表和筛选' },
                        { title: '详情页', desc: '详细信息展示' }
                    ],
                    optional: [
                        { title: '微信登录', desc: '一键授权登录' },
                        { title: '微信支付', desc: '小程序内支付' },
                        { title: '分享卡片', desc: '分享到微信好友' },
                        { title: '订阅消息', desc: '订阅通知提醒' }
                    ]
                },
                'admin': {
                    core: [
                        { title: '登录页', desc: '管理员登录验证' },
                        { title: '数据面板', desc: '核心数据统计展示' },
                        { title: '侧边栏导航', desc: '功能模块导航' }
                    ],
                    optional: [
                        { title: '用户管理', desc: '用户列表和权限管理' },
                        { title: '内容管理', desc: '内容发布和审核' },
                        { title: '数据分析', desc: '业务数据分析报表' },
                        { title: '系统设置', desc: '系统配置和参数设置' }
                    ]
                }
            };

            return typeFeatures[currentDemoType] || typeFeatures['web'];
        }

        // 关闭功能确认
        function closeDemoFeatures() {
            if (window.modalManager && window.modalManager.isOpen('demoFeaturesModal')) {
                window.modalManager.close('demoFeaturesModal');
            } else {
                document.getElementById('demoFeaturesModal').classList.remove('active');
            }
            window.currentDemoProjectId = null;
        }

        // 确认Demo功能并开始生成
        function confirmDemoFeatures() {
            // 关闭功能确认
            closeDemoFeatures();

            // 显示生成进度
            showDemoGenerationProgress();
        }

        // 显示Demo生成进度
        async function showDemoGenerationProgress() {
            // 初始化步骤列表
            const steps = [
                { id: 'requirements', icon: '📋', title: '需求分析', desc: '分析创意需求并规划功能模块' },
                { id: 'architecture', icon: '🏗️', title: '架构设计', desc: '设计技术架构和数据结构' },
                { id: 'frontend', icon: '🎨', title: '前端开发', desc: '生成UI界面和交互逻辑' },
                { id: 'integration', icon: '🔧', title: '功能集成', desc: '集成各个模块和组件' },
                { id: 'testing', icon: '✅', title: '测试优化', desc: '测试功能并优化性能' }
            ];

            const stepsHTML = steps.map(step => `
                <div class="demo-step-item" id="demo-step-${step.id}">
                    <div class="demo-step-icon" id="demo-step-icon-${step.id}">${step.icon}</div>
                    <div class="demo-step-info">
                        <div class="demo-step-title">${step.title}</div>
                        <div class="demo-step-desc">${step.desc}</div>
                    </div>
                    <div class="demo-step-status" id="demo-step-status-${step.id}">等待中</div>
                </div>
            `).join('');

            document.getElementById('demoStepsList').innerHTML = stepsHTML;
            document.getElementById('demoLogs').innerHTML = '<div>> 初始化开发环境...</div>';
            document.getElementById('demoProgressFill').style.width = '0%';
            document.getElementById('demoProgressText').textContent = '准备开始生成...';

            document.getElementById('demoProgressModal').classList.add('active');

            // 真实调用后端API生成Demo
            await generateDemoViaAPI(steps);
        }

        // 通过API生成Demo
        async function generateDemoViaAPI(steps) {
            try {
                let currentStepIndex = 0;
                let conversationHistory = state.messages;
                let ideaTitle = state.userData.idea || '创意项目';
                let projectId = window.currentDemoProjectId || null;

                if (projectId && window.projectManager) {
                    try {
                        const project = await window.projectManager.getProject(projectId);
                        if (project) {
                            const chat = await storageManager.getChat(project.ideaId);
                            if (chat) {
                                conversationHistory = chat.messages || [];
                                ideaTitle = chat.title || project.name;
                            } else {
                                ideaTitle = project.name;
                            }
                        }
                    } catch (error) {
                        }
                }

                // 模拟前期步骤（需求分析、架构设计）
                for (let i = 0; i < 2; i++) {
                    const step = steps[i];
                    updateDemoStep(step, 'active');
                    addDemoLog(`> ${step.desc}...`);
                    await sleep(1500);
                    updateDemoStep(step, 'completed');
                    currentStepIndex++;
                    updateDemoProgress(currentStepIndex, steps.length);
                }

                // 真实生成（前端开发步骤）
                const frontendStep = steps[2];
                updateDemoStep(frontendStep, 'active');
                addDemoLog('> 调用AI代码生成引擎...');
                await sleep(500);

                // 调用后端API
                addDemoLog('> 生成React组件代码...');
                const response = await fetch(`${state.settings.apiUrl}/api/demo-generator/generate`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        demoType: currentDemoType,
                        conversationHistory,
                        features: currentDemoFeatures,
                        ideaTitle,
                        projectId
                    })
                });

                if (!response.ok) {
                    throw new Error('Demo生成失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || 'Demo生成失败');
                }

                const { demoId, filename, previewUrl, downloadUrl, codeLength, tokens } = result.data;

                addDemoLog(`> ✓ 代码生成完成，共 ${codeLength} 字符`);
                addDemoLog(`> 使用 tokens: ${tokens}`);

                updateDemoStep(frontendStep, 'completed');
                currentStepIndex++;
                updateDemoProgress(currentStepIndex, steps.length);

                if (projectId && window.projectManager) {
                    await window.projectManager.linkDemo(projectId, {
                        demoType: currentDemoType,
                        previewUrl,
                        downloadUrl,
                        generatedAt: Date.now()
                    });
                    window.currentDemoProjectId = null;
                }

                // 后续步骤（集成、测试）
                for (let i = 3; i < steps.length; i++) {
                    const step = steps[i];
                    updateDemoStep(step, 'active');
                    addDemoLog(`> ${step.desc}...`);
                    await sleep(1000);
                    updateDemoStep(step, 'completed');
                    currentStepIndex++;
                    updateDemoProgress(currentStepIndex, steps.length);
                }

                addDemoLog('> ✅ Demo生成完成！');

                // 保存Demo信息到state
                window.currentGeneratedDemo = {
                    demoId,
                    filename,
                    previewUrl: `${state.settings.apiUrl}${previewUrl}`,
                    downloadUrl: `${state.settings.apiUrl}${downloadUrl}`,
                    codeLength,
                    tokens,
                    generatedAt: new Date().toISOString()
                };

                // 更新状态
                const demoData = {
                    ...window.currentGeneratedDemo,
                    type: currentDemoType,
                    features: currentDemoFeatures
                };

                window.stateManager.completeGeneration(demoData);

                // 保存到IndexedDB
                window.storageManager.saveReport({
                    id: `demo-${demoId}`,
                    type: 'demo',
                    data: demoData,
                    chatId: state.currentChat
                });

                // 延迟后显示预览
                setTimeout(() => {
                    closeDemoProgress();
                    showDemoPreview();
                }, 1500);

            } catch (error) {
                addDemoLog(`> ❌ 错误: ${error.message}`);

                // 更新状态
                window.stateManager.errorGeneration(error);

                setTimeout(() => {
                    closeDemoProgress();
                    alert(`❌ Demo生成失败: ${error.message}`);
                }, 2000);
            }
        }

        // 更新Demo步骤状态
        function updateDemoStep(step, status) {
            const stepEl = document.getElementById(`demo-step-${step.id}`);
            const iconEl = document.getElementById(`demo-step-icon-${step.id}`);
            const statusEl = document.getElementById(`demo-step-status-${step.id}`);

            if (status === 'active') {
                stepEl.classList.add('active');
                iconEl.classList.add('spinning');
                statusEl.textContent = '进行中...';
            } else if (status === 'completed') {
                stepEl.classList.remove('active');
                stepEl.classList.add('completed');
                iconEl.classList.remove('spinning');
                statusEl.textContent = '已完成';
            }
        }

        // 更新Demo进度
        function updateDemoProgress(current, total) {
            const progress = Math.round((current / total) * 100);
            document.getElementById('demoProgressFill').style.width = `${progress}%`;
            document.getElementById('demoProgressText').textContent =
                `正在生成Demo，已完成 ${current}/${total} 个步骤（${progress}%）`;

            // 更新StateManager进度
            window.stateManager.updateProgress(
                `步骤 ${current}/${total}`,
                current,
                { completed: current, total: total }
            );
        }

        // 睡眠函数
        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // 模拟Demo生成过程
        let demoProgressInterval = null;
        const demoLogs = [];

        function simulateDemoGeneration(steps) {
            let currentStepIndex = 0;
            let progress = 0;
            const totalSteps = steps.length;

            const logMessages = {
                'requirements': [
                    '> 分析用户创意：' + (state.userData.idea || '创意项目'),
                    '> 提取核心功能需求...',
                    '> 生成功能模块规划...',
                    '> 需求分析完成 ✓'
                ],
                'architecture': [
                    '> 设计技术架构...',
                    '> 选择技术栈：React + TailwindCSS',
                    '> 规划组件结构...',
                    '> 架构设计完成 ✓'
                ],
                'frontend': [
                    '> 生成页面布局代码...',
                    '> 创建React组件...',
                    '> 实现交互逻辑...',
                    '> 前端开发完成 ✓'
                ],
                'integration': [
                    '> 集成功能模块...',
                    '> 配置路由和状态管理...',
                    '> 连接数据接口...',
                    '> 功能集成完成 ✓'
                ],
                'testing': [
                    '> 运行功能测试...',
                    '> 优化性能...',
                    '> 生成项目文件...',
                    '> 测试优化完成 ✓'
                ]
            };

            function processStep() {
                if (currentStepIndex >= totalSteps) {
                    clearInterval(demoProgressInterval);

                    // 更新状态为完成
                    const demoData = {
                        type: 'web',
                        features: ['首页', '用户系统', '核心功能'],
                        generatedAt: new Date().toISOString()
                    };

                    window.stateManager.completeGeneration(demoData);

                    // 保存到IndexedDB
                    window.storageManager.saveReport({
                        id: `demo-${Date.now()}`,
                        type: 'demo',
                        data: demoData,
                        chatId: state.currentChat
                    });

                    setTimeout(() => {
                        closeDemoProgress();
                        showDemoPreview();
                    }, 1000);
                    return;
                }

                const step = steps[currentStepIndex];
                const stepEl = document.getElementById(`demo-step-${step.id}`);
                const iconEl = document.getElementById(`demo-step-icon-${step.id}`);
                const statusEl = document.getElementById(`demo-step-status-${step.id}`);

                // 设置为活动状态
                stepEl.classList.add('active');
                iconEl.classList.add('spinning');
                statusEl.textContent = '进行中...';

                // 添加日志
                const logs = logMessages[step.id];
                let logIndex = 0;
                const logInterval = setInterval(() => {
                    if (logIndex < logs.length) {
                        addDemoLog(logs[logIndex]);
                        logIndex++;
                    } else {
                        clearInterval(logInterval);
                    }
                }, 800);

                // 模拟步骤完成
                setTimeout(() => {
                    stepEl.classList.remove('active');
                    stepEl.classList.add('completed');
                    iconEl.classList.remove('spinning');
                    statusEl.textContent = '已完成';

                    currentStepIndex++;
                    progress = Math.round((currentStepIndex / totalSteps) * 100);

                    // 更新StateManager进度
                    window.stateManager.updateProgress(
                        step.title,
                        currentStepIndex,
                        { step: step.id, completed: true }
                    );

                    document.getElementById('demoProgressFill').style.width = `${progress}%`;
                    document.getElementById('demoProgressText').textContent =
                        `正在生成Demo，已完成 ${currentStepIndex}/${totalSteps} 个步骤（${progress}%）`;

                }, 5000);
            }

            demoProgressInterval = setInterval(processStep, 5500);
            processStep();
        }

        // 添加日志
        function addDemoLog(message) {
            const logsContainer = document.getElementById('demoLogs');
            const logEl = document.createElement('div');
            logEl.textContent = message;
            logEl.style.opacity = '0';
            logEl.style.transition = 'opacity 0.3s';
            logsContainer.appendChild(logEl);

            setTimeout(() => {
                logEl.style.opacity = '1';
            }, 50);

            // 自动滚动到底部
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }

        // 关闭Demo进度
        function closeDemoProgress() {
            if (demoProgressInterval) {
                clearInterval(demoProgressInterval);
                demoProgressInterval = null;
            }
            if (window.modalManager && window.modalManager.isOpen('demoProgressModal')) {
                window.modalManager.close('demoProgressModal');
            } else {
                document.getElementById('demoProgressModal').classList.remove('active');
            }
        }

        // 取消Demo生成
        function cancelDemoGeneration() {
            if (confirm('确定要取消Demo生成吗？')) {
                // 重置状态
                window.stateManager.resetGeneration();
                closeDemoProgress();
            }
        }

        // 显示Demo预览
        async function showDemoPreview() {
            const demoPreviewModal = document.getElementById('demoPreviewModal');
            demoPreviewModal.classList.add('active');

            // 加载并显示真实的Demo代码
            if (window.currentGeneratedDemo) {
                try {
                    // 获取Demo代码
                    const response = await fetch(`${state.settings.apiUrl}/api/demo-generator/preview/${window.currentGeneratedDemo.demoId}`);

                    if (response.ok) {
                        const result = await response.json();
                        if (result.code === 0) {
                            const htmlCode = result.data.htmlCode;

                            // 在iframe中显示Demo
                            const previewFrame = document.getElementById('demoPreviewFrame');
                            previewFrame.innerHTML = `
                                <iframe
                                    style="width: 100%; height: 100%; border: none;"
                                    srcdoc="${htmlCode.replace(/"/g, '&quot;')}"
                                    sandbox="allow-scripts allow-same-origin">
                                </iframe>
                            `;
                        }
                    }
                } catch (error) {
                    }
            }
        }

        // 关闭Demo预览
        function closeDemoPreview() {
            if (window.modalManager && window.modalManager.isOpen('demoPreviewModal')) {
                window.modalManager.close('demoPreviewModal');
            } else {
                document.getElementById('demoPreviewModal').classList.remove('active');
            }
        }

        // 下载Demo
        async function downloadDemo() {
            if (!window.currentGeneratedDemo) {
                alert('❌ 无Demo可下载');
                return;
            }

            try {
                // 直接下载ZIP文件
                const downloadUrl = window.currentGeneratedDemo.downloadUrl;
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${window.currentGeneratedDemo.demoId}_source.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                alert('✅ Demo源代码下载已开始！');

            } catch (error) {
                alert(`❌ 下载失败: ${error.message}`);
            }
        }

        // 查看Demo代码
        async function viewDemoCode() {
            if (!window.currentGeneratedDemo) {
                alert('❌ 无Demo可查看');
                return;
            }

            try {
                // 获取Demo代码
                const response = await fetch(`${state.settings.apiUrl}/api/demo-generator/preview/${window.currentGeneratedDemo.demoId}`);

                if (!response.ok) {
                    throw new Error('获取代码失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || '获取代码失败');
                }

                const htmlCode = result.data.htmlCode;

                // 创建代码查看器窗口
                const codeWindow = window.open('', '_blank', 'width=800,height=600');
                codeWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Demo源代码</title>
                        <style>
                            body {
                                margin: 0;
                                padding: 20px;
                                font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
                                background: #1e1e1e;
                                color: #d4d4d4;
                            }
                            pre {
                                margin: 0;
                                white-space: pre-wrap;
                                word-wrap: break-word;
                            }
                            .header {
                                background: #2d2d2d;
                                padding: 15px;
                                margin: -20px -20px 20px -20px;
                                border-bottom: 1px solid #3e3e3e;
                            }
                            .header h2 {
                                margin: 0;
                                color: #fff;
                                font-size: 18px;
                            }
                            button {
                                background: #0e639c;
                                color: white;
                                border: none;
                                padding: 8px 16px;
                                border-radius: 4px;
                                cursor: pointer;
                                margin-top: 10px;
                            }
                            button:hover {
                                background: #1177bb;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h2>🔍 ${window.currentGeneratedDemo.filename}</h2>
                            <button onclick="navigator.clipboard.writeText(document.getElementById('code').textContent).then(() => alert('代码已复制！'))">
                                📋 复制代码
                            </button>
                        </div>
                        <pre id="code">${htmlCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                    </body>
                    </html>
                `);
                codeWindow.document.close();

            } catch (error) {
                alert(`❌ 查看代码失败: ${error.message}`);
            }
        }

        // 分享Demo链接
        async function shareDemoLink() {
            if (!window.currentGeneratedDemo) {
                alert('❌ 无Demo可分享');
                return;
            }

            try {
                // 创建分享链接
                const response = await fetch(`${state.settings.apiUrl}/api/share/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'demo',
                        data: window.currentGeneratedDemo,
                        title: state.userData.idea || 'Demo展示'
                    })
                });

                if (!response.ok) {
                    throw new Error('创建分享失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || '创建分享失败');
                }

                const { shareUrl, expiresAt } = result.data;

                // 显示分享链接
                const message = `🔗 Demo分享链接已生成！\n\n${shareUrl}\n\n链接有效期至: ${new Date(expiresAt).toLocaleString('zh-CN')}\n\n点击"确定"复制链接`;

                if (confirm(message)) {
                    copyToClipboard(shareUrl);
                }

            } catch (error) {
                alert(`❌ 分享失败: ${error.message}`);
            }
        }

        /* ===== 数字员工管理系统 ===== */

        // 存储当前用户ID和Agent数据
        const USER_ID = 'user_' + Date.now(); // 生产环境应使用真实用户ID
        let myAgents = []; // 用户雇佣的Agent列表
        let availableAgentTypes = []; // 可雇佣的Agent类型

        // 初始化Agent系统
        async function initAgentSystem() {
            try {
                // 获取可用的Agent类型
                const response = await fetch(`${state.settings.apiUrl}/api/agents/types`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.code === 0) {
                        availableAgentTypes = result.data.types;
                    }
                }

                // 获取用户已雇佣的Agent
                await loadMyAgents();

                // 更新侧边栏显示
                updateAgentTeamSummary();

            } catch (error) {
                }
        }

        // 加载用户的Agent团队
        async function loadMyAgents() {
            try {
                const response = await fetch(`${state.settings.apiUrl}/api/agents/my/${USER_ID}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.code === 0) {
                        myAgents = result.data.agents || [];
                    }
                }
            } catch (error) {
                }
        }

        // 更新侧边栏团队摘要
        function updateAgentTeamSummary() {
            const summaryEl = document.getElementById('agentTeamSummary');
            if (summaryEl) {
                if (myAgents.length === 0) {
                    summaryEl.textContent = '点击管理你的AI员工团队';
                } else {
                    summaryEl.textContent = `已雇佣 ${myAgents.length} 名员工`;
                }
            }
        }

        // 显示Agent管理界面
        function showAgentManagement() {
            // 创建模态框HTML
            const modalHTML = `
                <div class="modal" id="agentManagementModal">
                    <div class="modal-content" style="max-width: 900px; height: 80vh;">
                        <div class="modal-header">
                            <h2>👥 数字员工团队管理</h2>
                            <button class="close-btn" onclick="closeAgentManagement()">×</button>
                        </div>
                        <div class="modal-body" style="padding: 0; height: calc(100% - 60px);">
                            <div style="display: flex; height: 100%; border-top: 1px solid var(--border);">
                                <!-- 左侧导航 -->
                                <div style="width: 200px; border-right: 1px solid var(--border); background: #f9fafb; overflow-y: auto;">
                                    <div class="agent-nav-item active" onclick="switchAgentTab('my-team')" data-tab="my-team">
                                        <span style="margin-right: 8px;">👥</span>
                                        我的团队
                                    </div>
                                    <div class="agent-nav-item" onclick="switchAgentTab('hire')" data-tab="hire">
                                        <span style="margin-right: 8px;">🎯</span>
                                        招聘大厅
                                    </div>
                                    <div class="agent-nav-item" onclick="switchAgentTab('tasks')" data-tab="tasks">
                                        <span style="margin-right: 8px;">📋</span>
                                        任务管理
                                    </div>
                                    <div class="agent-nav-item" onclick="switchAgentTab('collaboration')" data-tab="collaboration">
                                        <span style="margin-right: 8px;">🤝</span>
                                        团队协同
                                    </div>
                                </div>

                                <!-- 右侧内容区 -->
                                <div style="flex: 1; overflow-y: auto; padding: 24px;" id="agentContent">
                                    <!-- 动态内容 -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    .agent-nav-item {
                        padding: 16px 20px;
                        cursor: pointer;
                        font-size: 14px;
                        color: var(--text-secondary);
                        transition: all 0.2s;
                        border-left: 3px solid transparent;
                    }
                    .agent-nav-item:hover {
                        background: white;
                        color: var(--text-primary);
                    }
                    .agent-nav-item.active {
                        background: white;
                        color: var(--primary);
                        font-weight: 600;
                        border-left-color: var(--primary);
                    }
                    .agent-card {
                        background: white;
                        border: 1px solid var(--border);
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 16px;
                        transition: all 0.3s;
                    }
                    .agent-card:hover {
                        border-color: var(--primary);
                        box-shadow: 0 4px 12px rgba(79,70,229,0.1);
                    }
                    .agent-skill-tag {
                        display: inline-block;
                        background: #f3f4f6;
                        color: #6b7280;
                        padding: 4px 10px;
                        border-radius: 12px;
                        font-size: 12px;
                        margin: 4px 4px 4px 0;
                    }
                    .hire-btn {
                        background: linear-gradient(135deg, var(--primary) 0%, #6366f1 100%);
                        color: white;
                        border: none;
                        padding: 8px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                        transition: all 0.3s;
                    }
                    .hire-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(79,70,229,0.3);
                    }
                    .fire-btn {
                        background: #ef4444;
                        color: white;
                        border: none;
                        padding: 6px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                        margin-left: 8px;
                    }
                    .assign-task-btn {
                        background: var(--primary);
                        color: white;
                        border: none;
                        padding: 6px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 12px;
                    }
                </style>
            `;

            // 检查是否已存在模态框，如果存在则移除
            const existingModal = document.getElementById('agentManagementModal');
            if (existingModal) {
                existingModal.remove();
            }

            // 添加到body
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // 显示模态框
            setTimeout(() => {
                document.getElementById('agentManagementModal').classList.add('active');
                // 默认显示"我的团队"
                switchAgentTab('my-team');
            }, 10);
        }

        // 关闭Agent管理
        function closeAgentManagement() {
            const modal = document.getElementById('agentManagementModal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        }

        // 切换Tab
        function switchAgentTab(tab) {
            // 更新导航样式
            document.querySelectorAll('.agent-nav-item').forEach(item => {
                if (item.dataset.tab === tab) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // 更新内容
            const content = document.getElementById('agentContent');
            switch (tab) {
                case 'my-team':
                    renderMyTeam(content);
                    break;
                case 'hire':
                    renderHireHall(content);
                    break;
                case 'tasks':
                    renderTasks(content);
                    break;
                case 'collaboration':
                    renderCollaboration(content);
                    break;
            }
        }

        // 渲染"我的团队"
        function renderMyTeam(container) {
            if (myAgents.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 64px; margin-bottom: 20px;">👥</div>
                        <h3 style="color: var(--text-primary); margin-bottom: 12px;">还没有雇佣员工</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 24px;">
                            前往招聘大厅，开始组建你的AI团队
                        </p>
                        <button class="hire-btn" onclick="switchAgentTab('hire')">
                            去招聘 →
                        </button>
                    </div>
                `;
                return;
            }

            const totalCost = myAgents.reduce((sum, a) => sum + a.salary, 0);

            let html = `
                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 8px;">团队概况</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 12px; opacity: 0.9;">团队规模</div>
                            <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${myAgents.length}</div>
                            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">名员工</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 12px; opacity: 0.9;">月度成本</div>
                            <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">¥${(totalCost/1000).toFixed(1)}k</div>
                            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">虚拟货币</div>
                        </div>
                        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 20px; border-radius: 12px;">
                            <div style="font-size: 12px; opacity: 0.9;">完成任务</div>
                            <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${myAgents.reduce((sum, a) => sum + a.tasksCompleted, 0)}</div>
                            <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">个任务</div>
                        </div>
                    </div>
                </div>

                <h3 style="margin-bottom: 16px;">员工列表</h3>
            `;

            myAgents.forEach(agent => {
                const statusColor = agent.status === 'working' ? '#fbbf24' : '#10b981';
                const statusText = agent.status === 'working' ? '工作中' : '空闲';

                html += `
                    <div class="agent-card">
                        <div style="display: flex; align-items: start; gap: 16px;">
                            <div class="agent-avatar-large">${getAgentIconSvg(agent.emoji || agent.name, 36, 'agent-avatar-icon')}</div>
                            <div style="flex: 1;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <h4 style="margin: 0; font-size: 18px;">${agent.nickname}</h4>
                                    <span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                        ${statusText}
                                    </span>
                                    <span style="background: #e5e7eb; color: #6b7280; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                                        ${agent.level === 'expert' ? '专家' : agent.level === 'senior' ? '资深' : agent.level === 'mid' ? '中级' : '初级'}
                                    </span>
                                </div>
                                <p style="color: var(--text-secondary); font-size: 14px; margin: 0 0 12px 0;">${agent.desc}</p>
                                <div style="margin-bottom: 12px;">
                                    ${agent.skills.map(skill => `<span class="agent-skill-tag">${skill}</span>`).join('')}
                                </div>
                                <div style="display: flex; align-items: center; gap: 16px; font-size: 13px; color: var(--text-secondary);">
                                    <span>💰 月薪: ¥${agent.salary}</span>
                                    <span>✅ 完成任务: ${agent.tasksCompleted}</span>
                                    <span>📊 绩效: ${agent.performance}分</span>
                                </div>
                            </div>
                            <div>
                                <button class="assign-task-btn" onclick="assignTaskToAgent('${agent.id}')">
                                    分配任务
                                </button>
                                <button class="fire-btn" onclick="fireAgent('${agent.id}')">
                                    解雇
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            container.innerHTML = html;
        }

        // 渲染招聘大厅
        function renderHireHall(container) {
            let html = `
                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 8px;">招聘大厅</h3>
                    <p style="color: var(--text-secondary); font-size: 14px;">
                        选择适合的AI员工加入你的团队
                    </p>
                </div>
            `;

            // 按类别分组
            const categories = {
                '产品与设计': ['product-manager', 'designer'],
                '技术开发': ['frontend-dev', 'backend-dev'],
                '运营与营销': ['marketing', 'operations'],
                '商务与销售': ['sales', 'customer-service'],
                '财务与法务': ['accountant', 'legal'],
                '战略与分析': ['consultant', 'data-analyst']
            };

            Object.entries(categories).forEach(([category, types]) => {
                html += `<h4 style="margin: 24px 0 16px 0; color: var(--text-primary);">${category}</h4>`;

                types.forEach(typeId => {
                    const agent = availableAgentTypes.find(a => a.id === typeId);
                    if (!agent) return;

                    // 检查是否已雇佣
                    const isHired = myAgents.some(a => a.type === agent.id);

                    html += `
                        <div class="agent-card" style="${isHired ? 'opacity: 0.6;' : ''}">
                            <div style="display: flex; align-items: start; gap: 16px;">
                                <div class="agent-avatar-large">${getAgentIconSvg(agent.emoji || agent.name, 36, 'agent-avatar-icon')}</div>
                                <div style="flex: 1;">
                                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                        <h4 style="margin: 0; font-size: 18px;">${agent.name}</h4>
                                        ${isHired ? '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">已雇佣</span>' : ''}
                                    </div>
                                    <p style="color: var(--text-secondary); font-size: 14px; margin: 0 0 12px 0;">${agent.desc}</p>
                                    <div style="margin-bottom: 12px;">
                                        ${agent.skills.map(skill => `<span class="agent-skill-tag">${skill}</span>`).join('')}
                                    </div>
                                    <div style="font-size: 14px;">
                                        <span style="color: var(--text-primary); font-weight: 600;">💰 月薪: ¥${agent.salary}</span>
                                        <span style="color: var(--text-secondary); margin-left: 16px;">
                                            级别: ${agent.level === 'expert' ? '专家' : agent.level === 'senior' ? '资深' : agent.level === 'mid' ? '中级' : '初级'}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    ${isHired
                                        ? '<button class="hire-btn" style="opacity: 0.5; cursor: not-allowed;" disabled>已雇佣</button>'
                                        : `<button class="hire-btn" onclick="hireAgent('${agent.id}', '${agent.name}')">雇佣</button>`
                                    }
                                </div>
                            </div>
                        </div>
                    `;
                });
            });

            container.innerHTML = html;
        }

        // 渲染任务管理
        function renderTasks(container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 64px; margin-bottom: 20px;">📋</div>
                    <h3 style="color: var(--text-primary); margin-bottom: 12px;">任务管理</h3>
                    <p style="color: var(--text-secondary);">
                        在"我的团队"中为员工分配具体任务
                    </p>
                </div>
            `;
        }

        // 渲染团队协同
        function renderCollaboration(container) {
            if (myAgents.length < 2) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 64px; margin-bottom: 20px;">🤝</div>
                        <h3 style="color: var(--text-primary); margin-bottom: 12px;">团队协同</h3>
                        <p style="color: var(--text-secondary);">
                            至少需要2名员工才能进行团队协同工作
                        </p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div style="margin-bottom: 24px;">
                    <h3 style="margin-bottom: 8px;">团队协同工作</h3>
                    <p style="color: var(--text-secondary); font-size: 14px;">
                        让多位员工共同完成复杂任务
                    </p>
                </div>

                <div class="agent-card">
                    <h4 style="margin-bottom: 16px;">选择参与人员</h4>
                    <div id="teamMemberSelection" style="margin-bottom: 20px;">
                        ${myAgents.map(agent => `
                            <label style="display: flex; align-items: center; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; cursor: pointer;">
                                <input type="checkbox" value="${agent.id}" style="margin-right: 12px;">
                                <span class="agent-inline-icon">${getAgentIconSvg(agent.emoji || agent.name, 20, 'agent-inline-icon')}</span>
                                <span style="flex: 1;">${agent.nickname} (${agent.name})</span>
                            </label>
                        `).join('')}
                    </div>

                    <h4 style="margin-bottom: 12px;">协同任务描述</h4>
                    <textarea id="teamTask"
                              style="width: 100%; height: 120px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical;"
                              placeholder="描述需要团队协作完成的任务，例如：设计一个完整的用户增长方案"></textarea>

                    <button class="hire-btn" style="margin-top: 16px; width: 100%;" onclick="startTeamCollaboration()">
                        🚀 开始协同工作
                    </button>
                </div>

                <div id="collaborationResult" style="margin-top: 24px;"></div>
            `;
        }

        // 雇佣Agent
        async function hireAgent(agentType, agentName) {
            try {
                const response = await fetch(`${state.settings.apiUrl}/api/agents/hire`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: USER_ID,
                        agentType: agentType
                    })
                });

                if (!response.ok) {
                    throw new Error('雇佣失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || '雇佣失败');
                }

                alert(`✅ 成功雇佣 ${agentName}！`);

                // 重新加载数据
                await loadMyAgents();
                updateAgentTeamSummary();

                // 刷新当前视图
                renderHireHall(document.getElementById('agentContent'));

            } catch (error) {
                alert(`❌ 雇佣失败: ${error.message}`);
            }
        }

        // 解雇Agent
        async function fireAgent(agentId) {
            const agent = myAgents.find(a => a.id === agentId);
            if (!agent) return;

            if (!confirm(`确定要解雇 ${agent.nickname} 吗？`)) {
                return;
            }

            try {
                const response = await fetch(`${state.settings.apiUrl}/api/agents/${USER_ID}/${agentId}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('解雇失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || '解雇失败');
                }

                alert(`✅ 已解雇 ${agent.nickname}`);

                // 重新加载数据
                await loadMyAgents();
                updateAgentTeamSummary();

                // 刷新当前视图
                renderMyTeam(document.getElementById('agentContent'));

            } catch (error) {
                alert(`❌ 解雇失败: ${error.message}`);
            }
        }

        // 分配任务给Agent
        async function assignTaskToAgent(agentId) {
            const agent = myAgents.find(a => a.id === agentId);
            if (!agent) return;

            const task = prompt(`请输入要分配给 ${agent.nickname} 的任务：\n\n例如：分析竞品的优势和劣势`);
            if (!task || task.trim() === '') {
                return;
            }

            try {
                alert(`${agent.nickname} 开始工作中，请稍候...`);

                const response = await fetch(`${state.settings.apiUrl}/api/agents/assign-task`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: USER_ID,
                        agentId: agentId,
                        task: task,
                        context: state.userData.idea || ''
                    })
                });

                if (!response.ok) {
                    throw new Error('任务分配失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || '任务分配失败');
                }

                // 显示结果
                const taskResult = result.data;
                showTaskResult(taskResult);

                // 重新加载团队数据
                await loadMyAgents();

            } catch (error) {
                alert(`❌ 任务分配失败: ${error.message}`);
            }
        }

        // 显示任务结果
        function showTaskResult(taskResult) {
            const modalHTML = `
                <div class="modal active" id="taskResultModal">
                    <div class="modal-content" style="max-width: 700px;">
                        <div class="modal-header">
                            <h2>📋 任务完成报告</h2>
                            <button class="close-btn" onclick="closeTaskResult()">×</button>
                        </div>
                        <div class="modal-body">
                            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                                    <span style="font-size: 32px;">${myAgents.find(a => a.id === taskResult.agentId)?.emoji}</span>
                                    <div>
                                        <div style="font-weight: 600;">${taskResult.agentName}</div>
                                        <div style="font-size: 12px; color: var(--text-secondary);">
                                            完成时间: ${new Date(taskResult.completedAt).toLocaleString('zh-CN')}
                                        </div>
                                    </div>
                                </div>
                                <div style="font-size: 14px; color: var(--text-secondary);">
                                    <strong>任务：</strong>${taskResult.task}
                                </div>
                            </div>

                            <div style="background: white; padding: 20px; border: 1px solid var(--border); border-radius: 8px; line-height: 1.8; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">
                                ${taskResult.result}
                            </div>

                            <div style="margin-top: 16px; text-align: right;">
                                <button class="hire-btn" onclick="copyToClipboard(\`${taskResult.result.replace(/`/g, '\\`')}\`)">
                                    📋 复制结果
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 移除旧的模态框
            const oldModal = document.getElementById('taskResultModal');
            if (oldModal) oldModal.remove();

            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        // 关闭任务结果
        function closeTaskResult() {
            const modal = document.getElementById('taskResultModal');
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        }

        // 开始团队协同
        async function startTeamCollaboration() {
            const selectedCheckboxes = document.querySelectorAll('#teamMemberSelection input[type="checkbox"]:checked');
            const task = document.getElementById('teamTask').value.trim();

            if (selectedCheckboxes.length < 2) {
                alert('❌ 请至少选择2名员工');
                return;
            }

            if (!task) {
                alert('❌ 请输入任务描述');
                return;
            }

            const agentIds = Array.from(selectedCheckboxes).map(cb => cb.value);

            try {
                alert('🤝 团队开始协同工作，请稍候...');

                const response = await fetch(`${state.settings.apiUrl}/api/agents/team-collaboration`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: USER_ID,
                        agentIds: agentIds,
                        task: task,
                        context: state.userData.idea || ''
                    })
                });

                if (!response.ok) {
                    throw new Error('团队协同失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || '团队协同失败');
                }

                // 显示协同结果
                const collabResult = result.data;
                const resultDiv = document.getElementById('collaborationResult');

                resultDiv.innerHTML = `
                    <div class="agent-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                        <h3 style="margin-bottom: 16px;">✅ 团队协同完成</h3>
                        <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                            <div style="font-size: 13px; margin-bottom: 8px;">
                                参与成员: ${collabResult.teamMembers.map(m => m.name).join('、')}
                            </div>
                            <div style="font-size: 13px;">
                                完成时间: ${new Date(collabResult.completedAt).toLocaleString('zh-CN')}
                            </div>
                        </div>
                        <div style="background: white; color: var(--text-primary); padding: 20px; border-radius: 8px; line-height: 1.8; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">
                            ${collabResult.result}
                        </div>
                        <button class="hire-btn" style="background: white; color: var(--primary); margin-top: 16px;"
                                onclick="copyToClipboard(\`${collabResult.result.replace(/`/g, '\\`')}\`)">
                            📋 复制结果
                        </button>
                    </div>
                `;

                // 重新加载团队数据
                await loadMyAgents();

            } catch (error) {
                alert(`❌ 团队协同失败: ${error.message}`);
            }
        }

        // 页面加载时初始化Agent系统
        window.addEventListener('load', () => {
            initAgentSystem();
        });

        // 设置相关
        function showSettings() {
            document.getElementById('settingsModal').classList.add('active');
        }

        function closeSettings() {
            if (window.modalManager && window.modalManager.isOpen('settingsModal')) {
                window.modalManager.close('settingsModal');
            } else {
                document.getElementById('settingsModal').classList.remove('active');
            }
        }

        // 底部上滑设置面板（移动端）
        function openBottomSettings() {
            const sheet = document.getElementById('bottomSettingsSheet');
            sheet.classList.add('active');
            // 防止背景滚动
            document.body.style.overflow = 'hidden';
        }

        function closeBottomSettings() {
            if (window.modalManager && window.modalManager.isOpen('bottomSettingsSheet')) {
                window.modalManager.close('bottomSettingsSheet');
            } else {
                const sheet = document.getElementById('bottomSettingsSheet');
                sheet.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        // 侧边栏Tab切换
        function switchSidebarTab(tab) {
            // 更新Tab激活状态
            document.querySelectorAll('.sidebar-tab').forEach(t => {
                t.classList.remove('active');
            });
            document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

            if (window.projectManager) {
                window.projectManager.closeProjectPanel();
            }

            // 获取输入框元素
            const inputContainer = document.getElementById('inputContainer');

            // 切换视图
            if (tab === 'chats') {
                document.getElementById('chatsView').style.display = 'flex';
                document.getElementById('teamView').style.display = 'none';

                // 显示输入框
                if (inputContainer) inputContainer.style.display = 'block';

                // ⚠️ 关键修复：检查主内容区是否显示的是项目详情页
                const chatContainer = document.getElementById('chatContainer');
                const isShowingProjectDetail = chatContainer && chatContainer.querySelector('.project-overview');

                if (!chatContainer || isShowingProjectDetail) {
                    // 清除当前项目状态
                    state.currentProject = null;
                    // 恢复对话界面
                    restoreChatInterface();

                    // 恢复后，如果有当前对话就加载它
                    if (state.currentChat) {
                        loadChat(state.currentChat);
                    }
                } else {
                    // chatContainer存在且显示的是聊天内容，确保隐藏知识库面板
                    const knowledgePanel = document.getElementById('knowledgePanel');
                    if (knowledgePanel) knowledgePanel.style.display = 'none';
                    if (chatContainer) chatContainer.style.display = 'flex';
                }
            } else if (tab === 'team') {
                document.getElementById('chatsView').style.display = 'none';
                document.getElementById('teamView').style.display = 'flex';

                // 隐藏输入框
                if (inputContainer) inputContainer.style.display = 'none';

                // 加载团队空间内容
                loadTeamSpace();
            }
        }

        // 加载团队空间内容（项目管理）
        function loadTeamSpace() {
            const teamView = document.getElementById('teamView');
            
            // 检查projectManager是否已初始化
            if (!window.projectManager) {
                teamView.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--text-secondary);">
                        <p>项目管理器加载中...</p>
                    </div>
                `;
                return;
            }

            // 渲染项目列表
            window.projectManager.renderProjectList('projectListContainer');
        }

        // ==================== 项目管理功能 ====================

        // 初始化团队空间数据
        function initTeamSpace() {
            const saved = localStorage.getItem('thinkcraft_teamspace');
            if (saved) {
                state.teamSpace = JSON.parse(saved);
            } else {
                // 创建初始mock数据
                state.teamSpace = {
                    projects: [
                        {
                            id: 'project_001',
                            name: '智能健身APP项目',
                            icon: '🚀',
                            description: '基于AI的个性化健身指导应用',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            members: [],
                            assignedAgents: [],
                            linkedIdeas: [],
                            ideas: [],
                            tasks: [],
                            files: [],
                            status: 'active'
                        },
                        {
                            id: 'project_002',
                            name: '在线教育平台',
                            icon: '📚',
                            description: '互动式在线学习平台',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            members: [],
                            assignedAgents: [],
                            linkedIdeas: [],
                            ideas: [],
                            tasks: [],
                            files: [],
                            status: 'active'
                        },
                        {
                            id: 'project_003',
                            name: '社区电商平台',
                            icon: '🛒',
                            description: '基于社区的电商解决方案',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            members: [],
                            assignedAgents: [],
                            linkedIdeas: [],
                            ideas: [],
                            tasks: [],
                            files: [],
                            status: 'active'
                        }
                    ],
                    agents: [],
                    knowledge: []
                };
                // 保存初始数据
                saveTeamSpace();
            }
        }

        // 保存团队空间数据
        function saveTeamSpace() {
            localStorage.setItem('thinkcraft_teamspace', JSON.stringify(state.teamSpace));
        }

        // 创建新项目
        function createNewProject() {
            const projectName = prompt('请输入项目名称：');
            if (!projectName || !projectName.trim()) return;

            const project = {
                id: 'proj_' + Date.now(),
                name: projectName.trim(),
                icon: '📁',  // 默认图标
                description: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                members: [],         // 团队成员列表
                assignedAgents: [],  // 分配的员工ID列表
                linkedIdeas: [],     // 关联的创意ID列表（来自对话）
                ideas: [],           // 关联的创意列表
                tasks: [],           // 任务列表
                files: [],           // 文件列表
                status: 'active'     // active, archived
            };

            state.teamSpace.projects.unshift(project);
            saveTeamSpace();
            renderProjectList();

            // 自动打开新建的项目
            openProject(project.id);
        }

        // 打开项目详情
        function openProject(projectId) {
            const project = state.teamSpace.projects.find(p => p.id === projectId);
            if (!project) return;

            state.currentProject = projectId;
            renderProjectList();  // 更新侧边栏激活状态
            renderProjectDetail(project);  // 在主内容区显示项目详情
        }

        // 渲染项目详情页（主内容区）- 修复版本：不破坏DOM结构
        function renderProjectDetail(project) {
            // 确保显示chatContainer，隐藏knowledgePanel
            const chatContainer = document.getElementById('chatContainer');
            const knowledgePanel = document.getElementById('knowledgePanel');
            const inputContainer = document.getElementById('inputContainer');

            if (chatContainer) chatContainer.style.display = 'flex';
            if (knowledgePanel) knowledgePanel.style.display = 'none';
            if (inputContainer) inputContainer.style.display = 'none'; // 隐藏输入框

            const memberCount = project.assignedAgents.length;
            const ideaCount = project.linkedIdeas.length;

            // 获取员工市场数据
            const agentMarket = getAgentMarket();

            // 构建成员列表HTML
            let membersHTML = '';
            if (memberCount === 0) {
                membersHTML = '<div style="color: var(--text-tertiary); font-size: 13px;">尚未分配员工</div>';
            } else {
                membersHTML = project.assignedAgents.map(agentId => {
                    const agent = agentMarket.find(a => a.id === agentId);
                    if (!agent) return '';
                    return `
                        <div class="project-member-card">
                            <div class="member-avatar">${getAgentIconSvg(agent.avatar || agent.role || agent.name, 28, 'member-avatar-icon')}</div>
                            <div class="member-info">
                                <div class="member-name">${agent.name}</div>
                                <div class="member-role">${agent.role}</div>
                            </div>
                            <button class="icon-btn" onclick="removeAgentFromProject('${project.id}', '${agent.id}')" title="移除">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    `;
                }).join('');
            }

            // 构建创意列表HTML
            let ideasHTML = '';
            if (ideaCount === 0) {
                ideasHTML = '<div style="color: var(--text-tertiary); font-size: 13px;">尚未引入创意</div>';
            } else {
                ideasHTML = project.linkedIdeas.map(ideaId => {
                    const chat = state.chats.find(c => c.id === ideaId);
                    if (!chat) return '';
                    return `
                        <div class="project-idea-card" onclick="loadChatFromProject('${chat.id}')">
                            <div class="idea-icon">💡</div>
                            <div class="idea-info">
                                <div class="idea-title">${chat.title}</div>
                                <div class="idea-date">${new Date(chat.createdAt).toLocaleDateString('zh-CN')}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            // 找到或创建header
            let mainHeader = document.querySelector('.main-header');
            if (!mainHeader) {
                mainHeader = document.createElement('div');
                mainHeader.className = 'main-header';
                const mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.insertBefore(mainHeader, mainContent.firstChild);
                }
            }

            // 更新header内容
            mainHeader.innerHTML = `
                <button class="menu-toggle" onclick="toggleSidebar()">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                </button>
                <div class="main-title">📁 ${project.name}</div>
                <div class="header-actions">
                    <button class="icon-btn" onclick="showKnowledgeBase('project', '${project.id}')" title="项目知识库">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                        </svg>
                    </button>
                    <button class="icon-btn" onclick="editProjectInfo('${project.id}')" title="编辑项目">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button class="icon-btn" onclick="deleteProject('${project.id}')" title="删除项目" style="color: #ef4444;">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                    <button class="icon-btn desktop-only" onclick="showSettings()" title="设置">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </button>
                </div>
            `;

            // 更新chatContainer内容（保留其他元素不变）
            chatContainer.innerHTML = `
                <div class="project-detail-wrapper">
                    <!-- 项目概览卡片 -->
                    <div class="project-overview">
                    <div class="overview-card">
                        <div class="overview-label">团队成员</div>
                        <div class="overview-value">${memberCount}</div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-label">关联创意</div>
                        <div class="overview-value">${ideaCount}</div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-label">任务</div>
                        <div class="overview-value">${project.tasks.length}</div>
                    </div>
                </div>

                <!-- 团队成员 -->
                <div class="project-section">
                    <div class="project-section-header">
                        <h3>👥 团队成员</h3>
                        <button class="btn-secondary" onclick="window.currentProjectId='${project.id}'; window.currentProject=state.teamSpace.projects.find(p=>p.id==='${project.id}'); showAddMember()">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            添加成员
                        </button>
                    </div>
                    <div class="project-members-grid">
                        ${membersHTML}
                    </div>
                </div>

                <!-- 关联创意 -->
                <div class="project-section">
                    <div class="project-section-header">
                        <h3>💡 关联创意</h3>
                        <button class="btn-secondary" onclick="linkIdeaToProject('${project.id}')">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            引入创意
                        </button>
                    </div>
                    <div class="project-ideas-grid">
                        ${ideasHTML}
                    </div>
                </div>

                <!-- 协同任务 -->
                <div class="project-section">
                    <div class="project-section-header">
                        <h3>🤖 AI协同任务</h3>
                        <button class="btn-primary" onclick="startProjectTeamCollaboration('${project.id}')">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                            </svg>
                            启动协同
                        </button>
                    </div>
                    <div class="collaboration-placeholder">
                        <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <div>添加团队成员和创意后，即可启动AI协同</div>
                    </div>
                </div>
                </div><!-- .project-detail-wrapper -->
            `;
        }

        // ==================== 员工市场功能 ====================

        // 可雇佣员工列表（模拟数据）
        const AVAILABLE_AGENTS = [
            {
                id: 'agent_001',
                name: 'Alex 产品经理',
                avatar: '👨‍💼',
                role: '产品经理',
                description: '擅长产品规划、需求分析和用户研究，帮助你将创意转化为可落地的产品方案',
                skills: ['需求分析', 'PRD撰写', '用户研究', '竞品分析']
            },
            {
                id: 'agent_002',
                name: 'Maya 设计师',
                avatar: '🎨',
                role: 'UI/UX设计师',
                description: '专注用户体验设计和视觉设计，为你的产品打造精美的用户界面',
                skills: ['UI设计', 'UX设计', '交互设计', '原型设计']
            },
            {
                id: 'agent_003',
                name: 'Leo 全栈工程师',
                avatar: '👨‍💻',
                role: '全栈工程师',
                description: '精通前后端开发，能够快速实现你的产品原型和MVP',
                skills: ['前端开发', '后端开发', '数据库', 'API设计']
            },
            {
                id: 'agent_004',
                name: 'Sophia 运营专家',
                avatar: '📊',
                role: '运营专家',
                description: '擅长增长黑客、用户运营和数据分析，助力产品快速增长',
                skills: ['增长黑客', '数据分析', '内容营销', '用户运营']
            },
            {
                id: 'agent_005',
                name: 'David 市场顾问',
                avatar: '📈',
                role: '市场顾问',
                description: '专注市场调研、品牌策略和商业模式设计',
                skills: ['市场调研', '品牌策划', '商业模式', '营销策略']
            },
            {
                id: 'agent_006',
                name: 'Emma 文案专家',
                avatar: '✍️',
                role: '文案专家',
                description: '精通文案策划、内容创作，帮助你打造有影响力的品牌故事',
                skills: ['文案策划', '内容创作', '品牌故事', 'SEO优化']
            }
        ];

        // 显示员工市场
        function showAgentMarket() {
            document.getElementById('agentMarketModal').classList.add('active');
            renderAgentMarket();
        }

        // 关闭员工市场
        function closeAgentMarket() {
            if (window.modalManager && window.modalManager.isOpen('agentMarketModal')) {
                window.modalManager.close('agentMarketModal');
            } else {
                document.getElementById('agentMarketModal').classList.remove('active');
            }
        }

        // 切换市场Tab
        function switchMarketTab(tab) {
            // 更新Tab激活状态
            document.querySelectorAll('#agentMarketModal .report-tab').forEach(t => {
                t.classList.remove('active');
            });
            event.target.classList.add('active');

            // 切换内容
            if (tab === 'market') {
                document.getElementById('marketTab').style.display = 'block';
                document.getElementById('hiredTab').style.display = 'none';
                renderAgentMarket();
            } else if (tab === 'hired') {
                document.getElementById('marketTab').style.display = 'none';
                document.getElementById('hiredTab').style.display = 'block';
                renderHiredAgents();
            }
        }

        // 渲染员工市场
        function renderAgentMarket() {
            const grid = document.getElementById('agentMarketGrid');
            const hiredIds = state.teamSpace.agents.map(a => a.id);

            const agentsHTML = AVAILABLE_AGENTS.map(agent => {
                const isHired = hiredIds.includes(agent.id);
                const skillsHTML = agent.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');

                return `
                    <div class="agent-card ${isHired ? 'hired' : ''}">
                        <div class="agent-card-header">
                        <div class="agent-card-avatar">${getAgentIconSvg(agent.avatar || agent.role || agent.name, 32, 'agent-card-icon')}</div>
                            <div class="agent-card-info">
                                <div class="agent-card-name">${agent.name}</div>
                                <div class="agent-card-role">${agent.role}</div>
                            </div>
                        </div>
                        <div class="agent-card-desc">${agent.description}</div>
                        <div class="agent-card-skills">${skillsHTML}</div>
                        <div class="agent-card-actions">
                            <button class="hire-btn ${isHired ? 'hired' : ''}"
                                    onclick="hireTeamAgent('${agent.id}')"
                                    ${isHired ? 'disabled' : ''}>
                                ${isHired ? '✓ 已雇佣' : '雇佣'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            grid.innerHTML = agentsHTML;
        }

        // 渲染已雇佣员工
        function renderHiredAgents() {
            const grid = document.getElementById('hiredAgentsGrid');
            const hiredAgents = state.teamSpace.agents;

            if (hiredAgents.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; color: var(--text-tertiary);">
                        <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 16px; opacity: 0.5;">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <div style="font-size: 15px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                            还没有雇佣员工
                        </div>
                        <div style="font-size: 13px;">
                            去"可雇佣"标签页雇佣你的第一个数字员工
                        </div>
                    </div>
                `;
                return;
            }

            const agentsHTML = hiredAgents.map(agent => {
                const skillsHTML = agent.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');

                return `
                    <div class="agent-card hired">
                        <div class="agent-card-header">
                        <div class="agent-card-avatar">${getAgentIconSvg(agent.avatar || agent.role || agent.name, 32, 'agent-card-icon')}</div>
                            <div class="agent-card-info">
                                <div class="agent-card-name">${agent.name}</div>
                                <div class="agent-card-role">${agent.role}</div>
                            </div>
                        </div>
                        <div class="agent-card-desc">${agent.description}</div>
                        <div class="agent-card-skills">${skillsHTML}</div>
                        <div class="agent-card-actions">
                            <button class="btn-secondary" onclick="fireTeamAgent('${agent.id}')">
                                解雇
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            grid.innerHTML = agentsHTML;
        }

        // 雇佣员工
        function hireTeamAgent(agentId) {
            const agent = AVAILABLE_AGENTS.find(a => a.id === agentId);
            if (!agent) return;

            // 检查是否已经雇佣
            if (state.teamSpace.agents.find(a => a.id === agentId)) {
                alert('该员工已经被雇佣');
                return;
            }

            // 添加到已雇佣列表
            state.teamSpace.agents.push({
                ...agent,
                hiredAt: new Date().toISOString()
            });

            saveTeamSpace();
            renderAgentMarket();
            alert(`✅ 成功雇佣 ${agent.name}`);
        }

        // 解雇员工（团队空间）
        function fireTeamAgent(agentId) {
            const agent = state.teamSpace.agents.find(a => a.id === agentId);
            if (!agent) return;

            if (!confirm(`确定要解雇 ${agent.name} 吗？`)) return;

            // 从所有项目中移除该员工
            state.teamSpace.projects.forEach(project => {
                project.assignedAgents = project.assignedAgents.filter(id => id !== agentId);
            });

            // 从已雇佣列表中移除
            state.teamSpace.agents = state.teamSpace.agents.filter(a => a.id !== agentId);

            saveTeamSpace();
            renderHiredAgents();
            renderProjectList();  // 刷新项目列表
            alert(`${agent.name} 已被解雇`);
        }

        // 分配员工到项目
        function assignAgentToProject(projectId) {
            const project = state.teamSpace.projects.find(p => p.id === projectId);
            if (!project) return;

            const availableAgents = state.teamSpace.agents.filter(
                agent => !project.assignedAgents.includes(agent.id)
            );

            if (availableAgents.length === 0) {
                alert('没有可分配的员工，请先去雇佣员工');
                showAgentMarket();
                return;
            }

            // 简单的选择界面（实际项目中可以用更好的UI）
            const agentList = availableAgents.map((agent, index) =>
                `${index + 1}. ${agent.name} (${agent.role})`
            ).join('\n');

            const selection = prompt(`选择要添加的员工（输入序号）：\n\n${agentList}`);
            if (!selection) return;

            const index = parseInt(selection) - 1;
            if (index < 0 || index >= availableAgents.length) {
                alert('无效的选择');
                return;
            }

            const selectedAgent = availableAgents[index];
            project.assignedAgents.push(selectedAgent.id);
            project.updatedAt = new Date().toISOString();

            saveTeamSpace();
            renderProjectDetail(project);
            alert(`✅ 已将 ${selectedAgent.name} 添加到项目`);
        }

        // 从项目移除员工
        function removeAgentFromProject(projectId, agentId) {
            const project = state.teamSpace.projects.find(p => p.id === projectId);
            if (!project) return;

            const agent = state.teamSpace.agents.find(a => a.id === agentId);
            if (!confirm(`确定要将 ${agent.name} 从项目中移除吗？`)) return;

            project.assignedAgents = project.assignedAgents.filter(id => id !== agentId);
            project.updatedAt = new Date().toISOString();

            saveTeamSpace();
            renderProjectDetail(project);
        }

        // 引入创意到项目
        function linkIdeaToProject(projectId) {
            const project = state.teamSpace.projects.find(p => p.id === projectId);
            if (!project) return;

            // 检查是否已经引入创意（每个项目仅可引入一个创意）
            if (project.linkedIdeas && project.linkedIdeas.length > 0) {
                const linkedChat = state.chats.find(chat => chat.id === project.linkedIdeas[0]);
                const ideaTitle = linkedChat ? linkedChat.title : '未知创意';
                alert(`该项目已经引入创意"${ideaTitle}"，每个项目仅可引入一个创意。\n\n如需更换创意，请先移除当前创意。`);
                return;
            }

            // 找到已完成分析的对话
            const availableChats = state.chats.filter(
                chat => !project.linkedIdeas.includes(chat.id) &&
                       chat.messages && chat.messages.length > 0
            );

            if (availableChats.length === 0) {
                alert('没有可引入的创意，请先在对话中完成创意分析');
                switchSidebarTab('chats');
                return;
            }

            const chatList = availableChats.map((chat, index) =>
                `${index + 1}. ${chat.title}`
            ).join('\n');

            const selection = prompt(`选择要引入的创意（输入序号）：\n\n${chatList}`);
            if (!selection) return;

            const index = parseInt(selection) - 1;
            if (index < 0 || index >= availableChats.length) {
                alert('无效的选择');
                return;
            }

            const selectedChat = availableChats[index];
            project.linkedIdeas.push(selectedChat.id);
            project.updatedAt = new Date().toISOString();

            saveTeamSpace();
            renderProjectDetail(project);
            alert(`✅ 已将创意"${selectedChat.title}"引入项目`);
        }

        // 编辑项目信息
        function editProjectInfo(projectId) {
            const project = state.teamSpace.projects.find(p => p.id === projectId);
            if (!project) return;

            const newName = prompt('修改项目名称：', project.name);
            if (!newName || !newName.trim()) return;

            project.name = newName.trim();
            project.updatedAt = new Date().toISOString();

            saveTeamSpace();
            renderProjectList();
            renderProjectDetail(project);
        }

        // 删除项目
        function deleteProject(projectId) {
            const project = state.teamSpace.projects.find(p => p.id === projectId);
            if (!project) return;

            const confirmMsg = `确定要删除项目"${project.name}"吗？\n\n此操作不可恢复，项目中的所有数据都将被删除。`;
            if (!confirm(confirmMsg)) return;

            // 从项目列表中移除
            const index = state.teamSpace.projects.findIndex(p => p.id === projectId);
            if (index > -1) {
                state.teamSpace.projects.splice(index, 1);
                saveTeamSpace();

                // 返回项目列表视图
                renderProjectList();

                // 清空主内容区，显示空状态
                const chatContainer = document.getElementById('chatContainer');
                chatContainer.innerHTML = `
                    <div class="empty-state">
                        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <div class="empty-title">项目已删除</div>
                        <div class="empty-subtitle">选择其他项目或创建新项目</div>
                    </div>
                `;

                alert('✅ 项目已删除');
            }
        }

        // 知识库
        // ========== 知识库核心函数 ==========

        async function showKnowledgeBase(mode = 'global', projectId = null) {
            // mode: 'global' | 'project'

            if (window.projectManager) {
                window.projectManager.closeProjectPanel();
            }

            // 设置视图模式
            if (mode === 'project' && projectId) {
                stateManager.setKnowledgeViewMode('project');
                stateManager.setKnowledgeProjectFilter(projectId);
            } else {
                stateManager.setKnowledgeViewMode('global');
                stateManager.state.knowledge.currentProjectId = null;
            }

            // 加载知识数据
            await loadKnowledgeData(mode, projectId);

            // 隐藏聊天容器和输入框，显示知识库面板
            const chatContainer = document.getElementById('chatContainer');
            const knowledgePanel = document.getElementById('knowledgePanel');
            const inputContainer = document.getElementById('inputContainer');

            if (!knowledgePanel) {
                return;
            }

            if (chatContainer) chatContainer.style.display = 'none';
            knowledgePanel.style.display = 'flex';
            if (inputContainer) inputContainer.style.display = 'none';
        }

        function closeKnowledgePanel() {
            // 隐藏知识库面板，显示聊天容器和输入框
            document.getElementById('knowledgePanel').style.display = 'none';
            document.getElementById('chatContainer').style.display = 'flex';
            const inputContainer = document.getElementById('inputContainer');
            if (inputContainer) inputContainer.style.display = 'block';
            }

        function closeKnowledgeBase() {
            const modal = document.getElementById('knowledgeModal');
            if (modal) {
                modal.style.display = 'none';
            }
            }

        async function loadKnowledgeData(mode, projectId) {
            let items = [];

            try {
                if (mode === 'project' && projectId) {
                    // 加载项目知识
                    items = await storageManager.getKnowledgeByProject(projectId);
                    } else {
                    // 加载全局+所有项目知识
                    items = await storageManager.getAllKnowledge();
                    }

                // 更新状态
                stateManager.loadKnowledgeItems(items);

                // 渲染UI
                renderKnowledgeList();
                renderKnowledgeOrgTree();
            } catch (error) {
                alert('加载知识库失败: ' + error.message);
            }
        }

        function updateKnowledgeBreadcrumb(mode, projectId) {
            const breadcrumb = document.getElementById('knowledgeBreadcrumb');

            if (mode === 'project' && projectId) {
                const projectName = getProjectName(projectId);
                breadcrumb.innerHTML = `<span>📁 ${projectName} · 知识库</span>`;
            } else {
                breadcrumb.innerHTML = `<span>📚 全局知识库</span>`;
            }
        }

        function getProjectName(projectId) {
            const projectNames = {
                'project_001': '智能健身APP项目',
                'project_002': '在线教育平台',
                'project_003': '智能家居控制系统'
            };
            return projectNames[projectId] || '未知项目';
        }

        function switchKnowledgeOrg(orgType) {
            // orgType: 'byProject' | 'byType' | 'byTimeline' | 'byTags'
            // 更新状态
            stateManager.setKnowledgeOrganization(orgType);

            // 更新按钮状态
            const buttons = document.querySelectorAll('.knowledge-org-switcher button');
            buttons.forEach(btn => {
                if (btn.dataset.org === orgType) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // 重新渲染组织树
            renderKnowledgeOrgTree();
        }

        function onKnowledgeSearch(keyword) {
            stateManager.setKnowledgeSearchKeyword(keyword);
            renderKnowledgeList();
        }

        function onKnowledgeTypeFilter(type) {
            stateManager.setKnowledgeTypeFilter(type);
            renderKnowledgeList();
        }

        function renderKnowledgeList() {
            const items = stateManager.getFilteredKnowledgeItems();
            const listContainer = document.getElementById('knowledgeList');
            const emptyState = document.getElementById('knowledgeEmpty');

            if (items.length === 0) {
                listContainer.style.display = 'none';
                emptyState.style.display = 'flex';
                return;
            }

            listContainer.style.display = 'grid';
            emptyState.style.display = 'none';

            listContainer.innerHTML = items.map(item => `
                <div class="knowledge-card" onclick="viewKnowledge('${item.id}')">
                    <div class="knowledge-card-header">
                        <div class="knowledge-icon" style="background: ${getTypeColor(item.type)}">
                            ${item.icon || '📘'}
                        </div>
                        <div class="knowledge-card-title">${item.title || '未命名内容'}</div>
                    </div>
                    <div class="knowledge-card-content">
                        <p>${(item.content || '').substring(0, 80)}${(item.content || '').length > 80 ? '...' : ''}</p>
                        <div class="knowledge-card-meta">
                            <span class="badge" style="background: ${getTypeBadgeColor(item.type)}; color: ${getTypeBadgeTextColor(item.type)};">${getTypeLabel(item.type)}</span>
                            ${item.scope === 'global' ? '<span class="badge" style="background: #fef3c7; color: #92400e;">全局</span>' : ''}
                            <span class="badge time">${formatTime(item.createdAt)}</span>
                        </div>
                        ${(item.tags || []).length > 0 ? `
                            <div class="knowledge-tags">
                                ${(item.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        function renderKnowledgeOrgTree() {
            const orgType = stateManager.state.knowledge.organizationType;
            const items = stateManager.state.knowledge.items;
            const container = document.getElementById('knowledgeOrgTree');

            // 更新组织切换器按钮状态
            document.querySelectorAll('.knowledge-org-switcher button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-org') === orgType) {
                    btn.classList.add('active');
                }
            });

            switch (orgType) {
                case 'byProject':
                    renderByProject(container, items);
                    break;
                case 'byType':
                    renderByType(container, items);
                    break;
                case 'byTimeline':
                    renderByTimeline(container, items);
                    break;
                case 'byTags':
                    renderByTags(container, items);
                    break;
            }
        }

        function renderByProject(container, items) {
            const grouped = groupBy(items, item => item.projectId || 'global');
            const html = [];

            // 全局知识
            if (grouped.global && grouped.global.length > 0) {
                html.push(`
                    <div class="org-group">
                        <div class="org-group-header" onclick="toggleOrgGroup('global')">
                            <span>🌍 全局知识库 (${grouped.global.length})</span>
                        </div>
                        <div class="org-group-content" id="org-global">
                            ${grouped.global.map(item => `
                                <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                    ${item.icon} ${item.title}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `);
            }

            // 项目知识
            Object.keys(grouped).forEach(projectId => {
                if (projectId === 'global') return;
                const projectName = getProjectName(projectId);
                const projectItems = grouped[projectId];

                html.push(`
                    <div class="org-group">
                        <div class="org-group-header" onclick="toggleOrgGroup('${projectId}')">
                            <span>📁 ${projectName} (${projectItems.length})</span>
                        </div>
                        <div class="org-group-content" id="org-${projectId}">
                            ${projectItems.map(item => `
                                <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                    ${item.icon} ${item.title}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `);
            });

            container.innerHTML = html.join('');
        }

        function renderByType(container, items) {
            const grouped = groupBy(items, 'type');
            const typeLabels = {
                'prd': { label: 'PRD文档', icon: '📄' },
                'tech': { label: '技术方案', icon: '🤖' },
                'analysis': { label: '市场分析', icon: '📊' },
                'research': { label: '用户调研', icon: '👥' },
                'design': { label: '设计稿', icon: '🎨' },
                'other': { label: '其他', icon: '📋' }
            };

            const html = [];
            Object.keys(grouped).forEach(type => {
                const typeInfo = typeLabels[type] || { label: '其他', icon: '📋' };
                const typeItems = grouped[type];

                html.push(`
                    <div class="org-group">
                        <div class="org-group-header" onclick="toggleOrgGroup('type-${type}')">
                            <span>${typeInfo.icon} ${typeInfo.label} (${typeItems.length})</span>
                        </div>
                        <div class="org-group-content" id="org-type-${type}">
                            ${typeItems.map(item => `
                                <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                    ${item.icon} ${item.title}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `);
            });

            container.innerHTML = html.join('');
        }

        function renderByTimeline(container, items) {
            const now = Date.now();
            const day = 24 * 60 * 60 * 1000;

            const timelines = {
                today: { label: '今天', items: [] },
                week: { label: '本周', items: [] },
                month: { label: '本月', items: [] },
                older: { label: '更早', items: [] }
            };

            items.forEach(item => {
                const diff = now - item.createdAt;
                if (diff < day) {
                    timelines.today.items.push(item);
                } else if (diff < 7 * day) {
                    timelines.week.items.push(item);
                } else if (diff < 30 * day) {
                    timelines.month.items.push(item);
                } else {
                    timelines.older.items.push(item);
                }
            });

            const html = [];
            Object.keys(timelines).forEach(key => {
                const timeline = timelines[key];
                if (timeline.items.length === 0) return;

                html.push(`
                    <div class="org-group">
                        <div class="org-group-header" onclick="toggleOrgGroup('time-${key}')">
                            <span>📅 ${timeline.label} (${timeline.items.length})</span>
                        </div>
                        <div class="org-group-content" id="org-time-${key}">
                            ${timeline.items.map(item => `
                                <div class="org-item" onclick="selectKnowledge('${item.id}')">
                                    ${item.icon} ${item.title}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `);
            });

            container.innerHTML = html.join('');
        }

        function renderByTags(container, items) {
            const stats = stateManager.state.knowledge.stats;
            const tags = Object.keys(stats.byTag).sort((a, b) => stats.byTag[b] - stats.byTag[a]);

            if (tags.length === 0) {
                container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">暂无标签</div>';
                return;
            }

            const html = tags.map(tag => {
                const count = stats.byTag[tag];
                return `
                    <div class="org-group">
                        <div class="org-group-header" onclick="filterByTag('${tag}')">
                            <span>🏷️ ${tag} (${count})</span>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = html;
        }

        function toggleOrgGroup(groupId) {
            const content = document.getElementById(`org-${groupId}`);
            if (content) {
                const isCollapsed = content.classList.contains('collapsed');
                if (isCollapsed) {
                    content.classList.remove('collapsed');
                } else {
                    content.classList.add('collapsed');
                }
            }
        }

        function selectKnowledge(id) {
            viewKnowledge(id);
        }

        function filterByTag(tag) {
            stateManager.setKnowledgeTagsFilter([tag]);
            renderKnowledgeList();
        }

        function switchKnowledgeOrganization(type) {
            stateManager.setKnowledgeOrganization(type);
            renderKnowledgeOrgTree();
        }

        async function viewKnowledge(id) {
            const item = await storageManager.getKnowledge(id);
            if (!item) {
                alert('知识不存在');
                return;
            }

            // 增加浏览次数
            item.viewCount = (item.viewCount || 0) + 1;
            await storageManager.saveKnowledge(item);

            // 创建知识详情弹窗
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header">
                        <div class="modal-title">${item.icon} ${item.title}</div>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 24px;">
                        <div style="margin-bottom: 16px;">
                            <span class="badge" style="background: ${getTypeBadgeColor(item.type)}; color: ${getTypeBadgeTextColor(item.type)}; margin-right: 8px;">${getTypeLabel(item.type)}</span>
                            ${item.scope === 'global' ? '<span class="badge" style="background: #fef3c7; color: #92400e; margin-right: 8px;">全局</span>' : ''}
                            <span class="badge time" style="background: #f3f4f6; color: #6b7280;">浏览 ${item.viewCount} 次</span>
                        </div>
                        ${item.tags.length > 0 ? `
                            <div style="margin-bottom: 16px;">
                                ${item.tags.map(tag => `<span class="tag" style="display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 12px; margin-right: 8px; font-size: 12px;">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        <div style="white-space: pre-wrap; line-height: 1.8; color: var(--text-secondary);">
                            ${item.content}
                        </div>
                        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--text-tertiary); font-size: 12px;">
                            <div>创建时间: ${formatTime(item.createdAt)}</div>
                            ${item.updatedAt ? `<div>更新时间: ${formatTime(item.updatedAt)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // 点击背景关闭
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        async function createKnowledge() {
            // 创建新建知识弹窗
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <div class="modal-title">✨ 新建知识</div>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 24px;">
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">标题</label>
                            <input type="text" id="knowledgeTitleInput" placeholder="输入知识标题..." style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px;">
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">类型</label>
                            <select id="knowledgeTypeInput" style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px;">
                                <option value="prd">产品需求文档 (PRD)</option>
                                <option value="tech">技术方案</option>
                                <option value="analysis">市场分析</option>
                                <option value="research">调研报告</option>
                                <option value="summary">会议纪要</option>
                                <option value="idea">创意想法</option>
                                <option value="other">其他</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">内容</label>
                            <textarea id="knowledgeContentInput" placeholder="输入知识内容..." style="width: 100%; min-height: 200px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; resize: vertical;"></textarea>
                        </div>
                        <div style="margin-bottom: 24px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 500;">标签 <span style="font-weight: normal; color: var(--text-tertiary); font-size: 12px;">(用逗号分隔)</span></label>
                            <input type="text" id="knowledgeTagsInput" placeholder="例如: 产品, 需求, v1.0" style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px;">
                        </div>
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            <button class="btn-secondary" onclick="this.closest('.modal').remove()">取消</button>
                            <button class="btn-primary" id="saveKnowledgeBtn" onclick="saveNewKnowledge()">保存</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // 聚焦标题输入框
            setTimeout(() => {
                document.getElementById('knowledgeTitleInput').focus();
            }, 100);

            // 点击背景关闭
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }

        async function saveNewKnowledge() {
            const title = document.getElementById('knowledgeTitleInput').value.trim();
            const type = document.getElementById('knowledgeTypeInput').value;
            const content = document.getElementById('knowledgeContentInput').value.trim();
            const tagsInput = document.getElementById('knowledgeTagsInput').value.trim();

            if (!title) {
                alert('请输入标题');
                return;
            }

            if (!content) {
                alert('请输入内容');
                return;
            }

            // 解析标签
            const tags = tagsInput ? tagsInput.split(/[,，]/).map(t => t.trim()).filter(t => t) : [];

            const currentProjectId = stateManager?.state?.knowledge?.currentProjectId
                || window.projectManager?.currentProjectId
                || window.appState?.currentProject?.id
                || state.currentProject
                || null;

            // 创建知识对象
            const knowledge = {
                id: Date.now().toString(),
                title: title,
                type: type,
                content: content,
                tags: tags,
                icon: getTypeIcon(type),
                scope: currentProjectId ? 'project' : 'global',
                projectId: currentProjectId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                viewCount: 0
            };

            // 保存到存储
            await storageManager.saveKnowledge(knowledge);

            if (stateManager?.addKnowledgeItem) {
                stateManager.addKnowledgeItem(knowledge);
            }

            // 关闭弹窗
            const modalToClose = document.getElementById('saveKnowledgeBtn')?.closest('.modal');
            if (modalToClose) {
                modalToClose.remove();
            }

            // 刷新知识列表
            if (typeof renderKnowledgeList === 'function') {
                renderKnowledgeList();
            }
            if (typeof renderKnowledgeOrgTree === 'function') {
                renderKnowledgeOrgTree();
            }
            if (window.projectManager?.currentProject) {
                window.projectManager.renderProjectKnowledgePanel(window.projectManager.currentProject);
            }

            // 提示成功
            alert('✅ 知识已保存');
        }

        function getTypeIcon(type) {
            const icons = {
                prd: '📋',
                tech: '⚙️',
                analysis: '📊',
                research: '🔍',
                summary: '📝',
                idea: '💡',
                other: '📄'
            };
            return icons[type] || '📄';
        }

        // 工具函数
        function groupBy(array, key) {
            return array.reduce((result, item) => {
                const groupKey = typeof key === 'function' ? key(item) : item[key];
                (result[groupKey] = result[groupKey] || []).push(item);
                return result;
            }, {});
        }

        function getTypeLabel(type) {
            const labels = {
                'prd': 'PRD',
                'tech': '技术',
                'analysis': '分析',
                'research': '调研',
                'design': '设计',
                'other': '其他'
            };
            return labels[type] || '未知';
        }

        function getTypeColor(type) {
            const colors = {
                'prd': '#3b82f6',
                'tech': '#10b981',
                'analysis': '#f59e0b',
                'research': '#8b5cf6',
                'design': '#ec4899',
                'other': '#6b7280'
            };
            return colors[type] || '#6b7280';
        }

        function getTypeBadgeColor(type) {
            const colors = {
                'prd': '#eff6ff',
                'tech': '#f0fdf4',
                'analysis': '#fef3c7',
                'research': '#f5f3ff',
                'design': '#fce7f3',
                'other': '#f3f4f6'
            };
            return colors[type] || '#f3f4f6';
        }

        function getTypeBadgeTextColor(type) {
            const colors = {
                'prd': '#1d4ed8',
                'tech': '#059669',
                'analysis': '#92400e',
                'research': '#6d28d9',
                'design': '#be185d',
                'other': '#374151'
            };
            return colors[type] || '#374151';
        }

        function formatTime(timestamp) {
            const now = Date.now();
            const diff = now - timestamp;
            const minute = 60 * 1000;
            const hour = 60 * minute;
            const day = 24 * hour;
            const week = 7 * day;

            if (diff < minute) return '刚刚';
            if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
            if (diff < day) return `${Math.floor(diff / hour)}小时前`;
            if (diff < week) return `${Math.floor(diff / day)}天前`;
            if (diff < 4 * week) return `${Math.floor(diff / week)}周前`;

            const date = new Date(timestamp);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }

        // 旧的tab切换函数（已废弃，保留以防兼容）
        function switchKnowledgeTab(tabName) {
            }

        // 知识库初始化和Mock数据迁移
        async function initKnowledgeBase() {
            try {
                // 检查是否已迁移
                const migrated = await storageManager.getSetting('knowledge_migrated');
                if (migrated) {
                    return;
                }

                // Mock数据
                const mockData = [
                    {
                        title: '智能健身APP产品需求文档',
                        content: '包含完整的PRD文档，包括用户画像、功能清单、技术架构等。目标用户为18-35岁的健身爱好者，通过AI动作识别技术提供个性化训练方案，支持iOS和Android平台。',
                        type: 'prd',
                        scope: 'project',
                        projectId: 'project_001',
                        tags: ['PRD', '产品', '健身'],
                        icon: '📄'
                    },
                    {
                        title: 'AI动作识别技术方案',
                        content: '基于TensorFlow的姿态识别技术实现方案和代码示例。采用MoveNet模型进行实时人体关键点检测，支持17个关键点识别，帧率达到30fps。',
                        type: 'tech',
                        scope: 'project',
                        projectId: 'project_001',
                        tags: ['技术', 'AI', 'TensorFlow'],
                        icon: '🤖'
                    },
                    {
                        title: '市场竞品分析报告',
                        content: 'Keep、FitTime等5款竞品的功能对比和用户评价分析。Keep用户量最大但内容同质化严重，FitTime社交功能突出，我们需要在AI个性化方面寻求差异化。',
                        type: 'analysis',
                        scope: 'project',
                        projectId: 'project_001',
                        tags: ['分析', '竞品', '市场'],
                        icon: '📊'
                    },
                    {
                        title: '用户调研报告',
                        content: '针对200名目标用户的问卷调研和深度访谈结果。78%用户希望有AI教练指导，65%愿意为个性化方案付费，平均可接受月费为68元。',
                        type: 'research',
                        scope: 'project',
                        projectId: 'project_001',
                        tags: ['调研', '用户', '数据'],
                        icon: '👥'
                    },
                    {
                        title: '产品设计最佳实践',
                        content: '跨项目沉淀的产品设计方法论和最佳实践。包含用户研究、需求分析、原型设计、可用性测试等完整流程，以及常见问题的解决方案。',
                        type: 'other',
                        scope: 'global',
                        projectId: null,
                        tags: ['产品', '方法论', '最佳实践'],
                        icon: '💡'
                    },
                    {
                        title: 'K12编程教育课程体系',
                        content: '面向6-18岁青少年的编程教育课程体系设计。分为图形化编程、Python基础、算法竞赛三个阶段，每阶段包含80课时内容。',
                        type: 'prd',
                        scope: 'project',
                        projectId: 'project_002',
                        tags: ['教育', 'K12', '编程'],
                        icon: '📚'
                    },
                    {
                        title: '在线教育平台技术架构',
                        content: '基于微服务架构的在线教育平台技术方案。采用SpringCloud+Vue3技术栈，支持百万级并发，包含直播、点播、作业系统、考试系统等核心模块。',
                        type: 'tech',
                        scope: 'project',
                        projectId: 'project_002',
                        tags: ['技术', '架构', '微服务'],
                        icon: '⚙️'
                    }
                ];

                // 批量创建知识条目
                for (const data of mockData) {
                    const item = {
                        id: `knowledge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        ...data,
                        createdAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000, // 随机过去30天
                        updatedAt: Date.now(),
                        createdBy: 'system',
                        linkedChatId: null,
                        attachments: [],
                        viewCount: Math.floor(Math.random() * 50),
                        usageCount: Math.floor(Math.random() * 20)
                    };

                    await storageManager.saveKnowledge(item);
                    // 添加小延迟，避免ID冲突
                    await new Promise(resolve => setTimeout(resolve, 10));
                }

                // 标记迁移完成
                await storageManager.saveSetting('knowledge_migrated', true);

                } catch (error) {
                }
        }

        // 启动项目团队协同
        async function startProjectTeamCollaboration(projectId) {
            const project = state.teamSpace.projects.find(p => p.id === projectId);
            if (!project) return;

            if (project.assignedAgents.length === 0) {
                alert('请先添加团队成员');
                return;
            }

            if (project.linkedIdeas.length === 0) {
                alert('请先引入创意');
                return;
            }

            // 获取项目成员信息
            const agentMarket = getAgentMarket();
            const projectMembers = project.assignedAgents.map(agentId => {
                const agent = agentMarket.find(a => a.id === agentId);
                return agent ? {
                    name: agent.name,
                    role: agent.role,
                    skills: agent.skills
                } : null;
            }).filter(m => m !== null);

            // 获取创意信息
            const linkedChat = state.chats.find(chat => chat.id === project.linkedIdeas[0]);
            const ideaContent = linkedChat ? linkedChat.title : '未知创意';
            const ideaMessages = linkedChat && linkedChat.messages ? linkedChat.messages.slice(0, 5) : [];

            try {
                // 显示加载提示
                const loadingModal = document.createElement('div');
                loadingModal.className = 'modal';
                loadingModal.style.display = 'flex';
                loadingModal.innerHTML = `
                    <div class="modal-content" style="max-width: 400px; text-align: center; padding: 40px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🤖</div>
                        <div style="font-size: 18px; font-weight: 600; margin-bottom: 12px;">AI评估中...</div>
                        <div style="color: var(--text-secondary); font-size: 14px;">正在分析项目成员与创意的匹配度</div>
                    </div>
                `;
                document.body.appendChild(loadingModal);

                // 调用AI评估API
                const response = await fetch(`${state.settings.apiUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                role: 'system',
                                content: '你是一个专业的项目评估专家，擅长分析团队成员与项目需求的匹配度。请根据项目成员和创意需求，评估团队是否具备完成该项目的能力，并给出专业建议。'
                            },
                            {
                                role: 'user',
                                content: `请评估以下项目团队配置：

项目名称：${project.name}
创意内容：${ideaContent}
${ideaMessages.length > 0 ? `\n创意详情：\n${ideaMessages.map(m => m.content).join('\n')}` : ''}

当前团队成员：
${projectMembers.map(m => `- ${m.name}（${m.role}）：${m.skills.join('、')}`).join('\n')}

请从以下几个方面进行评估：
1. 分析当前团队成员的角色和技能是否能够覆盖该创意所需的核心能力
2. 指出可能存在的角色缺失或技能短板
3. 如果存在不足，给出具体的雇佣建议（需要什么角色的成员）
4. 如果团队配置合理，建议一个高效的协同模式（如何分工协作）
5. 给出项目成功完成的概率评估（0-100%）

请用清晰、专业的语言回答，分点阐述。`
                            }
                        ]
                    })
                });

                loadingModal.remove();

                if (!response.ok) {
                    throw new Error('评估请求失败');
                }

                const result = await response.json();

                if (result.code !== 0) {
                    throw new Error(result.error || '评估失败');
                }

                // 显示评估结果
                const evaluationResult = result.data.reply;

                const resultModal = document.createElement('div');
                resultModal.className = 'modal';
                resultModal.style.display = 'flex';
                resultModal.innerHTML = `
                    <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
                        <div class="modal-header">
                            <div class="modal-title">🎯 团队协同评估报告</div>
                            <button class="close-btn" onclick="this.closest('.modal').remove()">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                        <div class="modal-body" style="padding: 24px;">
                            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">项目：${project.name}</div>
                                <div style="font-size: 14px; color: var(--text-secondary);">创意：${ideaContent}</div>
                            </div>
                            <div style="white-space: pre-wrap; line-height: 1.8; color: var(--text-primary);">
                                ${evaluationResult}
                            </div>
                            <div style="display: flex; gap: 12px; margin-top: 24px; justify-content: flex-end;">
                                <button class="btn-secondary" onclick="this.closest('.modal').remove()">关闭</button>
                                <button class="btn-primary" onclick="this.closest('.modal').remove(); showAddMember()">添加成员</button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(resultModal);

                // 点击背景关闭
                resultModal.addEventListener('click', function(e) {
                    if (e.target === resultModal) {
                        resultModal.remove();
                    }
                });

            } catch (error) {
                alert(`评估失败: ${error.message}\n\n请检查后端服务是否正常运行。`);
            }
        }

        // 恢复对话界面的HTML结构
        function restoreChatInterface() {
            const mainContent = document.querySelector('.main-content');
            mainContent.innerHTML = `
                <header class="main-header">
                    <!-- 移动端：左侧汉堡菜单 -->
                    <button class="menu-toggle" onclick="toggleSidebar()" aria-label="打开菜单">
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>

                    <div class="main-title" id="mainTitle">ThinkCraft AI</div>

                    <div class="header-actions">
                        <!-- 移动端：新建对话按钮 -->
                        <button class="mobile-new-chat-btn" onclick="startNewChat()" title="新建对话" aria-label="新建对话">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                        </button>
                        <!-- 桌面端：设置按钮 -->
                        <button class="icon-btn desktop-only" onclick="showSettings()" title="设置">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </button>
                    </div>
                </header>

                <div class="chat-container" id="chatContainer">
                    <div class="empty-state" id="emptyState">
                        <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                        <div class="empty-title">苏格拉底式思维引导</div>
                        <div class="empty-subtitle">通过深度提问，帮助你理清创意思路、发现盲点、形成结构化洞察</div>
                    </div>
                    <div id="messageList" style="display: none;"></div>
                </div>

                <!-- 知识库面板（右侧切换面板）-->
                <div class="knowledge-panel" id="knowledgePanel" style="display: none;">
                    <div class="knowledge-panel-content">
                        <!-- 左侧：组织树 -->
                        <div class="knowledge-sidebar">
                            <div class="knowledge-org-switcher">
                                <button class="active" data-org="byType" onclick="switchKnowledgeOrg('byType')">按类型</button>
                                <button data-org="byTimeline" onclick="switchKnowledgeOrg('byTimeline')">时间线</button>
                                <button data-org="byTags" onclick="switchKnowledgeOrg('byTags')">标签</button>
                            </div>
                            <div id="knowledgeOrgTree" class="knowledge-org-tree"></div>
                        </div>

                        <!-- 右侧：知识列表 -->
                        <div class="knowledge-main">
                            <div class="knowledge-toolbar">
                                <input type="text" id="knowledgeSearch" placeholder="搜索知识..." oninput="onKnowledgeSearch(this.value)">
                                <select id="knowledgeTypeFilter" onchange="onKnowledgeTypeFilter(this.value)">
                                    <option value="">所有类型</option>
                                    <option value="prd">PRD</option>
                                    <option value="tech">技术方案</option>
                                    <option value="analysis">市场分析</option>
                                    <option value="research">调研报告</option>
                                    <option value="design">设计文档</option>
                                    <option value="other">其他</option>
                                </select>
                                <button class="btn-primary" onclick="createKnowledge()">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                                    </svg>
                                    新建
                                </button>
                            </div>
                            <div id="knowledgeList" class="knowledge-grid"></div>
                            <div id="knowledgeEmpty" class="empty-state" style="display: none;">
                                <svg class="empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                                </svg>
                                <div class="empty-title">暂无知识沉淀</div>
                                <div class="empty-subtitle">创建第一个知识条目</div>
                                <button class="btn-primary" onclick="createKnowledge()" style="margin-top: 16px;">新建知识</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="input-container" id="inputContainer">
                    <div class="input-wrapper">
                        <!-- 移动端：语音模式（默认） -->
                        <div class="mobile-voice-mode" id="mobileVoiceMode">
                            <button class="mobile-tool-btn" onclick="handleCamera()" title="拍照" aria-label="拍照">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                            </button>

                            <button class="mobile-voice-btn" id="mobileVoiceBtn">
                                <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                                </svg>
                                <span>按住说话</span>
                            </button>

                            <button class="mobile-tool-btn" onclick="handleImageUpload()" title="图片" aria-label="上传图片">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </button>

                            <button class="mobile-tool-btn" onclick="switchToTextMode()" title="切换文字输入" aria-label="切换文字输入">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                            </button>
                        </div>

                        <!-- 移动端：文本模式 -->
                        <div class="mobile-text-mode" id="mobileTextMode" style="display: none;">
                            <button class="mobile-tool-btn-small" onclick="switchToVoiceMode()" title="切换语音输入" aria-label="切换语音输入">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                                </svg>
                            </button>
                            <button class="mobile-tool-btn-small" onclick="handleCamera()" title="拍照" aria-label="拍照">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                            </button>
                            <button class="mobile-tool-btn-small" onclick="handleImageUpload()" title="图片" aria-label="上传图片">
                                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                            </button>
                            <textarea
                                class="mobile-text-input"
                                id="mobileTextInput"
                                placeholder="输入消息..."
                                rows="1"
                                onkeydown="handleKeyDown(event)"
                                oninput="autoResize(this)"
                            ></textarea>
                            <button class="mobile-send-btn" onclick="sendMessage()">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                                </svg>
                            </button>
                        </div>

                        <!-- 桌面端：文本模式（默认） -->
                        <div class="desktop-text-mode" id="desktopTextMode">
                            <div class="desktop-input-tools">
                                <button class="desktop-tool-btn" onclick="handleImageUpload()" title="上传图片" aria-label="上传图片">
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="desktop-input-box">
                                <textarea
                                    class="desktop-text-input"
                                    id="mainInput"
                                    placeholder="分享你的创意想法，让我们通过深度对话来探索它的可能性..."
                                    rows="1"
                                    onkeydown="handleKeyDown(event)"
                                    onkeyup="handleKeyUp(event)"
                                    oninput="autoResize(this)"
                                ></textarea>
                            </div>
                            <button class="desktop-send-btn" id="sendBtn" onclick="sendMessage()">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // 重新初始化语音输入功能
            initVoiceInput();
        }

        // 从项目中加载对话
        function loadChatFromProject(chatId) {
            // 清除当前项目状态
            state.currentProject = null;

            // 切换到对话Tab
            switchSidebarTab('chats');

            // 恢复对话界面的HTML结构
            restoreChatInterface();

            // 加载对话
            loadChat(chatId);
        }

        // 移动端输入模式切换
        function switchToTextMode() {
            document.getElementById('mobileVoiceMode').style.display = 'none';
            document.getElementById('mobileTextMode').style.display = 'flex';
            // 聚焦文本输入框
            setTimeout(() => {
                const input = document.getElementById('mobileTextInput');
                input.focus();
            }, 100);
        }

        function switchToVoiceMode() {
            document.getElementById('mobileTextMode').style.display = 'none';
            document.getElementById('mobileVoiceMode').style.display = 'flex';
        }

        // 初始化语音输入功能（用于恢复界面后重新绑定事件）
        function initVoiceInput() {
            const mobileVoiceBtn = document.getElementById('mobileVoiceBtn');
            if (mobileVoiceBtn) {
                // 移除旧的事件监听器（如果存在）
                const newBtn = mobileVoiceBtn.cloneNode(true);
                mobileVoiceBtn.parentNode.replaceChild(newBtn, mobileVoiceBtn);

                // 按下开始录音
                newBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleVoice();
                    newBtn.classList.add('recording');
                });

                // 松开停止录音
                newBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (isRecording) {
                        handleVoice();
                    }
                    newBtn.classList.remove('recording');
                });

                // 取消录音（手指移出按钮）
                newBtn.addEventListener('touchcancel', (e) => {
                    e.preventDefault();
                    if (isRecording) {
                        handleVoice();
                    }
                    newBtn.classList.remove('recording');
                });
            }

            // 桌面端已移除语音输入
        }

        // 桌面端输入模式切换
        function switchDesktopToVoice() {
            return;
        }

        function switchDesktopToText() {
            const textMode = document.getElementById('desktopTextMode');
            if (textMode) {
                textMode.style.display = 'flex';
            }
            // 聚焦文本输入框
            setTimeout(() => {
                const input = document.getElementById('mainInput');
                if (input) {
                    input.focus();
                }
            }, 100);
        }

        function loadSettings() {
            const saved = localStorage.getItem('thinkcraft_settings');
            if (saved) {
                state.settings = JSON.parse(saved);
            }

            // 如果没有保存过enableTeam设置，默认启用
            if (state.settings.enableTeam === undefined) {
                state.settings.enableTeam = true;
                localStorage.setItem('thinkcraft_settings', JSON.stringify(state.settings));
            }

            const darkModeToggle = document.getElementById('darkModeToggle');
            const saveHistoryToggle = document.getElementById('saveHistoryToggle');
            const enableTeamToggle = document.getElementById('enableTeamToggle');
            const enableTeamToggle2 = document.getElementById('enableTeamToggle2');

            if (darkModeToggle) darkModeToggle.checked = state.settings.darkMode;
            if (saveHistoryToggle) saveHistoryToggle.checked = state.settings.saveHistory;

            // 初始化团队空间数据
            initTeamSpace();

            // 同步团队功能开关状态
            const enableTeam = state.settings.enableTeam || false;
            if (enableTeamToggle) enableTeamToggle.checked = enableTeam;
            if (enableTeamToggle2) enableTeamToggle2.checked = enableTeam;

            // 根据设置显示/隐藏团队Tab
            updateTeamTabVisibility();

            if (window.apiClient && window.apiClient.setBaseURL) {
                const apiUrl = state.settings.apiUrl || 'http://localhost:3000';
                window.apiClient.setBaseURL(apiUrl);
            }
        }

        function saveSettings() {
            localStorage.setItem('thinkcraft_settings', JSON.stringify(state.settings));
        }

        function toggleDarkMode() {
            state.settings.darkMode = document.getElementById('darkModeToggle').checked;
            saveSettings();
            alert('暗色模式功能开发中，敬请期待！');
        }

        function toggleSaveHistory() {
            state.settings.saveHistory = document.getElementById('saveHistoryToggle').checked;
            saveSettings();
        }

        function toggleTeamFeature(sourceToggle) {
            const primaryToggle = document.getElementById('enableTeamToggle');
            const secondaryToggle = document.getElementById('enableTeamToggle2');
            const enabled = sourceToggle ? sourceToggle.checked : primaryToggle.checked;

            // 更新state和同步两个checkbox
            state.settings.enableTeam = enabled;
            if (primaryToggle) {
                primaryToggle.checked = enabled;
            }
            if (secondaryToggle) {
                secondaryToggle.checked = enabled;
            }

            // 保存设置
            saveSettings();

            // 更新团队Tab的可见性
            updateTeamTabVisibility();

            // 如果禁用了团队功能且当前在团队Tab，切换回对话Tab
            if (!enabled) {
                const teamTab = document.querySelector('[data-tab="team"]');
                if (teamTab && teamTab.classList.contains('active')) {
                    switchSidebarTab('chats');
                }
            }
        }

        function updateTeamTabVisibility() {
            const teamTab = document.getElementById('teamTab');
            const sidebarTabs = document.querySelector('.sidebar-tabs');
            const enabled = state.settings.enableTeam || false;

            if (sidebarTabs) {
                // 控制整个Tab区域的显示/隐藏
                if (enabled) {
                    sidebarTabs.classList.add('active');
                } else {
                    sidebarTabs.classList.remove('active');
                }
            }

            if (teamTab) {
                // 控制团队Tab的显示/隐藏
                teamTab.style.display = enabled ? 'flex' : 'none';
            }
        }

        function loadTeamProject(projectId) {
            // Mock项目数据
            const projects = {
                project_001: {
                    id: 'project_001',
                    name: '智能健身APP项目',
                    icon: '🚀',
                    status: '进行中',
                    members: [
                        { id: 'member_1', name: '张三', role: '产品经理', avatar: '👨‍💼', type: 'human' },
                        { id: 'member_2', name: '李四', role: '技术负责人', avatar: '👨‍💻', type: 'human' },
                        { id: 'member_3', name: '王五', role: 'UI设计师', avatar: '👩‍🎨', type: 'human' }
                    ],
                    ideas: [
                        { title: '智能健身APP创意验证', icon: '💡', date: '2天前' },
                        { title: 'AI动作识别技术方案', icon: '🤖', date: '1周前' }
                    ],
                    agents: [] // 已雇佣的数字员工ID列表
                },
                project_002: {
                    id: 'project_002',
                    name: '在线教育平台',
                    icon: '📚',
                    status: '规划中',
                    members: [
                        { id: 'member_4', name: '赵六', role: '产品经理', avatar: '👨‍💼', type: 'human' },
                        { id: 'member_5', name: '钱七', role: '开发工程师', avatar: '👩‍💻', type: 'human' }
                    ],
                    ideas: [
                        { title: 'K12编程教育平台', icon: '🎓', date: '3天前' }
                    ],
                    agents: []
                },
                project_003: {
                    id: 'project_003',
                    name: '智能家居控制系统',
                    icon: '🏠',
                    status: '已完成',
                    members: [
                        { id: 'member_6', name: '孙八', role: '项目经理', avatar: '👨‍💼', type: 'human' },
                        { id: 'member_7', name: '周九', role: '前端开发', avatar: '👨‍💻', type: 'human' },
                        { id: 'member_8', name: '吴十', role: '后端开发', avatar: '👩‍💻', type: 'human' },
                        { id: 'member_9', name: '郑十一', role: '运营专员', avatar: '👩‍💼', type: 'human' }
                    ],
                    ideas: [
                        { title: '社区拼团功能设计', icon: '🎁', date: '1个月前' },
                        { title: '智能推荐算法优化', icon: '🔮', date: '2个月前' }
                    ],
                    agents: ['agent_003'] // 示例：已雇佣市场营销专家
                }
            };

            const project = projects[projectId];
            if (!project) {
                alert('项目不存在');
                return;
            }

            // 保存当前项目ID到全局
            window.currentProjectId = projectId;
            window.currentProject = project;

            // 更新Modal标题
            document.getElementById('projectModalTitle').textContent = `${project.icon} ${project.name}`;

            // 更新项目概览
            document.getElementById('projectStatus').textContent = project.status;
            document.getElementById('projectMemberCount').textContent = (project.members?.length || 0) + (project.assignedAgents?.length || 0);
            document.getElementById('projectIdeaCount').textContent = project.ideas?.length || 0;

            // 渲染成员列表
            renderProjectMembers(project);

            // 渲染创意列表
            renderProjectIdeas(project);

            // 显示Modal
            document.getElementById('projectModal').style.display = 'flex';
        }

        function closeProjectModal() {
            document.getElementById('projectModal').style.display = 'none';
        }

        function renderProjectMembers(project) {
            const container = document.getElementById('projectMembersList');
            const allMembers = [...(project.members || [])];

            // 添加已雇佣的数字员工
            if (project.assignedAgents && project.assignedAgents.length > 0) {
                const agentMarket = getAgentMarket();
                project.assignedAgents.forEach(agentId => {
                    const agent = agentMarket.find(a => a.id === agentId);
                    if (agent) {
                        allMembers.push({
                            id: agent.id,
                            name: agent.name,
                            role: agent.role,
                            avatar: agent.avatar,
                            type: 'agent'
                        });
                    }
                });
            }

            container.innerHTML = allMembers.map(member => `
                <div class="project-member-card">
                    <div class="member-avatar">${member.type === 'agent' ? getAgentIconSvg(member.avatar || member.role || member.name, 28, 'member-avatar-icon') : member.avatar}</div>
                    <div class="member-info">
                        <div class="member-name">${member.name}${member.type === 'agent' ? '（数字员工）' : ''}</div>
                        <div class="member-role">${member.role}</div>
                    </div>
                    ${member.type === 'agent' ? `
                        <button class="btn-secondary" onclick="fireProjectAgent('${member.id}')" style="padding: 6px 12px; font-size: 13px; margin-left: auto;">
                            解雇
                        </button>
                    ` : ''}
                </div>
            `).join('');
        }

        function renderProjectIdeas(project) {
            const container = document.getElementById('projectIdeasList');
            const ideas = project.ideas || [];

            if (ideas.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-tertiary);">暂无关联创意</div>';
                return;
            }

            container.innerHTML = ideas.map(idea => `
                <div class="project-idea-card">
                    <div class="idea-icon">${idea.icon}</div>
                    <div class="idea-info">
                        <div class="idea-title">${idea.title}</div>
                        <div class="idea-date">${idea.date}</div>
                    </div>
                </div>
            `).join('');
        }

        function showAddMember() {
            // 显示添加成员Modal
            const modal = document.getElementById('addMemberModal');
            modal.style.display = 'flex';

            // 默认显示雇佣市场Tab
            switchAddMemberTab('market');
        }

        function closeAddMember() {
            document.getElementById('addMemberModal').style.display = 'none';
        }

        // 切换添加成员弹窗的Tab
        function switchAddMemberTab(tab) {
            // 更新Tab按钮状态
            const tabs = document.querySelectorAll('#addMemberModal .report-tab');
            tabs.forEach(t => t.classList.remove('active'));

            if (tab === 'market') {
                tabs[0].classList.add('active');
                document.getElementById('addMemberMarketTab').style.display = 'block';
                document.getElementById('addMemberHiredTab').style.display = 'none';

                // 渲染可雇佣的数字员工列表
                renderAvailableAgents();
            } else {
                tabs[1].classList.add('active');
                document.getElementById('addMemberMarketTab').style.display = 'none';
                document.getElementById('addMemberHiredTab').style.display = 'block';

                // 渲染已雇佣的数字员工列表
                renderProjectHiredAgents();
            }
        }

        // 渲染项目已雇佣的员工列表（带解雇按钮）
        function renderProjectHiredAgents() {
            const container = document.getElementById('projectHiredAgentList');
            const project = window.currentProject;
            const hiredAgentIds = project.assignedAgents || [];
            const agentMarket = getAgentMarket();

            // 过滤出已雇佣的员工
            const hiredAgents = agentMarket.filter(agent => hiredAgentIds.includes(agent.id));

            if (hiredAgents.length === 0) {
                container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-tertiary);">暂无雇佣的数字员工</div>';
                return;
            }

            container.innerHTML = hiredAgents.map(agent => {
                return `
                    <div class="agent-card hired">
                        <div class="agent-card-header">
                        <div class="agent-card-avatar">${getAgentIconSvg(agent.avatar || agent.role || agent.name, 32, 'agent-card-icon')}</div>
                            <div class="agent-card-info">
                                <div class="agent-card-name">${agent.name}</div>
                                <div class="agent-card-role">${agent.role}</div>
                            </div>
                        </div>
                        <div class="agent-card-desc">${agent.desc}</div>
                        <div class="agent-card-skills">
                            ${agent.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                        <div class="agent-card-actions">
                            <button class="btn-secondary" onclick="fireAgentFromModal('${agent.id}')">
                                🗑️ 解雇
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 从弹窗中解雇员工
        function fireAgentFromModal(agentId) {
            const project = window.currentProject;
            const agentMarket = getAgentMarket();
            const agent = agentMarket.find(item => item.id === agentId);
            const agentName = agent?.name || '该成员';

            if (!confirm(`确定要将 ${agentName} 从项目中移除吗？`)) {
                return;
            }

            if (project?.mode === 'development') {
                if (!confirm('当前为协同开发模式，移除成员可能影响流程执行与交付质量。确认继续移除？')) {
                    return;
                }
            }

            const index = project.assignedAgents.indexOf(agentId);
            if (index > -1) {
                project.assignedAgents.splice(index, 1);
                // 保存到 localStorage
                saveTeamSpace();

                // 刷新两个tab的内容
                renderProjectHiredAgents(); // 刷新已雇佣列表
                renderAvailableAgents(); // 刷新雇佣市场列表

                // 更新项目成员显示
                renderProjectMembers(project);
                document.getElementById('projectMemberCount').textContent = (project.members?.length || 0) + (project.assignedAgents?.length || 0);
            }
        }

        function renderAvailableAgents() {
            const container = document.getElementById('projectAgentList');
            const agentMarket = getAgentMarket();
            const project = window.currentProject;
            const hiredAgents = project.assignedAgents || [];

            container.innerHTML = agentMarket.map(agent => {
                const isHired = hiredAgents.includes(agent.id);
                return `
                    <div class="agent-card ${isHired ? 'hired' : ''}">
                        <div class="agent-card-header">
                        <div class="agent-card-avatar">${getAgentIconSvg(agent.avatar || agent.role || agent.name, 32, 'agent-card-icon')}</div>
                            <div class="agent-card-info">
                                <div class="agent-card-name">${agent.name}</div>
                                <div class="agent-card-role">${agent.role}</div>
                            </div>
                        </div>
                        <div class="agent-card-desc">${agent.desc}</div>
                        <div class="agent-card-skills">
                            ${agent.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                        </div>
                        <div class="agent-card-actions">
                            ${isHired
                                ? `<button class="hire-btn hired" disabled style="cursor: not-allowed; opacity: 0.6;">✓ 已加入</button>`
                                : `<button class="hire-btn" onclick="toggleAgentHire('${agent.id}')">加入团队</button>`
                            }
                        </div>
                    </div>
                `;
            }).join('');
        }

        function toggleAgentHire(agentId) {
            const project = window.currentProject;
            const hiredAgents = project.assignedAgents || [];
            const index = hiredAgents.indexOf(agentId);

            if (index > -1) {
                // 已雇佣的情况不应该走到这里，因为按钮已经disabled
                return;
            }

            // 执行雇佣
            hiredAgents.push(agentId);
            project.assignedAgents = hiredAgents;

            // 保存到 localStorage
            saveTeamSpace();

            // 重新渲染
            renderAvailableAgents();
            renderProjectHiredAgents(); // 同时刷新已雇佣Tab
            renderProjectMembers(project);
            renderProjectList(); // 刷新项目列表，确保回显

            // 刷新主内容区的项目详情页面（关键修复）
            renderProjectDetail(project);

            document.getElementById('projectMemberCount').textContent = (project.members?.length || 0) + (project.assignedAgents?.length || 0);
        }

        function fireProjectAgent(agentId) {
            if (!confirm('确定要将该数字员工从项目中移除吗？')) {
                return;
            }

            const project = window.currentProject;
            const index = project.assignedAgents.indexOf(agentId);
            if (index > -1) {
                project.assignedAgents.splice(index, 1);
                // 保存到 localStorage
                saveTeamSpace();

                // 重新渲染
                renderProjectMembers(project);
                renderProjectList(); // 刷新项目列表，确保回显

                // 刷新主内容区的项目详情页面（关键修复）
                renderProjectDetail(project);
                renderProjectHiredAgents(); // 刷新已雇佣Tab

                document.getElementById('projectMemberCount').textContent = (project.members?.length || 0) + (project.assignedAgents?.length || 0);
            }
        }

        function getAgentMarket() {
            // 数字员工市场数据
            return [
                {
                    id: 'agent_001',
                    name: 'Alex',
                    role: '产品经理',
                    avatar: '👨‍💼',
                    desc: '擅长需求分析和产品规划，帮助你梳理产品思路',
                    skills: ['需求分析', 'PRD撰写', '竞品分析']
                },
                {
                    id: 'agent_002',
                    name: 'Sophia',
                    role: '技术架构师',
                    avatar: '👩‍💻',
                    desc: '精通系统架构设计，为你的产品提供技术方案',
                    skills: ['架构设计', '技术选型', '性能优化']
                },
                {
                    id: 'agent_003',
                    name: 'Emma',
                    role: '市场营销专家',
                    avatar: '👩‍💼',
                    desc: '深谙市场营销策略，帮助产品找到目标用户',
                    skills: ['市场调研', '营销策划', '用户增长']
                },
                {
                    id: 'agent_004',
                    name: 'Oliver',
                    role: 'UI/UX设计师',
                    avatar: '👨‍🎨',
                    desc: '注重用户体验，为产品打造精美界面',
                    skills: ['界面设计', '交互设计', '用户研究']
                },
                {
                    id: 'agent_005',
                    name: 'Liam',
                    role: '数据分析师',
                    avatar: '👨‍🔬',
                    desc: '善于从数据中发现洞察，驱动产品决策',
                    skills: ['数据分析', '用户画像', 'A/B测试']
                },
                {
                    id: 'agent_006',
                    name: 'Ava',
                    role: '内容运营专家',
                    avatar: '👩‍🏫',
                    desc: '精通内容策划和运营，提升品牌影响力',
                    skills: ['内容策划', '社群运营', 'SEO优化']
                }
            ];
        }

        function clearAllHistory() {
            if (confirm('确定要清除所有历史记录吗？此操作不可恢复。')) {
                // 清除localStorage
                localStorage.removeItem('thinkcraft_chats');

                // 重置状态
                state.chats = [];
                state.currentChat = null;
                state.messages = [];
                state.userData = {};
                state.conversationStep = 0;
                state.analysisCompleted = false;

                // 重新加载聊天列表（会显示"暂无历史记录"）
                loadChats();

                // 清空聊天区域，显示欢迎界面
                const chatMessages = document.getElementById('chatMessages');
                if (chatMessages) {
                    chatMessages.innerHTML = '';
                }

                // 显示初始化界面，隐藏消息列表
                const emptyState = document.getElementById('emptyState');
                const messageList = document.getElementById('messageList');
                if (emptyState) {
                    emptyState.style.display = 'flex';
                }
                if (messageList) {
                    messageList.style.display = 'none';
                }

                // 关闭设置弹窗
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal) {
                    settingsModal.classList.remove('active');
                }

                // 聚焦输入框
                focusInput();

                alert('✅ 历史记录已清除');
            }
        }

        // 退出登录
        function handleLogout() {
            const { saveHistory, hasPersistedChats } = getChatPersistenceState();
            const message = buildLogoutMessage(saveHistory, hasPersistedChats);

            if (!confirm(message)) {
                return;
            }

            // 清除登录会话数据
            sessionStorage.removeItem('thinkcraft_logged_in');
            sessionStorage.removeItem('thinkcraft_user');
            sessionStorage.removeItem('thinkcraft_quick_mode');
            sessionStorage.removeItem('thinkcraft_registered_user');
            sessionStorage.removeItem('thinkcraft_login_codes');

            // 清除登录页记住信息
            localStorage.removeItem('thinkcraft_remember');
            localStorage.removeItem('thinkcraft_login_phone');
            localStorage.removeItem('thinkcraft_username');

            // 未开启保存历史时，清理本地对话数据
            if (!saveHistory) {
                localStorage.removeItem('thinkcraft_chats');
                localStorage.removeItem('thinkcraft_teamspace');
            }

            // 跳转到登录页面
            window.location.href = 'login.html';
        }

        function getChatPersistenceState() {
            let saveHistory = state?.settings?.saveHistory;
            if (saveHistory === undefined) {
                try {
                    const settings = JSON.parse(localStorage.getItem('thinkcraft_settings') || '{}');
                    saveHistory = Boolean(settings.saveHistory);
                } catch (e) {
                    saveHistory = false;
                }
            }

            let hasPersistedChats = false;
            try {
                const savedChats = JSON.parse(localStorage.getItem('thinkcraft_chats') || '[]');
                hasPersistedChats = Array.isArray(savedChats) && savedChats.length > 0;
            } catch (e) {
                hasPersistedChats = false;
            }

            return { saveHistory, hasPersistedChats };
        }

        function buildLogoutMessage(saveHistory, hasPersistedChats) {
            if (saveHistory && hasPersistedChats) {
                return '确定要退出登录吗？\n\n对话记录已持久化保存，退出后重新登录仍可查看。';
            }
            return '确定要退出登录吗？\n\n当前对话未持久化保存，退出后将清除本地数据并丢失对话。';
        }

        // 语音输入
        let recognition = null;
        let isRecording = false;

        // 快速语音记录（移动端顶部按钮专用）
        function handleQuickVoice() {
            // 触觉反馈（支持的设备）
            if ('vibrate' in navigator) {
                navigator.vibrate(10);
            }

            // 自动聚焦输入框（确保用户能看到识别结果）
            const input = document.getElementById('mainInput');
            if (input) {
                input.focus();
            }

            // 调用主语音处理函数
            handleVoice();
        }

        // 智能检测最佳输入方式
        function getSmartInputMode() {
            const hour = new Date().getHours();
            const device = window.deviceDetector;

            // 1. 深夜/清晨时段（22:00 - 7:00）→ 文本模式
            if (hour >= 22 || hour <= 7) {
                return {
                    mode: 'text',
                    reason: '深夜时段，建议使用文字输入',
                    icon: '🌙'
                };
            }

            // 2. 弱网或省流量模式 → 文本模式
            if (navigator.connection) {
                const effectiveType = navigator.connection.effectiveType;
                const saveData = navigator.connection.saveData;

                if (effectiveType === 'slow-2g' || effectiveType === '2g' || saveData) {
                    return {
                        mode: 'text',
                        reason: '网络较慢，建议使用文字输入',
                        icon: '📶'
                    };
                }
            }

            // 3. 桌面端 → 文本模式（键盘更高效）
            if (device && device.deviceType && device.deviceType.isDesktop) {
                return {
                    mode: 'text',
                    reason: '桌面端，键盘输入更高效',
                    icon: '⌨️'
                };
            }

            // 4. 移动端 + 白天 + 良好网络 → 语音模式
            if (device && device.deviceType && device.deviceType.isMobile) {
                // 检查是否支持语音识别
                const supportsSpeech = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);

                if (supportsSpeech) {
                    return {
                        mode: 'voice',
                        reason: '点击左上角话筒，快速语音记录',
                        icon: '🎤'
                    };
                }
            }

            // 5. 默认：文本模式
            return {
                mode: 'text',
                reason: '开始输入你的创意想法',
                icon: '✍️'
            };
        }

        // 应用智能输入提示
        function applySmartInputHint() {
            const inputMode = getSmartInputMode();
            const mainInput = document.getElementById('mainInput');
            const quickVoiceBtn = document.querySelector('.quick-voice-btn');

            if (!mainInput) return;

            // 更新输入框提示文字
            if (inputMode.mode === 'voice') {
                mainInput.placeholder = `${inputMode.icon} ${inputMode.reason}`;

                // 移动端语音模式：添加脉冲动画提示
                if (quickVoiceBtn && window.deviceDetector?.deviceType?.isMobile) {
                    quickVoiceBtn.style.animation = 'pulse 2s ease-in-out 3';

                    // 3次脉冲后移除动画
                    setTimeout(() => {
                        quickVoiceBtn.style.animation = '';
                    }, 6000);
                }
            } else {
                mainInput.placeholder = `${inputMode.icon} ${inputMode.reason}`;
                // 文本模式：自动聚焦输入框
                if (!state.currentChat) {
                    setTimeout(() => {
                        mainInput.focus();
                    }, 300);
                }
            }
        }

        function handleVoice() {
            if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
                alert('❌ 您的浏览器不支持语音识别\n\n请使用 Chrome、Edge 或 Safari 浏览器');
                return;
            }

            if (isRecording) {
                // 停止录音
                recognition.stop();
                isRecording = false;
                return;
            }

            // 初始化语音识别
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.lang = 'zh-CN';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onstart = () => {
                isRecording = true;

                // 更新桌面端语音按钮状态
                const desktopVoiceBtn = document.getElementById('desktopVoiceBtn');
                const desktopVoiceText = document.getElementById('desktopVoiceText');
                if (desktopVoiceBtn && desktopVoiceBtn.offsetParent !== null) {
                    desktopVoiceBtn.classList.add('recording');
                    desktopVoiceText.textContent = '正在录音...';
                }

                // 更新桌面端文本输入框状态（如果可见）
                const input = document.getElementById('mainInput');
                if (input && input.offsetParent !== null) {
                    input.placeholder = '🎤 正在录音...（再次点击停止）';
                    input.style.borderColor = '#ef4444';
                }
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;

                // 移动端：直接发送语音识别结果
                const mobileVoiceBtn = document.getElementById('mobileVoiceBtn');
                if (mobileVoiceBtn && mobileVoiceBtn.offsetParent !== null) {
                    // 移动端语音模式：直接发送
                    const input = document.getElementById('mainInput');
                    input.value = transcript;
                    sendMessage();
                } else {
                    // 桌面端：填充到输入框
                    const input = document.getElementById('mainInput');
                    input.value = (input.value + ' ' + transcript).trim();
                    autoResize(input);
                }

                // 触觉反馈
                if ('vibrate' in navigator) {
                    navigator.vibrate(20);
                }
            };

            recognition.onerror = (event) => {
                alert(`❌ 语音识别失败：${event.error}\n\n请检查麦克风权限`);
                resetVoiceInput();
            };

            recognition.onend = () => {
                resetVoiceInput();
            };

            recognition.start();
        }

        function resetVoiceInput() {
            isRecording = false;

            // 重置桌面端语音按钮状态
            const desktopVoiceBtn = document.getElementById('desktopVoiceBtn');
            const desktopVoiceText = document.getElementById('desktopVoiceText');
            if (desktopVoiceBtn) {
                desktopVoiceBtn.classList.remove('recording');
            }
            if (desktopVoiceText) {
                desktopVoiceText.textContent = '点击语音输入';
            }

            // 重置桌面端文本输入框状态
            const input = document.getElementById('mainInput');
            if (input) {
                input.placeholder = '分享你的创意想法，让我们通过深度对话来探索它的可能性...';
                input.style.borderColor = '';
            }
        }

        // 拍照功能
        function handleCamera() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.capture = 'environment';  // 使用后置摄像头

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await processImageFile(file);
                }
            };

            input.click();
        }

        // 上传图片功能
        function handleImageUpload() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = false;

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    await processImageFile(file);
                }
            };

            input.click();
        }

        // 处理图片文件
        async function processImageFile(file) {
            if (!file.type.startsWith('image/')) {
                alert('❌ 请选择图片文件');
                return;
            }

            // 显示加载状态
            const loadingMsg = addMessage('assistant', '🖼️ 正在分析图片...');

            try {
                // 将图片转换为 Base64
                const base64Image = await fileToBase64(file);

                // 调用后端API进行图片识别
                const response = await fetch(`${state.settings.apiUrl}/api/vision/analyze`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image: base64Image,
                        prompt: '请描述这张图片的内容，如果图片中有文字，请提取出来。'
                    })
                });

                if (!response.ok) {
                    throw new Error(`API错误: ${response.status}`);
                }

                const data = await response.json();

                if (data.code !== 0) {
                    throw new Error(data.error || '图片识别失败');
                }

                // 将识别结果填入输入框
                const input = document.getElementById('mainInput');
                const description = data.data.description;
                input.value = `[图片内容]: ${description}`;
                autoResize(input);

                // 移除加载消息
                if (loadingMsg && loadingMsg.parentNode) {
                    loadingMsg.parentNode.removeChild(loadingMsg);
                }

            } catch (error) {
                // 移除加载消息
                if (loadingMsg && loadingMsg.parentNode) {
                    loadingMsg.parentNode.removeChild(loadingMsg);
                }

                // 降级方案：仅显示图片预览
                const reader = new FileReader();
                reader.onload = (e) => {
                    const input = document.getElementById('mainInput');
                    input.value = `[已上传图片: ${file.name}]\n\n请描述你想探讨的内容：`;
                    autoResize(input);

                    // 显示图片预览（可选）
                    alert(`📷 图片已接收：${file.name}\n\n⚠️ 图片识别功能需要后端支持\n当前仅显示图片名称，请手动描述图片内容。`);
                };
                reader.readAsDataURL(file);
            }
        }

        // 文件转 Base64
        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('active');
        }

        // 点击模态框外部关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    
        // ==================== 长按菜单功能 ====================
        function initChatItemLongPress() {
            if (!window.gestureHandler || !window.deviceDetector?.capabilities.touch) {
                return;
            }

            function showContextMenu(item, options) {
                const existingMenu = document.querySelector('.context-menu');
                if (existingMenu) existingMenu.remove();

                const menu = document.createElement('div');
                menu.className = 'context-menu';
                menu.style.cssText = 'position:fixed;background:white;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:8px;z-index:2000;min-width:150px;';

                options.forEach(option => {
                    const button = document.createElement('button');
                    button.textContent = option.label;
                    button.style.cssText = 'display:block;width:100%;padding:12px 16px;border:none;background:none;text-align:left;cursor:pointer;border-radius:8px;font-size:15px;';
                    button.addEventListener('click', () => { option.action(); menu.remove(); });
                    menu.appendChild(button);
                });

                const rect = item.getBoundingClientRect();
                menu.style.top = (rect.top + rect.height / 2) + 'px';
                menu.style.left = (rect.left + rect.width + 10) + 'px';
                document.body.appendChild(menu);

                setTimeout(() => {
                    document.addEventListener('click', function closeMenu(e) {
                        if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', closeMenu); }
                    });
                }, 100);
            }

            document.querySelectorAll('.chat-item').forEach(item => {
                window.gestureHandler.registerLongPress(item, () => {
                    showContextMenu(item, [
                        { label: '📝 重命名', action: () => { const n = prompt('输入新名称:'); if(n){ const t = item.querySelector('.chat-item-title'); if(t) t.textContent = n; } } },
                        { label: '📤 导出', action: () => alert('导出功能开发中...') },
                        { label: '🗑️ 删除', action: () => { if(confirm('确定删除？')) item.remove(); } }
                    ]);
                });
            });
        }

        // ==================== 双击放大功能 ====================
        function initShareCardDoubleTap() {
            const shareCard = document.querySelector('.share-card');
            if (!shareCard || !window.gestureHandler) return;
            let isZoomed = false;
            window.gestureHandler.registerDoubleTap(shareCard, () => {
                shareCard.style.transform = isZoomed ? 'scale(1)' : 'scale(1.5)';
                shareCard.style.transition = 'transform 0.3s ease';
                isZoomed = !isZoomed;
            });
        }

        // ==================== 初始化 ====================

        // ==================== 响应式侧边栏自动管理 ====================
        function handleResponsiveSidebar() {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.querySelector('.menu-toggle');

            if (!sidebar || !menuToggle) return;

            // 智能检测：通过菜单按钮可见性判断是否为覆盖模式（移动端）
            const isOverlayMode = window.getComputedStyle(menuToggle).display !== 'none';

            if (isOverlayMode) {
                // 移动端覆盖模式：确保侧边栏默认关闭，显示对话窗口
                sidebar.classList.remove('active');
                } else {
                // 桌面端并排模式：侧边栏始终显示，无需active类
                sidebar.classList.remove('active');
                }
        }

        // 监听窗口大小变化（防抖处理）
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(handleResponsiveSidebar, 150);
        });

        // 页面DOM加载完成后尽早初始化
        document.addEventListener('DOMContentLoaded', () => {
            // 等待一个微任务，确保样式已应用
            setTimeout(handleResponsiveSidebar, 0);
        });

        // 页面完全加载后再次确认（防止样式延迟加载）
        window.addEventListener('load', () => {
            handleResponsiveSidebar();
            handleLaunchParams();  // 处理PWA启动参数
            initChatAutoScroll();

            // 知识库Mock数据迁移
            initKnowledgeBase();

            // 应用智能输入提示
            setTimeout(() => {
                applySmartInputHint();
            }, 500);

            // ==================== 移动端语音按钮初始化 ====================
            const mobileVoiceBtn = document.getElementById('mobileVoiceBtn');
            if (mobileVoiceBtn) {
                // 按下开始录音
                mobileVoiceBtn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    handleVoice();
                    mobileVoiceBtn.classList.add('recording');
                });

                // 松开停止录音
                mobileVoiceBtn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    if (isRecording) {
                        handleVoice(); // 再次调用以停止
                    }
                    mobileVoiceBtn.classList.remove('recording');
                });

                // 取消录音（手指移出按钮）
                mobileVoiceBtn.addEventListener('touchcancel', (e) => {
                    e.preventDefault();
                    if (isRecording) {
                        handleVoice();
                    }
                    mobileVoiceBtn.classList.remove('recording');
                });
            }

        });

        // ==================== 处理PWA快捷方式和Web Share Target ====================
        function handleLaunchParams() {
            const params = new URLSearchParams(window.location.search);
            const action = params.get('action');
            const source = params.get('source');
            const sharedText = params.get('text');
            const sharedTitle = params.get('title');
            const sharedUrl = params.get('url');

            // 1. 处理PWA快捷方式
            if (action === 'voice') {
                // 快捷方式：直接启动语音输入
                setTimeout(() => {
                    handleVoice();
                    }, 500);
            } else if (action === 'camera') {
                // 快捷方式：直接启动相机
                setTimeout(() => {
                    handleCamera();
                    }, 500);
            } else if (action === 'new') {
                // 快捷方式：新建对话
                startNewChat();
                }

            // 2. 处理Web Share Target（其他应用分享内容）
            if (action === 'share' && (sharedText || sharedUrl || sharedTitle)) {
                const mainInput = document.getElementById('mainInput');
                if (mainInput) {
                    // 组合分享内容
                    let content = '';
                    if (sharedTitle) content += `${sharedTitle}\n`;
                    if (sharedText) content += `${sharedText}\n`;
                    if (sharedUrl) content += `${sharedUrl}`;

                    mainInput.value = content.trim();
                    autoResize(mainInput);
                    mainInput.focus();
                }
            }

            // 清理URL参数（避免刷新重复触发）
            if (action || sharedText || sharedUrl || sharedTitle || source) {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
            }
        }

        // ==================== 移动端遮罩点击关闭侧边栏 ====================
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.querySelector('.menu-toggle');

            if (!sidebar || !menuToggle) return;

            // 智能检测：通过菜单按钮可见性判断是否为覆盖模式（移动端）
            const isOverlayMode = window.getComputedStyle(menuToggle).display !== 'none';
            const isSidebarOpen = sidebar.classList.contains('active');

            // 只在覆盖模式（移动端）且侧边栏打开时处理
            if (isOverlayMode && isSidebarOpen) {
                // 点击遮罩区域（主内容区）关闭侧边栏
                const clickedInsideSidebar = sidebar.contains(e.target);
                const clickedMenuToggle = menuToggle.contains(e.target);

                if (!clickedInsideSidebar && !clickedMenuToggle) {
                    sidebar.classList.remove('active');
                }
            }
        });

        window.addEventListener('deviceDetectorReady', () => {
            initChatItemLongPress();
            initShareCardDoubleTap();
            initInputGestures();  // 初始化输入框手势
            // initFloatingBallDrag();  // TODO: 初始化悬浮球拖拽（函数未定义）
        });
        if (window.deviceDetector?.initialized) {
            initChatItemLongPress();
            initShareCardDoubleTap();
            initInputGestures();  // 初始化输入框手势
            // initFloatingBallDrag();  // TODO: 初始化悬浮球拖拽（函数未定义）
        }

        // ==================== 输入框手势快捷操作 ====================
        function initInputGestures() {
            const mainInput = document.getElementById('mainInput');
            if (!mainInput || !window.gestureHandler) {
                return;
            }

            // 1. 双击输入框发送消息
            window.gestureHandler.registerDoubleTap(mainInput, () => {
                const content = mainInput.value.trim();
                if (content && !isCurrentChatBusy()) {
                    sendMessage();
                    if (navigator.vibrate) navigator.vibrate(30);  // 震动反馈
                    }
            });

            // 2. 向上滑动输入框发送消息
            window.gestureHandler.registerSwipe(mainInput, {
                onSwipeUp: (distance) => {
                    const content = mainInput.value.trim();
                    if (distance > 50 && content && !isCurrentChatBusy()) {
                        sendMessage();
                        if (navigator.vibrate) navigator.vibrate(30);  // 震动反馈
                        }
                }
            });

            }

        // ==================== Service Worker注册 ====================
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then((registration) => {
                        // 检查更新
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    // 新版本已安装，提示用户刷新
                                    // 可以在这里显示更新提示UI
                                }
                            });
                        });
                    })
                    .catch((error) => {
                        });

                // 监听Service Worker消息
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data && event.data.type === 'SYNC_START') {
                        // 触发同步逻辑
                    }
                });
            });
        } else {
            }

        // 新手引导
        function initOnboarding() {
            const isLoggedIn = sessionStorage.getItem('thinkcraft_logged_in') === 'true';
            const hasDone = localStorage.getItem('thinkcraft_onboarding_done') === 'true';
            if (!isLoggedIn || hasDone) return;

            const overlay = document.getElementById('onboardingOverlay');
            const highlight = document.getElementById('onboardingHighlight');
            const tooltip = document.getElementById('onboardingTooltip');
            const titleEl = document.getElementById('onboardingTitle');
            const descEl = document.getElementById('onboardingDesc');
            const stepEl = document.getElementById('onboardingStep');
            const btnPrev = document.getElementById('onboardingPrev');
            const btnNext = document.getElementById('onboardingNext');
            const btnSkip = document.getElementById('onboardingSkip');

            const steps = [
                {
                    title: '新建对话',
                    desc: '从这里开始创建一个新的创意对话。',
                    target: '.new-chat-btn',
                    onEnter: () => switchSidebarTab('chats')
                },
                {
                    title: '输入想法',
                    desc: '在这里输入你的创意或需求，支持回车发送。',
                    target: '#mainInput'
                },
                {
                    title: '开启团队功能',
                    desc: '在设置里打开数字员工团队开关，解锁项目空间。',
                    target: () => document.getElementById('enableTeamToggle') || document.getElementById('enableTeamToggle2'),
                    onEnter: () => {
                        if (typeof showSettings === 'function') {
                            showSettings();
                        } else if (typeof openBottomSettings === 'function') {
                            openBottomSettings();
                        }
                    },
                    onExit: () => {
                        if (typeof closeSettings === 'function') {
                            closeSettings();
                        } else if (typeof closeBottomSettings === 'function') {
                            closeBottomSettings();
                        }
                    }
                },
                {
                    title: '切换项目空间',
                    desc: '点击这里进入项目空间查看你的项目。',
                    target: '#teamTab',
                    onEnter: () => switchSidebarTab('team')
                },
                {
                    title: '查看项目面板',
                    desc: '点击项目卡片查看项目详情与流程面板。',
                    target: '.project-card',
                    onEnter: () => {
                        switchSidebarTab('team');
                    }
                },
                {
                    title: '项目详情面板',
                    desc: '这里展示项目概览、流程阶段与交付物。',
                    target: '#projectPanel',
                    onEnter: () => {
                        switchSidebarTab('team');
                        setTimeout(() => {
                            const firstCard = document.querySelector('.project-card');
                            if (firstCard && typeof window.projectManager?.openProject === 'function') {
                                window.projectManager.openProject(firstCard.dataset.projectId);
                            }
                        }, 100);
                    }
                }
            ];

            let current = 0;

            function finishOnboarding() {
                overlay.style.display = 'none';
                localStorage.setItem('thinkcraft_onboarding_done', 'true');
                if (typeof closeSettings === 'function') {
                    closeSettings();
                } else if (typeof closeBottomSettings === 'function') {
                    closeBottomSettings();
                }
                if (window.projectManager) {
                    window.projectManager.closeProjectPanel();
                }
                if (typeof switchSidebarTab === 'function') {
                    switchSidebarTab('chats');
                }
            }

            function positionTooltip(rect) {
                const padding = 12;
                const tooltipRect = tooltip.getBoundingClientRect();
                let top = rect.bottom + padding;
                let left = rect.left;

                if (top + tooltipRect.height > window.innerHeight) {
                    top = rect.top - tooltipRect.height - padding;
                }
                if (left + tooltipRect.width > window.innerWidth) {
                    left = window.innerWidth - tooltipRect.width - padding;
                }
                if (left < padding) {
                    left = padding;
                }
                if (top < padding) {
                    top = padding;
                }

                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
            }

            function showStep(index, retry = 0) {
                if (index < 0 || index >= steps.length) {
                    finishOnboarding();
                    return;
                }

                const prevStep = steps[current];
                if (prevStep && typeof prevStep.onExit === 'function') {
                    prevStep.onExit();
                }

                current = index;
                const step = steps[current];

                if (typeof step.onEnter === 'function') {
                    step.onEnter();
                }

                const target = typeof step.target === 'function'
                    ? step.target()
                    : document.querySelector(step.target);

                if (!target) {
                    if (retry < 6) {
                        setTimeout(() => showStep(index, retry + 1), 200);
                        return;
                    }
                    showStep(index + 1);
                    return;
                }

                const rect = target.getBoundingClientRect();
                const pad = 6;
                highlight.style.top = `${rect.top - pad}px`;
                highlight.style.left = `${rect.left - pad}px`;
                highlight.style.width = `${rect.width + pad * 2}px`;
                highlight.style.height = `${rect.height + pad * 2}px`;

                titleEl.textContent = step.title;
                descEl.textContent = step.desc;
                stepEl.textContent = `${current + 1} / ${steps.length}`;

                btnPrev.disabled = current === 0;
                btnNext.textContent = current === steps.length - 1 ? '完成' : '下一步';

                positionTooltip(rect);
            }

            btnPrev.addEventListener('click', () => showStep(current - 1));
            btnNext.addEventListener('click', () => showStep(current + 1));
            btnSkip.addEventListener('click', finishOnboarding);
            window.addEventListener('resize', () => showStep(current));

            overlay.style.display = 'block';
            showStep(0);
        }

        window.addEventListener('load', () => {
            setTimeout(initOnboarding, 300);
        });

        

// 暴露团队空间函数到全局作用域
window.hireTeamAgent = hireTeamAgent;
window.fireTeamAgent = fireTeamAgent;
window.fireProjectAgent = fireProjectAgent;

// 暴露核心函数到全局作用域
window.loadChats = loadChats;
window.loadSettings = loadSettings;
window.focusInput = focusInput;
window.updateUserNameDisplay = updateUserNameDisplay;
window.autoResize = autoResize;
window.handleKeyDown = handleKeyDown;
window.handleKeyUp = handleKeyUp;
window.handleCompositionStart = handleCompositionStart;
window.handleCompositionEnd = handleCompositionEnd;
window.sendMessage = sendMessage;
window.showSettings = showSettings;
window.startNewChat = startNewChat;
window.switchSidebarTab = switchSidebarTab;
window.toggleSidebar = toggleSidebar;
window.openBottomSettings = openBottomSettings;
window.handleCamera = handleCamera;
window.handleImageUpload = handleImageUpload;
window.switchToTextMode = switchToTextMode;
window.switchToVoiceMode = switchToVoiceMode;
window.startProjectTeamCollaboration = startProjectTeamCollaboration;
window.generateDetailedReport = generateDetailedReport;
window.regenerateInsightsReport = regenerateInsightsReport;
window.getAgentIconSvg = getAgentIconSvg;
window.canShareReport = canShareReport;
window.updateShareLinkButtonVisibility = updateShareLinkButtonVisibility;
window.viewReport = viewReport;
window.showShareCard = showShareCard;
window.updateShareCard = updateShareCard;
