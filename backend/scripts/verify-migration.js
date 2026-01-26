/**
 * 数据迁移验证脚本
 * 验证MongoDB中的数据完整性和一致性
 * 使用方法：node scripts/verify-migration.js
 */
import { mongoManager } from '../config/database.js';
import { UserInMemoryRepository } from '../src/features/auth/infrastructure/user-inmemory.repository.js';
import { UserMongoRepository } from '../src/features/auth/infrastructure/user-mongodb.repository.js';

/**
 * 验证统计
 */
class VerificationStats {
  constructor() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  addPass() {
    this.passed++;
  }

  addFail(error) {
    this.failed++;
    this.errors.push(error);
  }

  print() {
    console.log('\n========== 验证统计 ==========');
    console.log(`总计: ${this.total}`);
    console.log(`通过: ${this.passed}`);
    console.log(`失败: ${this.failed}`);
    console.log('==============================\n');

    if (this.errors.length > 0) {
      console.log('错误详情:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (this.failed === 0) {
      console.log('✓ 所有验证通过！');
    } else {
      console.log('✗ 存在验证失败项，请检查！');
    }
  }
}

/**
 * 验证用户数据
 */
async function verifyUsers() {
  console.log('[Verify] 验证用户数据...');

  const stats = new VerificationStats();
  const memoryRepo = new UserInMemoryRepository();
  const mongoRepo = new UserMongoRepository();

  try {
    // 获取内存中的用户
    const memoryUsers = await memoryRepo.findAll();
    stats.total = memoryUsers.length;

    console.log(`[Verify] 内存中有 ${memoryUsers.length} 个用户`);

    // 获取MongoDB中的用户数量
    const mongoCount = await mongoRepo.count();
    console.log(`[Verify] MongoDB中有 ${mongoCount} 个用户\n`);

    // 验证数量一致性
    if (memoryUsers.length !== mongoCount) {
      stats.addFail(`用户数量不一致: 内存=${memoryUsers.length}, MongoDB=${mongoCount}`);
    }

    // 逐个验证用户
    for (const memoryUser of memoryUsers) {
      try {
        // 从MongoDB查找用户
        const mongoUser = await mongoRepo.findById(memoryUser.id);

        if (!mongoUser) {
          stats.addFail(`用户不存在: ${memoryUser.username.value}`);
          console.log(`[Verify] ✗ 用户不存在: ${memoryUser.username.value}`);
          continue;
        }

        // 验证关键字段
        const errors = [];

        if (memoryUser.id.value !== mongoUser.id.value) {
          errors.push('ID不匹配');
        }

        if (memoryUser.username.value !== mongoUser.username.value) {
          errors.push('用户名不匹配');
        }

        if (memoryUser.email.value !== mongoUser.email.value) {
          errors.push('邮箱不匹配');
        }

        if (memoryUser.password.hash !== mongoUser.password.hash) {
          errors.push('密码哈希不匹配');
        }

        if (memoryUser.status.value !== mongoUser.status.value) {
          errors.push('状态不匹配');
        }

        if (errors.length > 0) {
          stats.addFail(`用户 ${memoryUser.username.value}: ${errors.join(', ')}`);
          console.log(`[Verify] ✗ ${memoryUser.username.value}: ${errors.join(', ')}`);
        } else {
          stats.addPass();
          console.log(`[Verify] ✓ ${memoryUser.username.value}`);
        }
      } catch (error) {
        stats.addFail(`用户 ${memoryUser.username.value}: ${error.message}`);
        console.error(`[Verify] ✗ 验证失败: ${memoryUser.username.value}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Verify] 验证过程出错:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  ThinkCraft 数据验证工具');
  console.log('  验证MongoDB数据完整性');
  console.log('========================================\n');

  try {
    // 连接MongoDB
    console.log('[Verify] 连接MongoDB...');
    await mongoManager.connect();
    console.log('[Verify] MongoDB连接成功\n');

    // 验证用户数据
    const userStats = await verifyUsers();
    userStats.print();

    // TODO: 验证其他实体（项目、聊天、商业计划书等）

    if (userStats.failed === 0) {
      console.log('\n[Verify] 验证完成！数据迁移成功。');
      process.exit(0);
    } else {
      console.log('\n[Verify] 验证完成！发现问题，请检查。');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n[Verify] 验证失败:', error);
    process.exit(1);
  } finally {
    // 断开连接
    try {
      await mongoManager.disconnect();
    } catch (error) {
      console.error('[Verify] 断开连接失败:', error);
    }
  }
}

// 执行验证
main();
