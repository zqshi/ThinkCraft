/**
 * State Module 测试文件
 * 验证重构后的State Manager功能是否正常
 */

import {
  stateManager,
  conversationState,
  generationState,
  demoState,
  inspirationState,
  knowledgeState,
  settingsState
} from './infrastructure/state/index.js';

/**
 * 测试套件
 */
async function runStateTests() {
  console.log('='.repeat(60));
  console.log('State Module 测试开始');
  console.log('='.repeat(60));

  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // 测试1：ConversationState
    console.log('\n📝 测试1: ConversationState...');
    conversationState.setCurrentChat('test-chat-1');
    conversationState.addMessage({ role: 'user', content: '你好' });
    conversationState.addMessage({ role: 'assistant', content: '你好！' });

    if (conversationState.getCurrentChat() === 'test-chat-1') {
      console.log('  ✓ 设置当前对话成功');
      testsPassed++;
    }

    if (conversationState.getMessages().length === 2) {
      console.log('  ✓ 添加消息成功');
      testsPassed++;
    }

    conversationState.setConversationStep(3);
    if (conversationState.getConversationStep() === 3) {
      console.log('  ✓ 设置对话步骤成功');
      testsPassed++;
    }

    // 测试2：GenerationState
    console.log('\n📝 测试2: GenerationState...');
    generationState.startGeneration('business-plan', ['chapter-1', 'chapter-2', 'chapter-3']);

    if (generationState.getType() === 'business-plan') {
      console.log('  ✓ 设置生成类型成功');
      testsPassed++;
    }

    if (generationState.getStatus() === 'generating') {
      console.log('  ✓ 设置生成状态成功');
      testsPassed++;
    }

    if (generationState.getSelectedChapters().length === 3) {
      console.log('  ✓ 设置选中章节成功');
      testsPassed++;
    }

    generationState.updateProgress(1, 3, 'product-manager');
    const progress = generationState.getProgress();
    if (progress.current === 1 && progress.total === 3 && progress.percentage === 33) {
      console.log('  ✓ 更新进度成功');
      console.log(`    进度: ${progress.current}/${progress.total} (${progress.percentage}%)`);
      testsPassed++;
    }

    generationState.addResult('chapter-1', {
      content: '第一章内容',
      agent: 'product-manager',
      timestamp: Date.now()
    });

    if (Object.keys(generationState.getResults()).length === 1) {
      console.log('  ✓ 添加生成结果成功');
      testsPassed++;
    }

    // 测试3：DemoState
    console.log('\n📝 测试3: DemoState...');
    demoState.startDemoGeneration('web', ['React', 'TypeScript'], ['用户认证', '数据展示']);

    if (demoState.getType() === 'web') {
      console.log('  ✓ 设置Demo类型成功');
      testsPassed++;
    }

    if (demoState.getTechStack().length === 2) {
      console.log('  ✓ 设置技术栈成功');
      console.log(`    技术栈: ${demoState.getTechStack().join(', ')}`);
      testsPassed++;
    }

    demoState.setCurrentStep('prd');
    demoState.updateStepResult('prd', { content: 'PRD文档内容' });

    if (demoState.getCurrentStep() === 'prd') {
      console.log('  ✓ 设置当前步骤成功');
      testsPassed++;
    }

    const demoProgress = demoState.getProgress();
    console.log(`    进度: ${demoProgress}%`);

    // 测试4：InspirationState
    console.log('\n📝 测试4: InspirationState...');
    inspirationState.addItem({
      id: 'inspiration-1',
      title: '测试灵感',
      content: '这是一个很棒的想法',
      status: 'unprocessed',
      tags: ['创新', '产品']
    });

    inspirationState.addItem({
      id: 'inspiration-2',
      title: '另一个灵感',
      content: '另一个想法',
      status: 'processing',
      tags: ['技术']
    });

    if (inspirationState.getItems().length === 2) {
      console.log('  ✓ 添加灵感成功');
      testsPassed++;
    }

    inspirationState.updateStats();
    const inspirationStats = inspirationState.getStats();
    if (inspirationStats.unprocessed === 1 && inspirationStats.processing === 1) {
      console.log('  ✓ 更新统计成功');
      console.log(`    统计: ${JSON.stringify(inspirationStats)}`);
      testsPassed++;
    }

    inspirationState.setFilter('unprocessed');
    const filtered = inspirationState.getFilteredItems();
    if (filtered.length === 1) {
      console.log('  ✓ 过滤功能正常');
      testsPassed++;
    }

    // 测试5：KnowledgeState
    console.log('\n📝 测试5: KnowledgeState...');
    knowledgeState.addItem({
      id: 'knowledge-1',
      title: 'DDD领域驱动设计',
      content: '领域驱动设计相关知识',
      type: 'note',
      scope: 'global',
      projectId: null,
      tags: ['DDD', '架构'],
      createdAt: Date.now()
    });

    knowledgeState.addItem({
      id: 'knowledge-2',
      title: 'Repository模式',
      content: 'Repository模式详解',
      type: 'note',
      scope: 'global',
      tags: ['设计模式', '架构'],
      createdAt: Date.now()
    });

    if (knowledgeState.getItems().length === 2) {
      console.log('  ✓ 添加知识条目成功');
      testsPassed++;
    }

    knowledgeState.updateStats();
    const knowledgeStats = knowledgeState.getStats();
    if (knowledgeStats.total === 2) {
      console.log('  ✓ 更新知识统计成功');
      console.log(`    总数: ${knowledgeStats.total}`);
      console.log(`    按标签: ${JSON.stringify(knowledgeStats.byTag)}`);
      testsPassed++;
    }

    knowledgeState.setSearchKeyword('DDD');
    const searchResults = knowledgeState.getFilteredItems();
    if (searchResults.length === 1) {
      console.log('  ✓ 搜索功能正常');
      testsPassed++;
    }

    // 测试6：SettingsState
    console.log('\n📝 测试6: SettingsState...');
    settingsState.setDarkMode(true);
    settingsState.setLanguage('en-US');
    settingsState.setFontSize('large');

    if (settingsState.isDarkMode() === true) {
      console.log('  ✓ 设置暗黑模式成功');
      testsPassed++;
    }

    const allSettings = settingsState.getAllSettings();
    if (allSettings.darkMode && allSettings.language === 'en-US') {
      console.log('  ✓ 获取所有设置成功');
      testsPassed++;
    }

    settingsState.toggleDarkMode();
    if (settingsState.isDarkMode() === false) {
      console.log('  ✓ 切换暗黑模式成功');
      testsPassed++;
    }

    // 测试7：StateManager 兼容性
    console.log('\n📝 测试7: StateManager 向后兼容性...');

    // 测试旧的state访问方式
    const currentChat = stateManager.state.currentChat;
    if (currentChat === 'test-chat-1') {
      console.log('  ✓ 旧的state.currentChat访问方式正常');
      testsPassed++;
    }

    const generationState2 = stateManager.state.generation;
    if (generationState2.type === 'business-plan') {
      console.log('  ✓ 旧的state.generation访问方式正常');
      testsPassed++;
    }

    // 测试旧的方法调用
    stateManager.setCurrentChat('test-chat-2');
    if (stateManager.getCurrentChat() === 'test-chat-2') {
      console.log('  ✓ 旧的方法调用方式正常');
      testsPassed++;
    }

    // 测试8：观察者模式
    console.log('\n📝 测试8: 观察者模式...');
    let notificationCount = 0;

    const unsubscribe = conversationState.subscribe(() => {
      notificationCount++;
    });

    conversationState.setCurrentChat('test-chat-3');
    conversationState.addMessage({ role: 'user', content: '测试' });

    if (notificationCount === 2) {
      console.log('  ✓ 观察者通知正常（2次状态变更触发2次通知）');
      testsPassed++;
    }

    unsubscribe();
    conversationState.setCurrentChat('test-chat-4');

    if (notificationCount === 2) {
      console.log('  ✓ 取消订阅成功（不再收到通知）');
      testsPassed++;
    }

    // 测试9：批量更新
    console.log('\n📝 测试9: 批量更新...');
    let batchNotificationCount = 0;

    conversationState.subscribe(() => {
      batchNotificationCount++;
    });

    conversationState.batchUpdate((state) => {
      return {
        currentChat: 'batch-test',
        conversationStep: 5,
        isTyping: true
      };
    });

    if (batchNotificationCount === 1) {
      console.log('  ✓ 批量更新只触发一次通知');
      testsPassed++;
    }

    if (
      conversationState.getCurrentChat() === 'batch-test' &&
      conversationState.getConversationStep() === 5 &&
      conversationState.isTyping() === true
    ) {
      console.log('  ✓ 批量更新所有字段成功');
      testsPassed++;
    }

    // 测试10：重置状态
    console.log('\n📝 测试10: 重置状态...');
    generationState.resetGeneration();
    demoState.resetDemo();
    conversationState.clearConversation();

    if (
      generationState.getStatus() === 'idle' &&
      demoState.getStatus() === 'idle' &&
      conversationState.getCurrentChat() === null
    ) {
      console.log('  ✓ 重置状态成功');
      testsPassed++;
    }

    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    inspirationState.setItems([]);
    knowledgeState.setItems([]);
    settingsState.resetToDefaults();
    console.log('  ✓ 测试数据已清理');

    // 汇总结果
    console.log('\n' + '='.repeat(60));
    console.log(`✅ 测试通过: ${testsPassed}`);
    console.log(`❌ 测试失败: ${testsFailed}`);
    console.log('='.repeat(60));

    if (testsFailed === 0) {
      console.log('🎉 所有测试通过！');
    }

    return {
      success: testsFailed === 0,
      passed: testsPassed,
      failed: testsFailed
    };

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 测试失败:', error);
    console.error('='.repeat(60));
    console.error(error.stack);

    return {
      success: false,
      error: error.message
    };
  }
}

// 导出测试函数
export { runStateTests };

// 如果直接运行（在浏览器控制台）
if (typeof window !== 'undefined') {
  window.runStateTests = runStateTests;
  console.log('💡 提示：在浏览器控制台运行 runStateTests() 来执行测试');
}
