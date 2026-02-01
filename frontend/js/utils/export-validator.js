/**
 * 导出验证工具
 * 统一的导出前状态检查和数据验证
 *
 * @class ExportValidator
 * @description
 * - 从StateManager检查生成状态
 * - 从IndexedDB检查数据完整性
 * - 返回标准化验证结果
 */
class ExportValidator {
    constructor(stateManager, storageManager) {
        this.stateManager = stateManager;
        this.storageManager = storageManager;
    }

    /**
     * 验证是否可以导出报告
     * @param {string} reportType - 报告类型：analysis, business, proposal
     * @param {string|number} chatId - 会话ID
     * @returns {Promise<Object>} 验证结果
     *
     * @example
     * const result = await validator.validateExport('analysis', chatId);
     * if (result.valid) {
     *   // 使用 result.data 导出
     * } else {
     *   // 显示 result.error
     * }
     */
    async validateExport(reportType, chatId) {
        // 1. 检查会话ID
        if (!chatId) {
            return {
                valid: false,
                error: '无法获取当前会话ID',
                action: 'close'
            };
        }

        // 统一chatId为字符串
        const normalizedChatId = String(chatId).trim();

        // 2. 检查生成状态
        if (this.stateManager) {
            const genState = this.stateManager.getGenerationState(normalizedChatId);
            if (genState && genState[reportType]) {
                const status = genState[reportType].status;

                if (status === 'generating') {
                    const progress = genState[reportType].progress;
                    // 根据报告类型返回不同的提示
                    const reportTypeName = reportType === 'analysis' ? '分析报告' :
                                          reportType === 'business' ? '商业计划书' : '产品立项材料';
                    return {
                        valid: false,
                        error: `${reportTypeName}生成中，稍后重试`,
                        detail: `已完成 ${progress.current}/${progress.total} 个章节（${progress.percentage}%）`,
                        action: 'wait',
                        progress: progress
                    };
                }
            }
        }

        // 3. 获取报告数据
        let reportData = null;
        if (this.storageManager) {
            try {
                // 使用正确的 API
                const reportEntry = await this.storageManager.getReportByChatIdAndType(
                    normalizedChatId,
                    reportType
                );
                if (reportEntry && reportEntry.data) {
                    reportData = reportEntry.data;
                }
            } catch (error) {
                console.error('[ExportValidator] 数据库查询失败:', error);
            }
        }

        // 4. 检查数据完整性
        if (!reportData) {
            return {
                valid: false,
                error: '未找到报告数据',
                detail: '请先生成报告',
                action: 'generate'
            };
        }

        // 5. 验证数据结构
        const dataValid = this.validateReportData(reportType, reportData);
        if (!dataValid.valid) {
            return {
                valid: false,
                error: '报告数据不完整',
                detail: dataValid.reason,
                action: 'regenerate'
            };
        }

        // 6. 验证通过
        return {
            valid: true,
            data: reportData
        };
    }

    /**
     * 验证报告数据结构
     * @param {string} reportType - 报告类型
     * @param {Object} reportData - 报告数据
     * @returns {Object} 验证结果 {valid: boolean, reason?: string}
     */
    validateReportData(reportType, reportData) {
        if (reportType === 'analysis') {
            // 分析报告必须有chapters对象
            if (!reportData.chapters || typeof reportData.chapters !== 'object') {
                return { valid: false, reason: '缺少chapters字段' };
            }
            // 检查6个章节
            for (let i = 1; i <= 6; i++) {
                if (!reportData.chapters[`chapter${i}`]) {
                    return { valid: false, reason: `缺少chapter${i}` };
                }
            }
        } else if (reportType === 'business' || reportType === 'proposal') {
            // 商业计划书/产品立项材料必须有chapters数组或document字符串
            if (!reportData.chapters && !reportData.document) {
                return { valid: false, reason: '缺少chapters或document字段' };
            }
        }
        return { valid: true };
    }
}
