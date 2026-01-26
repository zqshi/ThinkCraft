/**
 * 数据迁移脚本：从内存存储迁移到MongoDB
 * 使用方法：node scripts/migrate-to-mongodb.js
 */
import { mongoManager } from '../config/database.js';
import { UserInMemoryRepository } from '../src/features/auth/infrastructure/user-inmemory.repository.js';
import { UserMongoRepository } from '../src/features/auth/infrastructure/user-mongodb.repository.js';
import { UserModel } from '../src/features/auth/infrastructure/user.model.js';

/**
 * 迁移统计
 */
class MigrationStats {
  constructor() {
    this.total = 0;
    this.success = 0;
    this.failed = 0;
    this.errors = [];
  }

  addSuccess() {
    this.success++;
  }

  addFailure(error) {
    this.failed++;
    this.errors.push(error);
  }

  print() {
    console.log('\n========== 迁移统计 ==========');
    console.log(`总计: ${this.total}`);
    console.log(`成功: ${this.success}`);
    console.log(`失败: ${this.failed}`);
    console.log('==============================\n');

    if (this.errors.length > 0) {
      console.log('错误详情:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  }
}

/**
 * 迁移用户数据
 */
async function migrateUsers() {
  console.log('[Migration] 开始迁移用户数据...');

  const stats = new MigrationStats();
  const memoryRepo = new UserInMemoryRepository();
  const mongoRepo = new UserMongoRepository();

  try {
    // 获取所有用户
    const users = await memoryRepo.findAll();
    stats.total = users.length;

    console.log(`[Migration] 找到 ${users.length} 个用户`);

    // 逐个迁移
    for (const user of users) {
      try {
        await mongoRepo.save(user);
        stats.addSuccess();
        console.log(`[Migration] ✓ 迁移用户: ${user.username.value}`);
      } catch (error) {
        stats.addFailure(`用户 ${user.username.value}: ${error.message}`);
        console.error(`[Migration] ✗ 迁移失败: ${user.username.value}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Migration] 迁移过程出错:', error);
    throw error;
  }
}

/**
 * 清空MongoDB数据（可选）
 */
async function clearMongoDB() {
  console.log('[Migration] 清空MongoDB现有数据...');
  try {
    await UserModel.deleteMany({});
    console.log('[Migration] MongoDB数据已清空');
  } catch (error) {
    console.error('[Migration] 清空数据失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  ThinkCraft 数据迁移工具');
  console.log('  从内存存储迁移到MongoDB');
  console.log('========================================\n');

  try {
    // 连接MongoDB
    console.log('[Migration] 连接MongoDB...');
    await mongoManager.connect();
    console.log('[Migration] MongoDB连接成功\n');

    // 询问是否清空现有数据
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await clearMongoDB();
      console.log('');
    }

    // 迁移用户数据
    const userStats = await migrateUsers();
    userStats.print();

    // TODO: 迁移其他实体（项目、聊天、商业计划书等）

    console.log('[Migration] 迁移完成！');
    console.log('[Migration] 建议运行验证脚本: node scripts/verify-migration.js\n');

    process.exit(0);
  } catch (error) {
    console.error('\n[Migration] 迁移失败:', error);
    process.exit(1);
  } finally {
    // 断开连接
    try {
      await mongoManager.disconnect();
    } catch (error) {
      console.error('[Migration] 断开连接失败:', error);
    }
  }
}

// 执行迁移
main();
