/**
 * 数据迁移脚本：从内存存储迁移到MongoDB
 * 使用方法：node scripts/migrate-to-mongodb.js
 */
import { mongoManager } from '../config/database.js';
import { UserInMemoryRepository } from '../src/features/auth/infrastructure/user-inmemory.repository.js';
import { UserMongoRepository } from '../src/features/auth/infrastructure/user-mongodb.repository.js';
import { UserModel } from '../src/features/auth/infrastructure/user.model.js';
import { ProjectModel } from '../src/features/projects/infrastructure/project.model.js';
import { ProjectMongoRepository } from '../src/features/projects/infrastructure/project-mongodb.repository.js';
import { ChatModel } from '../src/features/chat/infrastructure/chat.model.js';
import { ChatMongoRepository } from '../src/features/chat/infrastructure/chat-mongodb.repository.js';
import { BusinessPlanModel } from '../src/features/business-plan/infrastructure/business-plan.model.js';
import { BusinessPlanMongoRepository } from '../src/features/business-plan/infrastructure/business-plan-mongodb.repository.js';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_SOURCE_DIR = path.resolve(process.cwd(), 'backend/data/migration');

async function loadMigrationSource(collectionName) {
  const sourceDir = process.env.MIGRATION_SOURCE_DIR || DEFAULT_SOURCE_DIR;
  const filePath = path.join(sourceDir, `${collectionName}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error(`数据文件必须是数组: ${filePath}`);
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`[Migration] 未找到 ${collectionName}.json，跳过该类数据迁移`);
      return [];
    }
    throw error;
  }
}

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
        console.log(`[Migration] ✓ 迁移用户: ${user.phone?.value || user.id?.value}`);
      } catch (error) {
        stats.addFailure(`用户 ${user.phone?.value || user.id?.value}: ${error.message}`);
        console.error(
          `[Migration] ✗ 迁移失败: ${user.phone?.value || user.id?.value}`,
          error.message
        );
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
    await ProjectModel.deleteMany({});
    await ChatModel.deleteMany({});
    await BusinessPlanModel.deleteMany({});
    console.log('[Migration] MongoDB数据已清空');
  } catch (error) {
    console.error('[Migration] 清空数据失败:', error);
    throw error;
  }
}

/**
 * 迁移项目数据
 */
async function migrateProjects() {
  console.log('[Migration] 开始迁移项目数据...');

  const stats = new MigrationStats();
  const mongoRepo = new ProjectMongoRepository();

  try {
    const projects = await loadMigrationSource('projects');
    stats.total = projects.length;

    console.log(`[Migration] 找到 ${projects.length} 个项目`);

    for (const project of projects) {
      try {
        await mongoRepo.save(project);
        stats.addSuccess();
        console.log(`[Migration] ✓ 迁移项目: ${project.name.value}`);
      } catch (error) {
        stats.addFailure(`项目 ${project.id.value}: ${error.message}`);
        console.error(`[Migration] ✗ 迁移失败: ${project.id.value}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Migration] 项目迁移过程出错:', error);
    throw error;
  }
}

/**
 * 迁移聊天数据
 */
async function migrateChats() {
  console.log('[Migration] 开始迁移聊天数据...');

  const stats = new MigrationStats();
  const mongoRepo = new ChatMongoRepository();

  try {
    const chats = await loadMigrationSource('chats');
    stats.total = chats.length;

    console.log(`[Migration] 找到 ${chats.length} 个聊天会话`);

    for (const chat of chats) {
      try {
        await mongoRepo.save(chat);
        stats.addSuccess();
        console.log(`[Migration] ✓ 迁移聊天: ${chat.title}`);
      } catch (error) {
        stats.addFailure(`聊天 ${chat.id}: ${error.message}`);
        console.error(`[Migration] ✗ 迁移失败: ${chat.id}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Migration] 聊天迁移过程出错:', error);
    throw error;
  }
}

/**
 * 迁移商业计划书数据
 */
async function migrateBusinessPlans() {
  console.log('[Migration] 开始迁移商业计划书数据...');

  const stats = new MigrationStats();
  const mongoRepo = new BusinessPlanMongoRepository();

  try {
    const businessPlans = await loadMigrationSource('business-plans');
    stats.total = businessPlans.length;

    console.log(`[Migration] 找到 ${businessPlans.length} 个商业计划书`);

    for (const plan of businessPlans) {
      try {
        await mongoRepo.save(plan);
        stats.addSuccess();
        console.log(`[Migration] ✓ 迁移商业计划书: ${plan.title}`);
      } catch (error) {
        stats.addFailure(`商业计划书 ${plan.id.value}: ${error.message}`);
        console.error(`[Migration] ✗ 迁移失败: ${plan.id.value}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Migration] 商业计划书迁移过程出错:', error);
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

    // 迁移项目数据
    const projectStats = await migrateProjects();
    projectStats.print();

    // 迁移聊天数据
    const chatStats = await migrateChats();
    chatStats.print();

    // 迁移商业计划书数据
    const businessPlanStats = await migrateBusinessPlans();
    businessPlanStats.print();

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
