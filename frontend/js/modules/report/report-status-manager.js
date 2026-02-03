/* global normalizeChatId */

/**
 * 报告状态管理器
 *
 * @description
 * 负责管理报告按钮的显示状态，验证 IndexedDB 中的报告状态，
 * 提供内存缓存机制避免频繁查询数据库。
 *
 * @class ReportStatusManager
 */
class ReportStatusManager {
    constructor() {
        /**
         * 内存缓存
         * key: `${chatId}:${type}`
         * value: { report, timestamp }
         */
        this.cache = new Map();

        /**
         * 缓存过期时间（毫秒）
         */
        this.CACHE_TTL = 30000; // 30秒

        /**
         * 报告生成超时时间（毫秒）
         */
        this.TIMEOUT_MS = 30 * 60 * 1000; // 30分钟
    }

    /**
     * 检查是否应该显示"查看报告"按钮
     *
     * @param {String} chatId - 会话ID
     * @param {String} type - 报告类型 ('analysis' | 'business' | 'proposal')
     * @returns {Promise<Object>} { shouldShow, buttonText, buttonState, reason }
     */
    async shouldShowReportButton(chatId, type = 'analysis') {
        const normalizedChatId = normalizeChatId(chatId);
        if (!normalizedChatId) {
            return { shouldShow: false, reason: 'no_chat_id' };
        }

        // 1. 检查缓存
        const cached = this.getFromCache(normalizedChatId, type);
        if (cached) {
            return this.determineButtonState(cached);
        }

        // 2. 从 IndexedDB 查询报告
        const report = await this.queryReport(normalizedChatId, type);

        // 3. 更新缓存
        this.updateCache(normalizedChatId, type, report);

        // 4. 返回按钮状态
        return this.determineButtonState(report);
    }

    /**
     * 从缓存获取报告
     *
     * @param {String} chatId - 会话ID
     * @param {String} type - 报告类型
     * @returns {Object|null} 报告对象或null
     */
    getFromCache(chatId, type) {
        const key = `${chatId}:${type}`;
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        // 检查缓存是否过期
        if (Date.now() - cached.timestamp > this.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }

        return cached.report;
    }

    /**
     * 更新缓存
     *
     * @param {String} chatId - 会话ID
     * @param {String} type - 报告类型
     * @param {Object|null} report - 报告对象
     */
    updateCache(chatId, type, report) {
        const key = `${chatId}:${type}`;
        this.cache.set(key, {
            report,
            timestamp: Date.now()
        });
    }

    /**
     * 清除缓存
     *
     * @param {String} chatId - 会话ID（可选）
     * @param {String} type - 报告类型（可选）
     */
    clearCache(chatId = null, type = null) {
        if (chatId && type) {
            const key = `${chatId}:${type}`;
            this.cache.delete(key);
        } else if (chatId) {
            // 清除该会话的所有报告缓存
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${chatId}:`)) {
                    this.cache.delete(key);
                }
            }
        } else {
            // 清除所有缓存
            this.cache.clear();
        }
    }

    /**
     * 从 IndexedDB 查询报告
     *
     * @param {String} chatId - 会话ID
     * @param {String} type - 报告类型
     * @returns {Promise<Object|null>} 报告对象或null
     */
    async queryReport(chatId, type) {
        if (!window.storageManager) {
            console.warn('[ReportStatusManager] storageManager 未初始化');
            return null;
        }

        try {
            const normalizedChatId = String(chatId).trim();
            const report = await window.storageManager.getReportByChatIdAndType(
                normalizedChatId,
                type
            );
            return report;
        } catch (error) {
            console.error('[ReportStatusManager] 查询报告失败:', error);
            return null;
        }
    }

    /**
     * 根据报告状态确定按钮状态
     *
     * @param {Object|null} report - 报告对象
     * @returns {Object} { shouldShow, buttonText, buttonState, reason }
     */
    determineButtonState(report) {
        // 没有报告
        if (!report) {
            return {
                shouldShow: false,
                reason: 'no_report'
            };
        }

        const status = report.status;

        // 兼容旧数据：缺少status但已有报告数据
        if (!status) {
            if (this.validateReportData(report)) {
                return {
                    shouldShow: true,
                    buttonText: '查看完整报告',
                    buttonState: 'completed',
                    reason: 'legacy_no_status'
                };
            }
            return {
                shouldShow: true,
                buttonText: '报告数据不完整，点击重新生成',
                buttonState: 'error',
                reason: 'legacy_incomplete_data'
            };
        }

        // 生成中
        if (status === 'generating') {
            // 生成中但缺少开始时间，视为异常状态，避免永久卡住
            if (!report.startTime || Number.isNaN(Number(report.startTime))) {
                return {
                    shouldShow: true,
                    buttonText: '生成状态异常，点击重试',
                    buttonState: 'error',
                    reason: 'invalid_start_time'
                };
            }

            // 检查是否超时
            if ((Date.now() - report.startTime) > this.TIMEOUT_MS) {
                return {
                    shouldShow: true,
                    buttonText: '生成超时，点击重试',
                    buttonState: 'error',
                    reason: 'timeout'
                };
            }

            const percentage = report.progress?.percentage || 0;
            return {
                shouldShow: true,
                buttonText: `生成中 ${percentage}%`,
                buttonState: 'generating',
                reason: 'generating'
            };
        }

        // 已完成
        if (status === 'completed') {
            // 验证报告数据完整性
            if (!this.validateReportData(report)) {
                return {
                    shouldShow: true,
                    buttonText: '报告数据不完整，点击重新生成',
                    buttonState: 'error',
                    reason: 'incomplete_data'
                };
            }

            return {
                shouldShow: true,
                buttonText: '查看完整报告',
                buttonState: 'completed',
                reason: 'completed'
            };
        }

        // 生成失败
        if (status === 'error') {
            return {
                shouldShow: true,
                buttonText: '生成失败，点击重试',
                buttonState: 'error',
                reason: 'error'
            };
        }

        // 其他状态（pending等）
        return {
            shouldShow: false,
            reason: 'not_ready'
        };
    }

    /**
     * 验证报告数据完整性
     *
     * @param {Object} report - 报告对象
     * @returns {Boolean} 数据是否完整
     */
    validateReportData(report) {
        if (!report || !report.data) {
            return false;
        }

        const data = report.data;
        const type = report.type;

        // 根据报告类型验证
        if (type === 'analysis') {
            if (!data) {
                return false;
            }
            if (data.chapters === undefined) {
                console.warn('[ReportStatusManager] 分析报告缺少 chapters 字段，仍允许显示');
                return true;
            }
            return Array.isArray(data.chapters) || typeof data.chapters === 'object';
        }

        if (type === 'business' || type === 'proposal') {
            // 商业计划书和产品立项材料都使用 chapters 结构
            // 可以是数组或对象格式
            if (data.chapters) {
                return Array.isArray(data.chapters) || typeof data.chapters === 'object';
            }
            // 兼容旧的 document 格式
            if (data.document && typeof data.document === 'string') {
                return true;
            }
            return false;
        }

        // 未知类型，默认通过
        return true;
    }

    /**
     * 报告状态变化时的回调
     * 用于清除缓存，确保下次查询获取最新状态
     *
     * @param {String} chatId - 会话ID
     * @param {String} type - 报告类型
     * @param {String} newStatus - 新状态
     */
    onReportStatusChange(chatId, type, newStatus) {
        console.log(`[ReportStatusManager] 报告状态变化: ${chatId}:${type} -> ${newStatus}`);
        this.clearCache(chatId, type);
    }

    /**
     * 获取缓存统计信息（用于调试）
     *
     * @returns {Object} { size, keys }
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// 导出为全局变量
if (typeof window !== 'undefined') {
    window.ReportStatusManager = ReportStatusManager;
}

// 支持模块化导入
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReportStatusManager;
}
