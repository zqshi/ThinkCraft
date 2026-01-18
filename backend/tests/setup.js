/**
 * Jest测试环境初始化
 * 在所有测试前后执行清理和准备工作
 */
import { sequelize } from '../infrastructure/database/sequelize.js';
import { flushRedis, closeRedis } from './helpers/RedisHelper.js';

// 测试前：同步数据库（清空所有表）
beforeAll(async () => {
  try {
    // force: true 会删除所有表并重建（仅测试环境）
    await sequelize.sync({ force: true });
    await flushRedis();
    console.log('✓ 测试数据库已同步');
  } catch (error) {
    console.error('✗ 测试数据库同步失败:', error);
    throw error;
  }
});

// 每个测试后：清理数据
afterEach(async () => {
  try {
    const models = Object.values(sequelize.models);

    // 按依赖顺序删除（先删除外键引用的表）
    const modelOrder = [
      'Message',
      'AgentTask',
      'Agent',
      'ShareAccessLog',
      'ShareLink',
      'Report',
      'BusinessPlan',
      'Demo',
      'CollaborationPlan',
      'Conversation',
      'Settings',
      'User'
    ];

    for (const modelName of modelOrder) {
      const model = models[modelName];
      if (model) {
        await model.destroy({ where: {}, force: true });
      }
    }

    await flushRedis();
  } catch (error) {
    console.error('✗ 测试数据清理失败:', error);
  }
});

// 测试结束：关闭数据库连接
afterAll(async () => {
  try {
    await sequelize.close();
    await closeRedis();
    console.log('✓ 测试数据库连接已关闭');
  } catch (error) {
    console.error('✗ 关闭数据库连接失败:', error);
  }
});

// 全局测试配置
global.testTimeout = 10000; // 10秒超时
