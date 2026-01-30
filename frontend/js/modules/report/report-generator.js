/**
 * 报告生成器模块
 * 负责生成各类分析报告
 */

/* eslint-disable no-unused-vars, no-undef */

class ReportGenerator {
    constructor() {
        this.state = window.state;
    }

    /**
     * 生成详细报告
     * @param {boolean} forceRegenerate - 是否强制重新生成
     */
    async generateDetailedReport(forceRegenerate = false) {
        if (!state.currentChat) {
            alert('请先开始一个对话');
            return;
        }

        if (state.messages.length === 0) {
            alert('对话内容为空，无法生成报告');
            return;
        }

        const reportContent = document.getElementById('reportContent');
        reportContent.innerHTML = '<div style="text-align: center; padding: 60px 20px;"><div class="loading-spinner"></div><div style="margin-top: 20px;">正在生成报告...</div></div>';

        try {
            const response = await fetch(`${state.settings.apiUrl}/api/analysis/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: state.messages,
                    chatId: state.currentChat
                })
            });

            if (!response.ok) {
                throw new Error(`API错误: ${response.status}`);
            }

            const data = await response.json();

            if (data.code !== 0) {
                throw new Error(data.error || '生成报告失败');
            }

            const report = data.data;
            window.lastGeneratedReport = report;

            // 保存到数据库
            if (window.storageManager) {
                await window.storageManager.saveReport({
                    type: 'analysis',
                    chatId: String(state.currentChat).trim(),
                    data: report,
                    status: 'completed',
                    progress: { current: 1, total: 1, percentage: 100 },
                    startTime: Date.now(),
                    endTime: Date.now(),
                    error: null
                });
            }

            // 渲染报告
            if (window.reportViewer) {
                window.reportViewer.renderAIReport(report);
            }

        } catch (error) {
            console.error('[生成报告] 失败:', error);
            reportContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text-primary); margin-bottom: 12px;">
                        报告生成失败
                    </div>
                    <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                        ${error.message}
                    </div>
                    <button class="btn-primary" onclick="regenerateInsightsReport()">重试</button>
                </div>
            `;
        }
    }

    /**
     * 重新生成报告
     */
    async regenerateInsightsReport() {
        if (!confirm('确定要重新生成分析报告吗？\n\n这将使用AI重新分析您的创意对话，可能会生成不同的洞察内容。')) {
            return;
        }

        window.lastGeneratedReport = null;
        window.lastGeneratedReportKey = null;
        window.analysisReportGenerationInFlight = false;

        if (window.storageManager && state.currentChat) {
            try {
                await window.storageManager.saveReport({
                    type: 'analysis',
                    chatId: String(state.currentChat).trim(),
                    data: null,
                    status: 'generating',
                    progress: { current: 0, total: 1, percentage: 0 },
                    startTime: Date.now(),
                    endTime: null,
                    error: null
                });
            } catch (error) {
                console.error('[重新生成] 保存状态失败:', error);
            }
        }

        await this.generateDetailedReport(true);
    }

    /**
     * 导出完整报告
     */
    exportFullReport() {
        if (!window.lastGeneratedReport) {
            alert('请先生成报告');
            return;
        }

        const report = window.lastGeneratedReport;
        let markdown = `# ${report.title || '创意分析报告'}\n\n`;
        markdown += `生成时间：${new Date().toLocaleString('zh-CN')}\n\n---\n\n`;

        report.chapters.forEach((chapter, index) => {
            markdown += `## ${index + 1}. ${chapter.title}\n\n`;
            markdown += `${chapter.content}\n\n`;
        });

        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.title || '创意分析报告'}_${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 创建全局实例
window.reportGenerator = new ReportGenerator();

// 暴露全局函数（向后兼容）
function generateDetailedReport(forceRegenerate = false) {
    return window.reportGenerator.generateDetailedReport(forceRegenerate);
}

function regenerateInsightsReport() {
    return window.reportGenerator.regenerateInsightsReport();
}

function exportFullReport() {
    window.reportGenerator.exportFullReport();
}
