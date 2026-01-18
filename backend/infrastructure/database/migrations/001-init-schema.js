/**
 * 初始化数据库Schema
 *
 * 创建所有12张表
 */

import { sequelize } from '../sequelize.js';
import '../models/index.js'; // 导入所有Model定义

/**
 * 执行迁移
 */
export async function up() {
  try {
    console.log('[Migration] 开始创建数据库表...');

    // 同步所有Model到数据库
    // force: false - 不删除已存在的表
    // alter: true - 自动调整表结构以匹配Model定义
    await sequelize.sync({ force: false, alter: true });

    console.log('[Migration] ✓ 数据库表创建成功');
    console.log('[Migration] 已创建的表：');
    console.log('  - users (用户表)');
    console.log('  - conversations (对话表)');
    console.log('  - messages (消息表)');
    console.log('  - agents (数字员工表)');
    console.log('  - agent_tasks (数字员工任务表)');
    console.log('  - collaboration_plans (协同计划表)');
    console.log('  - reports (报告表)');
    console.log('  - share_links (分享链接表)');
    console.log('  - share_access_logs (分享访问日志表)');
    console.log('  - business_plans (商业计划书表)');
    console.log('  - demos (Demo生成表)');
    console.log('  - settings (用户设置表)');

    return true;
  } catch (error) {
    console.error('[Migration] ✗ 数据库表创建失败:', error.message);
    throw error;
  }
}

/**
 * 回滚迁移
 */
export async function down() {
  try {
    console.log('[Migration] 开始删除数据库表...');

    // 按照依赖关系逆序删除表
    await sequelize.queryInterface.dropTable('share_access_logs');
    await sequelize.queryInterface.dropTable('share_links');
    await sequelize.queryInterface.dropTable('demos');
    await sequelize.queryInterface.dropTable('business_plans');
    await sequelize.queryInterface.dropTable('reports');
    await sequelize.queryInterface.dropTable('agent_tasks');
    await sequelize.queryInterface.dropTable('agents');
    await sequelize.queryInterface.dropTable('collaboration_plans');
    await sequelize.queryInterface.dropTable('messages');
    await sequelize.queryInterface.dropTable('conversations');
    await sequelize.queryInterface.dropTable('settings');
    await sequelize.queryInterface.dropTable('users');

    console.log('[Migration] ✓ 数据库表删除成功');
    return true;
  } catch (error) {
    console.error('[Migration] ✗ 数据库表删除失败:', error.message);
    throw error;
  }
}
