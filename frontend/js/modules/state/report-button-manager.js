/**
 * 状态管理模块
 * 负责应用状态的保存、加载和管理
 */

/* global normalizeChatId */

/**
 * 获取指定会话的报告数据
 * @param {string} chatId - 会话ID
 * @returns {Object} 报告对象 { business: {...}, proposal: {...}, analysis: {...} }
 */
function getReportsForChat(chatId) {
    if (!window.state.generation) {
        window.state.generation = {};
    }
    if (!window.state.generation[chatId]) {
        window.state.generation[chatId] = {
            business: null,
            proposal: null,
            analysis: null
        };
    }
    return window.state.generation[chatId];
}

/**
 * 更新按钮内容（图标和文本）
 * @param {string} type - 报告类型 ('business', 'proposal', 'analysis')
 * @param {HTMLElement} iconSpan - 图标元素
 * @param {HTMLElement} textSpan - 文本元素
 * @param {string} status - 状态 ('idle', 'generating', 'completed', 'error')
 * @param {Object} progress - 进度对象（可选）
 */
function updateButtonContent(type, iconSpan, textSpan, status, progress) {
    if (!iconSpan || !textSpan) return;

    const typeConfig = {
        business: {
            idle: { icon: '📊', text: '生成商业计划书' },
            generating: { icon: '⏳', text: '生成中...' },
            completed: { icon: '✅', text: '查看商业计划书' },
            error: { icon: '❌', text: '生成失败，点击重试' }
        },
        proposal: {
            idle: { icon: '📝', text: '生成产品立项材料' },
            generating: { icon: '⏳', text: '生成中...' },
            completed: { icon: '✅', text: '查看立项材料' },
            error: { icon: '❌', text: '生成失败，点击重试' }
        },
        analysis: {
            idle: { icon: '📈', text: '生成分析报告' },
            generating: { icon: '⏳', text: '生成中...' },
            completed: { icon: '✅', text: '查看分析报告' },
            error: { icon: '❌', text: '生成失败，点击重试' }
        }
    };

    const config = typeConfig[type]?.[status];
    if (!config) return;

    iconSpan.textContent = config.icon;

    if (status === 'generating' && progress?.percentage !== undefined) {
        textSpan.textContent = `${config.text} ${Math.round(progress.percentage)}%`;
    } else {
        textSpan.textContent = config.text;
    }
}

// 创建日志实例
var logger = window.createLogger ? window.createLogger('ReportButton') : console;


class ReportButtonManager {
    constructor() {
        this.DEBUG_STATE = true;
    }

    /**
     * 保存当前会话的报告状态到IndexedDB
     * @param {string} chatId - 会话ID
     * @returns {Promise<void>}
     */
    async saveCurrentSessionState(chatId) {
        const normalizedChatId = normalizeChatId(chatId);
        if (!normalizedChatId || !window.storageManager) return;

        // 🔧 数据已经通过 persistGenerationState() 实时持久化到 IndexedDB
        // 不需要再次保存，避免从内存获取不完整的状态覆盖 IndexedDB 数据
        this.logStateChange('保存会话状态（跳过，数据已实时持久化）', { chatId: normalizedChatId });
    }

    /**
     * 统一的状态变化日志
     * @param {string} action - 操作名称
     * @param {Object} data - 附加数据
     */
    logStateChange(action, data) {
        if (!this.DEBUG_STATE) return;
        logger.debug(`[状态变化] ${action}`, {
            timestamp: new Date().toISOString(),
            currentChat: normalizeChatId(state.currentChat),
            ...data
        });
    }

    /**
     * 更新生成按钮状态（旧版本，保留用于兼容）
     * @param {Object} generationState - 生成状态对象
     */
    updateGenerationButtonStateOld(generationState) {
        // 🔧 添加空值检查
        if (!generationState) return;

        const type = generationState.type;
        if (!type) return;

        const btnMap = {
            'business': 'businessPlanBtn',
            'proposal': 'proposalBtn'
        };

        const btnId = btnMap[type];
        if (!btnId) return;

        const btn = document.getElementById(btnId);
        if (!btn) return;

        const iconSpan = btn.querySelector('.btn-icon');
        const textSpan = btn.querySelector('.btn-text');
        const status = generationState.status;
        const chatId = normalizeChatId(state.currentChat);
        const reports = getReportsForChat(chatId);

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
                btn.disabled = false; // 不禁用按钮，允许点击查看进度
                updateButtonContent(type, iconSpan, textSpan, 'generating', generationState.progress);
                // 保存生成中的数据，以便恢复进度
                reports[type] = {
                    data: generationState.results || {},
                    selectedChapters: generationState.selectedChapters || [],
                    chatId: chatId,
                    status: 'generating',
                    progress: generationState.progress
                };
                break;

            case 'completed':
                btn.classList.add('btn-completed');
                btn.dataset.status = 'completed';
                updateButtonContent(type, iconSpan, textSpan, 'completed');
                // 保存生成的报告
                reports[type] = {
                    data: generationState.results,
                    chatId: chatId,
                    status: 'completed',
                    progress: generationState.progress
                };
                break;

            case 'error':
                btn.classList.add('btn-error');
                btn.dataset.status = 'error';
                updateButtonContent(type, iconSpan, textSpan, 'error');
                reports[type] = {
                    ...(reports[type] || {}),
                    status: 'error',
                    progress: generationState.progress,
                    chatId: chatId
                };
                break;
        }
    }

    /**
     * 更新生成按钮状态
     * @param {string} type - 报告类型
     * @param {Object} state - 状态对象
     * @param {string} chatId - 会话ID
     */
    updateGenerationButtonState(type, state, chatId) {
        // 🔍 诊断日志：记录调用栈
        const callStack = new Error().stack;
        logger.debug(`[按钮更新] 开始更新`, {
            type,
            status: state.status,
            chatId,
            timestamp: Date.now(),
            callStack: callStack.split('\n').slice(1, 4).join('\n')
        });

        const buttonMap = {
            business: 'businessPlanBtn',
            proposal: 'proposalBtn'
            // analysis 类型暂不支持，移除 analysisReportBtn
        };

        const btnId = buttonMap[type];

        // 如果类型不支持，静默返回（不显示警告）
        if (!btnId) {
            logger.warn(`[按钮更新] 不支持的类型: ${type}`);
            return;
        }

        const btn = document.getElementById(btnId);
        if (!btn) {
            logger.error(`[按钮更新] 找不到按钮元素`, { btnId, type });
            return;
        }

        // 🔍 记录按钮当前状态
        const beforeState = {
            classList: Array.from(btn.classList),
            dataStatus: btn.dataset.status,
            dataChatId: btn.dataset.chatId,
            disabled: btn.disabled
        };
        logger.debug(`[按钮更新] 更新前状态`, beforeState);

        const iconSpan = btn.querySelector('.btn-icon');
        const textSpan = btn.querySelector('.btn-text');
        const status = state.status || (state.data ? 'completed' : 'idle');

        // 移除所有状态类
        btn.classList.remove('btn-idle', 'btn-generating', 'btn-completed', 'btn-error');
        btn.dataset.status = status;
        btn.dataset.chatId = chatId;
        btn.disabled = false;

        // 根据状态更新
        if (status === 'generating') {
            btn.classList.add('btn-generating');
            updateButtonContent(type, iconSpan, textSpan, 'generating', state.progress || { percentage: 0 });
        } else if (status === 'completed') {
            btn.classList.add('btn-completed');
            updateButtonContent(type, iconSpan, textSpan, 'completed');
        } else if (status === 'error') {
            btn.classList.add('btn-error');
            updateButtonContent(type, iconSpan, textSpan, 'error');
        } else {
            btn.classList.add('btn-idle');
            updateButtonContent(type, iconSpan, textSpan, 'idle');
        }

        // 🔍 记录按钮更新后状态
        const afterState = {
            classList: Array.from(btn.classList),
            dataStatus: btn.dataset.status,
            dataChatId: btn.dataset.chatId,
            disabled: btn.disabled,
            iconText: iconSpan?.textContent,
            buttonText: textSpan?.textContent
        };
        logger.debug(`[按钮更新] 更新后状态`, afterState);

        // 🔍 验证更新是否成功
        if (!btn.classList.contains(`btn-${status}`)) {
            logger.error(`[按钮更新] 状态类未正确应用`, {
                expected: `btn-${status}`,
                actual: Array.from(btn.classList)
            });
        }
    }

    /**
     * 关闭Agent进度弹窗（点击X按钮）
     * 只关闭弹窗，不取消生成（生成会在后台继续）
     */
    async closeAgentProgress() {
        const chatId = normalizeChatId(state.currentChat);

        // 保存当前进度状态到IndexedDB
        if (chatId) {
            await this.saveCurrentSessionState(chatId);
        }

        // 关闭弹窗，不取消生成
        if (window.agentProgressManager) {
            window.agentProgressManager.close();
        }

        this.logStateChange('关闭进度弹窗', { chatId });
    }
}

// 导出为全局单例
window.reportButtonManager = new ReportButtonManager();

// 全局函数桥接（保持向后兼容）
window.getReportsForChat = getReportsForChat;
window.updateButtonContent = updateButtonContent;
window.saveCurrentSessionState = (chatId) => window.reportButtonManager?.saveCurrentSessionState(chatId);
window.logStateChange = (action, data) => window.reportButtonManager?.logStateChange(action, data);
window.updateGenerationButtonStateOld = (generationState) => window.reportButtonManager?.updateGenerationButtonStateOld(generationState);
window.updateGenerationButtonState = (type, state, chatId) => window.reportButtonManager?.updateGenerationButtonState(type, state, chatId);
window.closeAgentProgress = () => window.reportButtonManager?.closeAgentProgress();

/**
 * 重置所有生成按钮到初始状态
 * 用于切换对话或清空状态时调用
 */
function resetGenerationButtons() {
    logger.debug('[按钮管理] 重置所有生成按钮');

    const buttons = [
        { id: 'businessPlanBtn', type: 'business' },
        { id: 'proposalBtn', type: 'proposal' }
        // analysis 类型暂不支持，移除 analysisReportBtn
    ];

    buttons.forEach(({ id, type }) => {
        const btn = document.getElementById(id);
        if (!btn) {
            logger.debug(`[按钮管理] 按钮不存在（已跳过）: ${id}`);
            return;
        }

        const iconSpan = btn.querySelector('.btn-icon');
        const textSpan = btn.querySelector('.btn-text');

        // 移除所有状态类
        btn.classList.remove('btn-idle', 'btn-generating', 'btn-completed', 'btn-error');
        btn.classList.add('btn-idle');

        // 重置按钮属性
        btn.dataset.status = 'idle';
        btn.removeAttribute('data-chat-id');
        btn.disabled = false;

        // 重置按钮内容
        if (iconSpan && textSpan) {
            updateButtonContent(type, iconSpan, textSpan, 'idle');
        }

        logger.debug(`[按钮管理] 已重置按钮: ${id}`);
    });
}

// ✅ 暴露到全局
window.resetGenerationButtons = resetGenerationButtons;

logger.debug('✅ 按钮管理函数已暴露到全局');
