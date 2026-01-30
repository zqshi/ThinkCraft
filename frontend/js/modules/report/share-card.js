/**
 * 分享卡片模块
 * 负责生成和管理报告分享功能
 */

/* eslint-disable no-unused-vars, no-undef */

class ShareCard {
    constructor() {
        this.state = window.state;
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
        this.updateShareCard();
    }

    /**
     * 更新分享卡片内容
     */
    updateShareCard() {
        const report = window.lastGeneratedReport;
        if (!report) return;

        const cardContent = document.getElementById('shareCardContent');
        if (!cardContent) return;

        const summary = report.chapters && report.chapters.length > 0
            ? report.chapters[0].content.substring(0, 200) + '...'
            : '查看完整分析报告';

        cardContent.innerHTML = `
            <div class="share-card">
                <div class="share-card-header">
                    <h3>${report.title || '创意分析报告'}</h3>
                    <div class="share-card-meta">ThinkCraft AI 生成</div>
                </div>
                <div class="share-card-body">
                    <p>${summary}</p>
                </div>
                <div class="share-card-footer">
                    <span>生成时间：${new Date().toLocaleString('zh-CN')}</span>
                </div>
            </div>
        `;
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
            const response = await fetch(`${state.settings.apiUrl}/api/share/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    report: window.lastGeneratedReport,
                    chatId: state.currentChat
                })
            });

            if (!response.ok) {
                throw new Error(`API错误: ${response.status}`);
            }

            const data = await response.json();

            if (data.code !== 0) {
                throw new Error(data.error || '生成分享链接失败');
            }

            const shareUrl = `${window.location.origin}/share/${data.data.shareId}`;

            // 复制到剪贴板
            await navigator.clipboard.writeText(shareUrl);
            alert('分享链接已复制到剪贴板！\n\n' + shareUrl);

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
