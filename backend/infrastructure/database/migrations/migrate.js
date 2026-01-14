#!/usr/bin/env node

/**
 * 数据库迁移脚本
 *
 * 运行方式：
 *   npm run migrate           - 执行迁移（创建表）
 *   npm run migrate:down      - 回滚迁移（删除表）
 *   npm run migrate:reset     - 重置数据库（先删除再创建）
 */

import { testConnection, closeConnection } from '../sequelize.js';
import { up, down } from './001-init-schema.js';

const command = process.argv[2] || 'up';

async function runMigration() {
  try {
    // 测试数据库连接
    console.log('[Migrate] 正在连接数据库...');
    const connected = await testConnection();

    if (!connected) {
      console.error('[Migrate] ✗ 数据库连接失败，请检查配置');
      process.exit(1);
    }

    console.log('[Migrate] ✓ 数据库连接成功\n');

    // 执行迁移命令
    switch (command) {
      case 'up':
        console.log('[Migrate] 执行迁移：创建数据库表\n');
        await up();
        console.log('\n[Migrate] ✓ 迁移完成');
        break;

      case 'down':
        console.log('[Migrate] 执行回滚：删除数据库表\n');
        console.log('[Migrate] ⚠️  警告：此操作将删除所有数据！');
        console.log('[Migrate] 按Ctrl+C取消，或等待5秒后自动执行...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await down();
        console.log('\n[Migrate] ✓ 回滚完成');
        break;

      case 'reset':
        console.log('[Migrate] 执行重置：先删除后创建\n');
        console.log('[Migrate] ⚠️  警告：此操作将删除所有数据！');
        console.log('[Migrate] 按Ctrl+C取消，或等待5秒后自动执行...\n');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await down();
        console.log('');
        await up();
        console.log('\n[Migrate] ✓ 重置完成');
        break;

      default:
        console.error(`[Migrate] ✗ 未知命令: ${command}`);
        console.log('[Migrate] 可用命令：up, down, reset');
        process.exit(1);
    }

    // 关闭数据库连接
    await closeConnection();

  } catch (error) {
    console.error('\n[Migrate] ✗ 迁移失败:', error);
    await closeConnection();
    process.exit(1);
  }
}

// 运行迁移
runMigration();
