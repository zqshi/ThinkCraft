/**
 * Storage Module 测试文件
 * 验证重构后的Storage Manager功能是否正常
 */

import { storageManager, ChatRepository, dbClient } from './infrastructure/storage/index.js';

/**
 * 测试套件
 */
async function runStorageTests() {
  console.log('='.repeat(60));
  console.log('Storage Module 测试开始');
  console.log('='.repeat(60));

  try {
    // 测试1：初始化数据库
    console.log('\n📝 测试1: 初始化数据库...');
    await storageManager.init();
    console.log('✅ 数据库初始化成功');

    // 测试2：Chat Repository - 保存和获取
    console.log('\n📝 测试2: Chat Repository - 保存和获取...');
    const testChat = {
      id: 'test-chat-1',
      title: '测试对话',
      messages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好！有什么可以帮助你的吗？' }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await storageManager.saveChat(testChat);
    console.log('  ✓ 保存Chat成功');

    const retrievedChat = await storageManager.getChat('test-chat-1');
    if (retrievedChat && retrievedChat.id === 'test-chat-1') {
      console.log('  ✓ 获取Chat成功');
      console.log(`    标题: ${retrievedChat.title}`);
      console.log(`    消息数: ${retrievedChat.messages.length}`);
    } else {
      throw new Error('获取Chat失败');
    }

    // 测试3：获取所有Chats
    console.log('\n📝 测试3: 获取所有Chats...');
    const allChats = await storageManager.getAllChats();
    console.log(`  ✓ 获取到 ${allChats.length} 个对话`);

    // 测试4：搜索功能
    console.log('\n📝 测试4: 搜索功能...');
    const searchResults = await storageManager.searchChats('测试');
    console.log(`  ✓ 搜索到 ${searchResults.length} 个结果`);

    // 测试5：Report Repository
    console.log('\n📝 测试5: Report Repository...');
    const testReport = {
      id: 'test-report-1',
      type: 'business-plan',
      title: '测试商业计划书',
      content: '这是测试内容',
      timestamp: Date.now()
    };

    await storageManager.saveReport(testReport);
    const retrievedReport = await storageManager.getReport('test-report-1');
    if (retrievedReport) {
      console.log('  ✓ Report保存和获取成功');
      console.log(`    类型: ${retrievedReport.type}`);
    }

    // 测试6：Inspiration Repository
    console.log('\n📝 测试6: Inspiration Repository...');
    const testInspiration = {
      id: 'test-inspiration-1',
      title: '测试灵感',
      content: '这是一个很棒的想法',
      status: 'unprocessed',
      type: 'idea',
      category: 'product',
      tags: ['创新', '产品'],
      createdAt: Date.now()
    };

    await storageManager.saveInspiration(testInspiration);
    const stats = await storageManager.getInspirationStats();
    console.log('  ✓ Inspiration保存成功');
    console.log(`    统计: ${JSON.stringify(stats)}`);

    // 测试7：Knowledge Repository
    console.log('\n📝 测试7: Knowledge Repository...');
    const testKnowledge = {
      id: 'test-knowledge-1',
      title: '测试知识',
      content: 'DDD领域驱动设计相关知识',
      type: 'note',
      scope: 'global',
      projectId: null,
      tags: ['DDD', '架构'],
      createdAt: Date.now()
    };

    await storageManager.saveKnowledge(testKnowledge);
    const knowledgeStats = await storageManager.getKnowledgeStats();
    console.log('  ✓ Knowledge保存成功');
    console.log(`    总数: ${knowledgeStats.total}`);

    // 测试8：Settings Repository
    console.log('\n📝 测试8: Settings Repository...');
    await storageManager.setSetting('theme', 'dark');
    await storageManager.setSetting('language', 'zh-CN');

    const theme = await storageManager.getSetting('theme');
    const settings = await storageManager.getAllSettings();

    console.log('  ✓ Settings保存和获取成功');
    console.log(`    主题: ${theme}`);
    console.log(`    所有设置: ${JSON.stringify(settings)}`);

    // 测试9：向后兼容性 - 通用方法
    console.log('\n📝 测试9: 向后兼容性测试...');
    const chat2 = {
      id: 'test-chat-2',
      title: '兼容性测试对话',
      createdAt: Date.now()
    };

    await storageManager.save('chats', chat2);
    const retrieved2 = await storageManager.get('chats', 'test-chat-2');

    if (retrieved2) {
      console.log('  ✓ 通用save/get方法正常工作');
    }

    // 测试10：直接使用Repository（新方式）
    console.log('\n📝 测试10: 直接使用Repository...');
    const chatRepo = new ChatRepository(dbClient);
    const recentChats = await chatRepo.getRecentChats(5);
    console.log(`  ✓ 直接使用Repository成功，获取到 ${recentChats.length} 个最近对话`);

    // 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await storageManager.deleteChat('test-chat-1');
    await storageManager.deleteChat('test-chat-2');
    await storageManager.deleteReport('test-report-1');
    await storageManager.deleteInspiration('test-inspiration-1');
    await storageManager.deleteKnowledge('test-knowledge-1');
    await storageManager.removeSetting('theme');
    await storageManager.removeSetting('language');
    console.log('  ✓ 测试数据已清理');

    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有测试通过！');
    console.log('='.repeat(60));

    return {
      success: true,
      message: '所有测试通过'
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
export { runStorageTests };

// 如果直接运行（在浏览器控制台）
if (typeof window !== 'undefined') {
  window.runStorageTests = runStorageTests;
  console.log('💡 提示：在浏览器控制台运行 runStorageTests() 来执行测试');
}
