/**
 * 分享卡片模块
 * 负责生成和管理报告分享功能
 */

/* eslint-disable no-unused-vars, no-undef */

class ShareCard {
    constructor() {
        this.state = window.state;
        this.generatedCard = null;
        this.generatedCardChatId = null;
        this.generatedCardError = null;
    }

    /**
     * 显示分享卡片
     */
    showShareCard() {
        if (!window.lastGeneratedReport) {
            alert('请先生成报告');
            return;
        }

        const modal = document.getElementById('shareModal');
        if (!modal) {
            console.error('分享模态框不存在');
            return;
        }

        modal.style.display = 'flex';
        this.prepareShareCardData().then(() => this.updateShareCard());
    }

    /**
     * 更新分享卡片内容
     */
    updateShareCard() {
        const report = window.lastGeneratedReport;
        if (!report) return;

        if (this.generatedCardError && !this.generatedCard) {
            this.renderShareCardError(this.generatedCardError);
            return;
        }

        const cardData = this.generatedCard || {};
        const ideaTitle = cardData.ideaTitle || report.title || '创意分析报告';
        const tags = Array.isArray(cardData.tags) ? cardData.tags : [];
        const scores = cardData.scores || {};
        const summary = cardData.summary || '';
        const highlights = Array.isArray(cardData.highlights)
            ? cardData.highlights
            : Array.isArray(cardData.keyHighlights)
                ? cardData.keyHighlights
                : [];
        const oneLineValue =
            cardData.oneLineValue ||
            cardData.valueProposition ||
            cardData.valueProp ||
            '';

        const shareIdeaTitle = document.getElementById('shareIdeaTitle');
        if (shareIdeaTitle) {
            shareIdeaTitle.textContent = ideaTitle;
        }

        const shareTag1 = document.getElementById('shareTag1');
        const shareTag2 = document.getElementById('shareTag2');
        if (shareTag1) {
            shareTag1.textContent = tags[0] || '创意洞察';
        }
        if (shareTag2) {
            shareTag2.textContent = tags[1] || 'AI分析';
        }

        const cardMain = document.querySelector('.share-card-main');
        if (cardMain) {
            let valueNode = cardMain.querySelector('.share-card-value');
            if (!valueNode) {
                valueNode = document.createElement('div');
                valueNode.className = 'share-card-value';
                cardMain.appendChild(valueNode);
            }
            valueNode.textContent = oneLineValue || '一句话价值未生成';

            let highlightWrap = cardMain.querySelector('.share-card-highlights');
            if (!highlightWrap) {
                highlightWrap = document.createElement('div');
                highlightWrap.className = 'share-card-highlights';
                cardMain.appendChild(highlightWrap);
            }
            if (highlights.length > 0) {
                highlightWrap.innerHTML = highlights
                    .slice(0, 3)
                    .map(item => `<span class="share-highlight-item">${item}</span>`)
                    .join('');
            } else {
                highlightWrap.innerHTML = '<span class="share-highlight-empty">亮点未生成</span>';
            }
        }

        const scoreNodes = document.querySelectorAll('.share-stat-value');
        if (scoreNodes.length >= 3) {
            scoreNodes[0].textContent = Number.isFinite(scores.feasibility) ? scores.feasibility : 75;
            scoreNodes[1].textContent = Number.isFinite(scores.innovation) ? scores.innovation : 75;
            scoreNodes[2].textContent = Number.isFinite(scores.marketPotential) ? scores.marketPotential : 75;
        }

        const shareDate = document.getElementById('shareDate');
        if (shareDate) {
            shareDate.textContent = new Date().toLocaleDateString('zh-CN');
        }

        const summaryNode = document.querySelector('.share-card-body p');
        if (summaryNode) {
            summaryNode.textContent = summary || '模型生成结果待展示';
        }
    }

    async prepareShareCardData() {
        const chatId = this.state?.currentChat;
        if (!chatId) {
            return;
        }
        if (this.generatedCard && this.generatedCardChatId === String(chatId)) {
            return;
        }
        const messages = Array.isArray(this.state?.messages) ? this.state.messages : [];
        if (messages.length === 0) {
            return;
        }

        try {
            this.generatedCardError = null;
            const authToken = window.getAuthToken ? window.getAuthToken() : null;
            const response = await fetch(`${this.state.settings.apiUrl}/api/share/generate-card`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({
                    messages: messages.map(msg => ({
                        role: msg.role || (msg.sender === 'user' ? 'user' : 'assistant'),
                        content: msg.content || msg.text || ''
                    })).filter(msg => msg.content)
                })
            });

            if (!response.ok) {
                throw new Error(`API错误: ${response.status}`);
            }
            const data = await response.json();
            if (data.code !== 0) {
                throw new Error(data.error || '生成分享卡片失败');
            }
            this.generatedCard = data.data || null;
            this.generatedCardChatId = String(chatId);
        } catch (error) {
            console.error('[分享卡片] 生成失败，使用默认内容:', error);
            this.generatedCard = null;
            this.generatedCardError = error?.message || '模型生成失败';
        }
    }

    renderShareCardError(message) {
        const shareIdeaTitle = document.getElementById('shareIdeaTitle');
        if (shareIdeaTitle) {
            shareIdeaTitle.textContent = '分享卡片生成失败';
        }

        const shareTag1 = document.getElementById('shareTag1');
        const shareTag2 = document.getElementById('shareTag2');
        if (shareTag1) {
            shareTag1.textContent = '模型调用异常';
        }
        if (shareTag2) {
            shareTag2.textContent = '请重试';
        }

        const scoreNodes = document.querySelectorAll('.share-stat-value');
        scoreNodes.forEach(node => {
            node.textContent = '--';
        });

        const summaryNode = document.querySelector('.share-card-body p');
        if (summaryNode) {
            summaryNode.textContent = message || '模型生成失败，请重试。';
        }

        const cardMain = document.querySelector('.share-card-main');
        if (cardMain) {
            let valueNode = cardMain.querySelector('.share-card-value');
            if (!valueNode) {
                valueNode = document.createElement('div');
                valueNode.className = 'share-card-value';
                cardMain.appendChild(valueNode);
            }
            valueNode.textContent = '一句话价值未生成';

            let highlightWrap = cardMain.querySelector('.share-card-highlights');
            if (!highlightWrap) {
                highlightWrap = document.createElement('div');
                highlightWrap.className = 'share-card-highlights';
                cardMain.appendChild(highlightWrap);
            }
            highlightWrap.innerHTML = '<span class="share-highlight-empty">亮点未生成</span>';
        }

        const actions = document.querySelector('.share-actions');
        if (actions && !document.getElementById('shareRetryBtn')) {
            const retryBtn = document.createElement('button');
            retryBtn.id = 'shareRetryBtn';
            retryBtn.className = 'share-action-btn primary';
            retryBtn.innerHTML = `
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v6h6M20 20v-6h-6"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 9a7 7 0 00-12.94-2M4 15a7 7 0 0012.94 2"/>
                </svg>
                重试生成
            `;
            retryBtn.onclick = async () => {
                await this.prepareShareCardData();
                this.updateShareCard();
            };
            actions.prepend(retryBtn);
        }
    }

    /**
     * 生成分享链接
     */
    async generateShareLink() {
        if (!window.lastGeneratedReport) {
            alert('请先生成报告');
            return;
        }

        try {
            if (window.requireAuth) {
                const ok = await window.requireAuth({ redirect: true, prompt: true });
                if (!ok) {
                    return;
                }
            }
            const authToken = window.getAuthToken ? window.getAuthToken() : null;
            const report = window.lastGeneratedReport;
            const shareTitle =
                report?.title ||
                window.state?.userData?.idea ||
                window.state?.userData?.title ||
                '创意分析报告';
            const response = await fetch(`${state.settings.apiUrl}/api/share/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({
                    type: report?.type || 'analysis',
                    data: report,
                    title: shareTitle
                })
            });

            if (!response.ok) {
                let detail = '';
                try {
                    const errorBody = await response.json();
                    detail = errorBody?.error || errorBody?.message || '';
                } catch (err) {}
                throw new Error(`API错误: ${response.status}${detail ? `（${detail}）` : ''}`);
            }

            const data = await response.json();

            if (data.code !== 0) {
                throw new Error(data.error || '生成分享链接失败');
            }

            const shareUrl = data?.data?.shareUrl || `${window.location.origin}/share/${data.data.shareId}`;

            // 弹窗展示分享卡片（不再仅复制）
            this.showShareCard();
            await this.prepareShareCardData();
            this.updateShareCard();

            const shareLinkInput = document.getElementById('shareLinkInput');
            if (shareLinkInput) {
                shareLinkInput.value = shareUrl;
                shareLinkInput.focus();
                shareLinkInput.select();
            }

            const shareLinkDisplay = document.getElementById('shareLinkDisplay');
            if (shareLinkDisplay) {
                shareLinkDisplay.textContent = shareUrl;
            }

            const shareLinkBtn = document.getElementById('copyShareLinkBtn');
            if (shareLinkBtn) {
                shareLinkBtn.onclick = async () => {
                    try {
                        await navigator.clipboard.writeText(shareUrl);
                        alert('分享链接已复制到剪贴板！');
                    } catch (err) {
                        alert('复制失败，请手动复制');
                    }
                };
            }

        } catch (error) {
            console.error('[生成分享链接] 失败:', error);
            alert('生成分享链接失败：' + error.message);
        }
    }

    /**
     * 下载分享卡片
     */
    downloadCard() {
        alert('下载功能开发中...');
    }

    /**
     * 复制分享文本
     */
    async copyShareText() {
        if (!window.lastGeneratedReport) {
            alert('请先生成报告');
            return;
        }

        const report = window.lastGeneratedReport;
        const text = `【${report.title || '创意分析报告'}】\n\n${report.chapters[0]?.content.substring(0, 200)}...\n\n由 ThinkCraft AI 生成`;

        try {
            await navigator.clipboard.writeText(text);
            alert('分享文本已复制到剪贴板！');
        } catch (error) {
            console.error('[复制分享文本] 失败:', error);
            alert('复制失败，请手动复制');
        }
    }

    /**
     * 关闭分享模态框
     */
    closeShareModal() {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// 创建全局实例
window.shareCard = new ShareCard();

// 暴露全局函数（向后兼容）
function showShareCard() {
    window.shareCard.showShareCard();
}

function generateShareLink() {
    return window.shareCard.generateShareLink();
}

function downloadCard() {
    window.shareCard.downloadCard();
}

function copyShareText() {
    return window.shareCard.copyShareText();
}

function closeShareModal() {
    window.shareCard.closeShareModal();
}

// 暴露到全局（用于 HTML onclick 事件）
window.showShareCard = showShareCard;
window.generateShareLink = generateShareLink;
window.downloadCard = downloadCard;
window.copyShareText = copyShareText;
window.closeShareModal = closeShareModal;
