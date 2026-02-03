/**
 * 打字机效果模块
 * 提供AI回复的打字机动画效果
 */

/* eslint-disable no-unused-vars, no-undef */

class TypingEffect {
    constructor() {
        this.currentTimer = null;
    }

    /**
     * 基础打字机效果
     * @param {HTMLElement} element - 目标元素
     * @param {string} text - 要显示的文本
     * @param {number} speed - 打字速度（毫秒）
     * @param {number|null} chatId - 会话ID
     */
    typeWriter(element, text, speed = 30, chatId = null) {
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

        this.currentTimer = timer;
    }

    /**
     * 带完成回调的打字机效果（支持分析完成标记）
     * @param {HTMLElement} textElement - 文本元素
     * @param {HTMLElement} actionElement - 操作按钮元素
     * @param {string} text - 要显示的文本
     * @param {number} speed - 打字速度（毫秒）
     * @param {number|null} chatId - 会话ID
     */
    typeWriterWithCompletion(textElement, actionElement, text, speed = 30, chatId = null) {
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

                // 打字完成后：检测到标记时，验证报告状态后显示按钮
                if (hasAnalysisMarker) {
                    state.analysisCompleted = true;
                    if (window.stateManager?.setAnalysisCompleted) {
                        window.stateManager.setAnalysisCompleted(targetChatId, true);
                    }

                    // 预取分析报告
                    if (typeof prefetchAnalysisReport === 'function') {
                        prefetchAnalysisReport();
                    }

                    const currentChat = state.chats.find(c => c.id == targetChatId);
                    if (currentChat) {
                        currentChat.analysisCompleted = true;
                        currentChat.updatedAt = Date.now();
                    }
                    if (window.storageManager && currentChat) {
                        window.storageManager.saveChat(currentChat).catch(() => {});
                    }

                    // 验证报告状态后再显示按钮
                    const renderReportButton = (state) => {
                        const buttonState = state?.buttonState || 'generating';
                        const buttonText = state?.buttonText || '报告生成中...';

                        actionElement.style.display = 'flex';
                        actionElement.innerHTML = `
                            <button class="view-report-btn ${buttonState}"
                                    onclick="viewReport()"
                                    data-state="${buttonState}">
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                ${buttonText}
                            </button>
                        `;

                    };

                    const pollReportStatus = (chatId) => {
                        if (!chatId || !window.reportStatusManager) {
                            return;
                        }

                        const maxRetries = 20;
                        let retries = 0;

                        const timer = setInterval(() => {
                            retries += 1;
                            window.reportStatusManager.shouldShowReportButton(chatId, 'analysis')
                                .then(buttonState => {
                                    if (buttonState.shouldShow) {
                                        clearInterval(timer);
                                        renderReportButton(buttonState);
                                    } else if (retries >= maxRetries) {
                                        clearInterval(timer);
                                    }
                                })
                                .catch(() => {
                                    if (retries >= maxRetries) {
                                        clearInterval(timer);
                                    }
                                });
                        }, 1500);
                    };

                    if (window.reportStatusManager) {
                        window.reportStatusManager.shouldShowReportButton(
                            targetChatId,
                            'analysis'
                        ).then(buttonState => {
                            if (buttonState.shouldShow) {
                                renderReportButton(buttonState);
                                return;
                            }

                            if (buttonState.reason === 'no_chat_id') {
                                return;
                            }

                            // 先显示“生成中”按钮，再轮询更新最终状态
                            renderReportButton({
                                buttonState: 'generating',
                                buttonText: '报告生成中...'
                            });
                            pollReportStatus(targetChatId);
                        }).catch(error => {
                            console.error('[TypingEffect] 验证报告状态失败:', error);
                            // 回退：显示默认按钮
                            renderReportButton({
                                buttonState: 'completed',
                                buttonText: '查看完整报告'
                            });
                        });
                    } else {
                        // 回退：reportStatusManager 未初始化，显示默认按钮
                        console.warn('[TypingEffect] reportStatusManager 未初始化，使用默认按钮');
                        renderReportButton({
                            buttonState: 'completed',
                            buttonText: '查看完整报告'
                        });
                    }
                }
            }
        }, speed);

        this.currentTimer = timer;
    }

    /**
     * 停止当前打字机效果
     */
    stop() {
        if (this.currentTimer) {
            clearInterval(this.currentTimer);
            this.currentTimer = null;
            state.isTyping = false;
            state.typingChatId = null;
        }
    }
}

// 创建全局实例
window.typingEffect = new TypingEffect();

// 暴露全局函数（向后兼容）
function typeWriter(element, text, speed = 30, chatId = null) {
    window.typingEffect.typeWriter(element, text, speed, chatId);
}

function typeWriterWithCompletion(textElement, actionElement, text, speed = 30, chatId = null) {
    window.typingEffect.typeWriterWithCompletion(textElement, actionElement, text, speed, chatId);
}
