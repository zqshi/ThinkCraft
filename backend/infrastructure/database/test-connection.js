#!/usr/bin/env node

/**
 * 测试数据库连接
 *
 * 运行方式：npm run db:test
 */

import { testConnection, closeConnection, sequelize } from './sequelize.js';
import './models/index.js'; // 导入所有Model定义

async function testDatabaseConnection() {
  try {
    console.log('====================================');
    console.log('  ThinkCraft 数据库连接测试');
    console.log('====================================\n');

    // 1. 测试基本连接
    console.log('[1/4] 测试数据库连接...');
    const connected = await testConnection();

    if (!connected) {
      console.error('\n✗ 数据库连接失败');
      console.log('\n请检查：');
      console.log('  1. PostgreSQL服务是否运行');
      console.log('  2. .env文件中的数据库配置是否正确');
      console.log('  3. 数据库是否已创建');
      process.exit(1);
    }

    console.log('✓ 连接成功\n');

    // 2. 测试数据库版本
    console.log('[2/4] 检查数据库版本...');
    const [result] = await sequelize.query('SELECT version()');
    const version = result[0].version;
    console.log(`✓ PostgreSQL版本: ${version.split(',')[0]}\n`);

    // 3. 列出所有表
    console.log('[3/4] 检查数据库表...');
    const [tables] = await sequelize.query(`
      SELECT tablename
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    if (tables.length === 0) {
      console.log('⚠️  数据库中没有表');
      console.log('   请运行: npm run migrate\n');
    } else {
      console.log(`✓ 找到 ${tables.length} 张表:`);
      tables.forEach(table => {
        console.log(`   - ${table.tablename}`);
      });
      console.log('');
    }

    // 4. 测试Model定义
    console.log('[4/4] 验证Model定义...');
    const modelNames = Object.keys(sequelize.models);
    console.log(`✓ 已加载 ${modelNames.length} 个Model:`);
    modelNames.forEach(name => {
      console.log(`   - ${name}`);
    });

    console.log('\n====================================');
    console.log('  ✓ 所有测试通过');
    console.log('====================================\n');

    // 关闭连接
    await closeConnection();

  } catch (error) {
    console.error('\n✗ 测试失败:', error.message);
    await closeConnection();
    process.exit(1);
  }
}

// 运行测试
testDatabaseConnection();
