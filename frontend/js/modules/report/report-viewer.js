/**
 * 报告查看器模块
 * 负责显示和管理各类报告的查看界面
 */

/* eslint-disable no-unused-vars, no-undef */

class ReportViewer {
    constructor() {
        this.state = window.state;
    }

    /**
     * 查看报告
     */
    async viewReport() {
        const reportModal = document.getElementById('reportModal');
        const reportContent = document.getElementById('reportContent');

        reportModal.style.display = 'flex';
        reportContent.innerHTML = '<div style="text-align: center; padding: 60px 20px;"><div class="loading-spinner"></div><div style="margin-top: 20px;">正在加载报告...</div></div>';

        // 尝试从缓存或数据库加载报告
        if (window.storageManager && state.currentChat) {
            try {
                const reportEntry = await window.storageManager.getReport('analysis', String(state.currentChat).trim());

                if (reportEntry && reportEntry.status === 'completed' && reportEntry.data) {
                    this.renderAIReport(reportEntry.data);
                    if (typeof setAnalysisActionsEnabled === 'function') {
                        setAnalysisActionsEnabled(true);
                    }
                    if (typeof updateShareLinkButtonVisibility === 'function') {
                        updateShareLinkButtonVisibility();
                    }
                    return;
                }

                if (reportEntry && reportEntry.status === 'error') {
                    reportContent.innerHTML = `
                        <div style="text-align: center; padding: 60px 20px;">
                            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                            <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                                报告生成失败
                            </div>
                            <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                                ${reportEntry.error?.message || '生成报告时发生未知错误'}
                            </div>
                            <button class="btn-primary" onclick="regenerateInsightsReport()">重新生成</button>
                        </div>
                    `;
                    return;
                }
            } catch (error) {
                console.error('[查看报告] 数据库查询失败:', error);
            }
        }

        // 没有报告，尝试生成
        requestAnimationFrame(() => {
            if (typeof fetchCachedAnalysisReport === 'function') {
                fetchCachedAnalysisReport().then(cached => {
                    if (cached) return;
                    if (typeof generateDetailedReport === 'function') {
                        generateDetailedReport(true).catch(() => {});
                    }
                });
            }
        });
    }

    /**
     * 渲染AI报告
     * @param {Object} report - 报告数据
     */
    renderAIReport(report) {
        const reportContent = document.getElementById('reportContent');

        if (!report || !report.chapters) {
            reportContent.innerHTML = '<div style="text-align: center; padding: 60px 20px;">报告数据格式错误</div>';
            return;
        }

        window.lastGeneratedReport = report;

        let html = `
            <div class="report-header">
                <h1 class="report-title">${report.title || '创意分析报告'}</h1>
                <div class="report-meta">
                    <span>生成时间：${new Date().toLocaleString('zh-CN')}</span>
                </div>
            </div>
            <div class="report-body">
        `;

        report.chapters.forEach((chapter, index) => {
            html += `
                <div class="report-chapter">
                    <h2 class="chapter-title">${index + 1}. ${chapter.title}</h2>
                    <div class="chapter-content markdown-content">
                        ${window.markdownRenderer ? window.markdownRenderer.render(chapter.content) : chapter.content}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        reportContent.innerHTML = html;
    }

    /**
     * 关闭报告
     */
    closeReport() {
        document.getElementById('reportModal').style.display = 'none';
    }
}

// 创建全局实例
window.reportViewer = new ReportViewer();

// 暴露全局函数（向后兼容）
function viewReport() {
    window.reportViewer.viewReport();
}

function closeReport() {
    window.reportViewer.closeReport();
}
