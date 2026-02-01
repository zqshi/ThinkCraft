/**
 * 进度调试工具
 * 用于诊断进度卡住的问题
 */

window.debugProgress = {
  /**
   * 检查当前生成状态
   */
  checkGenerationState(chatId, type) {
    const stateManager = window.stateManager;
    if (!stateManager) {
      console.error('StateManager 未初始化');
      return null;
    }

    const genState = stateManager.getGenerationState(chatId);
    if (!genState || !genState[type]) {
      console.error('找不到生成状态:', { chatId, type });
      return null;
    }

    const state = genState[type];
    console.log('=== 生成状态 ===');
    console.log('状态:', state.status);
    console.log('进度:', state.progress);
    console.log('选中章节:', state.selectedChapters);
    console.log('结果:', state.results);
    console.log('错误:', state.error);
    console.log('开始时间:', new Date(state.startTime).toLocaleString());
    console.log('结束时间:', state.endTime ? new Date(state.endTime).toLocaleString() : '未完成');

    return state;
  },

  /**
   * 检查进度管理器状态
   */
  checkProgressManager() {
    const progressManager = window.agentProgressManager;
    if (!progressManager) {
      console.error('AgentProgressManager 未初始化');
      return null;
    }

    console.log('=== 进度管理器状态 ===');
    console.log('是否显示:', progressManager.isShowing);
    console.log('章节列表:', progressManager.agents);
    console.log('模态框:', progressManager.modal);

    return progressManager;
  },

  /**
   * 检查 DOM 元素
   */
  checkDOMElements(chapterIds) {
    console.log('=== DOM 元素检查 ===');
    chapterIds.forEach(chapterId => {
      const agentElement = document.getElementById(`agent-${chapterId}`);
      const statusElement = document.getElementById(`status-${chapterId}`);
      console.log(`章节 ${chapterId}:`, {
        agentElement: !!agentElement,
        statusElement: !!statusElement,
        agentClass: agentElement?.className,
        statusText: statusElement?.textContent
      });
    });
  },

  /**
   * 手动更新进度（用于测试）
   */
  manualUpdateProgress(chapterId, status) {
    const progressManager = window.agentProgressManager;
    if (!progressManager) {
      console.error('AgentProgressManager 未初始化');
      return;
    }

    console.log(`手动更新进度: ${chapterId} -> ${status}`);
    progressManager.updateProgress(chapterId, status);
  },

  /**
   * 获取错误日志
   */
  getErrorLogs() {
    const stateManager = window.stateManager;
    if (!stateManager) {
      console.error('StateManager 未初始化');
      return [];
    }

    const logs = stateManager.getErrorLogs();
    console.log('=== 错误日志 ===');
    console.table(logs);
    return logs;
  },

  /**
   * 重置生成状态（用于测试）
   */
  resetGeneration(chatId, type) {
    const stateManager = window.stateManager;
    if (!stateManager) {
      console.error('StateManager 未初始化');
      return;
    }

    console.log(`重置生成状态: ${chatId} - ${type}`);
    stateManager.resetGeneration(chatId, type);
  },

  /**
   * 完整诊断（一键检查所有状态）
   */
  diagnose(chatId, type) {
    console.log('========================================');
    console.log('开始完整诊断...');
    console.log('========================================');

    // 1. 检查生成状态
    const genState = this.checkGenerationState(chatId, type);
    if (!genState) {
      console.error('❌ 生成状态检查失败');
      return;
    }

    // 2. 检查进度管理器
    const progressManager = this.checkProgressManager();
    if (!progressManager) {
      console.error('❌ 进度管理器检查失败');
      return;
    }

    // 3. 检查 DOM 元素
    if (genState.selectedChapters) {
      this.checkDOMElements(genState.selectedChapters);
    }

    // 4. 检查错误日志
    this.getErrorLogs();

    console.log('========================================');
    console.log('诊断完成');
    console.log('========================================');
  },

  /**
   * 显示使用帮助
   */
  help() {
    console.log('=== 进度调试工具使用指南 ===');
    console.log('');
    console.log('1. 完整诊断:');
    console.log('   debugProgress.diagnose(chatId, type)');
    console.log('   例如: debugProgress.diagnose("chat-123", "business")');
    console.log('');
    console.log('2. 检查生成状态:');
    console.log('   debugProgress.checkGenerationState(chatId, type)');
    console.log('');
    console.log('3. 检查进度管理器:');
    console.log('   debugProgress.checkProgressManager()');
    console.log('');
    console.log('4. 检查 DOM 元素:');
    console.log('   debugProgress.checkDOMElements(["executive-summary", "market-analysis"])');
    console.log('');
    console.log('5. 手动更新进度:');
    console.log('   debugProgress.manualUpdateProgress("executive-summary", "completed")');
    console.log('');
    console.log('6. 获取错误日志:');
    console.log('   debugProgress.getErrorLogs()');
    console.log('');
    console.log('7. 重置生成状态:');
    console.log('   debugProgress.resetGeneration(chatId, type)');
    console.log('');
  }
};

console.log('✅ 进度调试工具已加载。使用 debugProgress.help() 查看使用指南。');
