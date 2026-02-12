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
 * ❌ 已废弃：此函数已被 BusinessPlanGenerator.updateButtonUI() 替代
 * 保留仅用于向后兼容，不应在新代码中使用
 *
 * @deprecated 使用 window.businessPlanGenerator.updateButtonUI(type, status) 替代
 */
function updateButtonContent(type, _iconSpan, _textSpan, status, _progress) {
  console.warn('[updateButtonContent] 此函数已废弃，请使用 businessPlanGenerator.updateButtonUI()');

  // 降级处理：调用新的统一方法
  if (window.businessPlanGenerator) {
    window.businessPlanGenerator.updateButtonUI(type, status);
  }
}

// 创建日志实例
const reportButtonLogger =
  window.__reportButtonLogger ||
  (window.__reportButtonLogger = window.createLogger ? window.createLogger('ReportButton') : console);


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
    if (!normalizedChatId || !window.storageManager) {return;}

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
    if (!this.DEBUG_STATE) {return;}
    reportButtonLogger.debug(`[状态变化] ${action}`, {
      timestamp: new Date().toISOString(),
      currentChat: normalizeChatId(window.state.currentChat),
      ...data
    });
  }

  /**
     * 更新生成按钮状态（旧版本，保留用于兼容）
     * @param {Object} generationState - 生成状态对象
     */
  updateGenerationButtonStateOld(generationState) {
    // 🔧 添加空值检查
    if (!generationState) {return;}

    const type = generationState.type;
    if (!type) {return;}

    const btnMap = {
      'business': 'businessPlanBtn',
      'proposal': 'proposalBtn'
    };

    const btnId = btnMap[type];
    if (!btnId) {return;}

    const btn = document.getElementById(btnId);
    if (!btn) {return;}

    const status = generationState.status;
    const chatId = normalizeChatId(window.state.currentChat);
    const reports = getReportsForChat(chatId);

    // 移除所有状态类
    btn.classList.remove('btn-idle', 'btn-generating', 'btn-completed', 'btn-error');
    btn.disabled = false;

    // 根据状态更新按钮
    switch (status) {
    case 'idle':
      btn.classList.add('btn-idle');
      btn.dataset.status = 'idle';
      if (window.businessPlanGenerator && window.businessPlanGenerator.updateButtonUI) {
        window.businessPlanGenerator.updateButtonUI(type, 'idle');
      }
      break;

    case 'selecting':
      // 章节选择中，保持原样
      btn.dataset.status = 'selecting';
      break;

    case 'generating':
      btn.classList.add('btn-generating');
      btn.dataset.status = 'generating';
      btn.disabled = false; // 不禁用按钮，允许点击查看进度
      if (window.businessPlanGenerator && window.businessPlanGenerator.updateButtonUI) {
        window.businessPlanGenerator.updateButtonUI(type, 'generating');
      }
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
      if (window.businessPlanGenerator && window.businessPlanGenerator.updateButtonUI) {
        window.businessPlanGenerator.updateButtonUI(type, 'completed');
      }
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
      if (window.businessPlanGenerator && window.businessPlanGenerator.updateButtonUI) {
        window.businessPlanGenerator.updateButtonUI(type, 'error');
      }
      reports[type] = {
        ...(reports[type] || {}),
        status: 'error',
        progress: generationState.progress,
        chatId: chatId
      };
      break;
    default:
      break;
    }
  }

  /**
     * ❌ 已废弃：此方法已被 BusinessPlanGenerator.updateButtonUI() 替代
     * 保留仅用于向后兼容，不应在新代码中使用
     *
     * @deprecated 使用 window.businessPlanGenerator.updateButtonUI(type, status) 替代
     */
  updateGenerationButtonState(type, state, _chatId) {
    console.warn('[updateGenerationButtonState] 此方法已废弃，请使用 businessPlanGenerator.updateButtonUI()');

    // 降级处理：调用新的统一方法
    if (window.businessPlanGenerator) {
      const status = state.status || (state.data ? 'completed' : 'idle');
      window.businessPlanGenerator.updateButtonUI(type, status);
    }
  }

  /**
     * 关闭Agent进度弹窗（点击X按钮）
     * 只关闭弹窗，不取消生成（生成会在后台继续）
     */
  async closeAgentProgress() {
    const chatId = normalizeChatId(window.state.currentChat);

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
  reportButtonLogger.debug('[按钮管理] 重置所有生成按钮');

  const buttons = [
    { id: 'businessPlanBtn', type: 'business' },
    { id: 'proposalBtn', type: 'proposal' }
    // analysis 类型暂不支持，移除 analysisReportBtn
  ];

  buttons.forEach(({ id, type }) => {
    const btn = document.getElementById(id);
    if (!btn) {
      reportButtonLogger.debug(`[按钮管理] 按钮不存在（已跳过）: ${id}`);
      return;
    }

    // 移除所有状态类
    btn.classList.remove('btn-idle', 'btn-generating', 'btn-completed', 'btn-error');
    btn.classList.add('btn-idle');

    // 重置按钮属性
    btn.dataset.status = 'idle';
    btn.removeAttribute('data-chat-id');
    btn.disabled = false;

    // 使用新的统一方法更新按钮UI
    if (window.businessPlanGenerator && window.businessPlanGenerator.updateButtonUI) {
      window.businessPlanGenerator.updateButtonUI(type, 'idle');
    }

    reportButtonLogger.debug(`[按钮管理] 已重置按钮: ${id}`);
  });
}

// ✅ 暴露到全局
window.resetGenerationButtons = resetGenerationButtons;

reportButtonLogger.debug('✅ 按钮管理函数已暴露到全局');
