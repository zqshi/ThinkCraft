/**
 * 数据恢复脚本
 * 从JSON文件导入数据到MongoDB
 * 使用方法：node scripts/restore-data.js <backup-file>
 */
import fs from 'fs';
import path from 'path';
import { mongoManager } from '../config/database.js';
import { UserModel } from '../src/features/auth/infrastructure/user.model.js';
import { ProjectModel } from '../src/features/projects/infrastructure/project.model.js';
import { ChatModel } from '../src/features/chat/infrastructure/chat.model.js';
import { BusinessPlanModel } from '../src/features/business-plan/infrastructure/business-plan.model.js';

/**
 * 恢复统计
 */
class RestoreStats {
  constructor(entityName) {
    this.entityName = entityName;
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
    console.log(`\n========== ${this.entityName}恢复统计 ==========`);
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
 * 恢复用户数据
 */
async function restoreUsers(users) {
  console.log('[Restore] 恢复用户数据...');

  const stats = new RestoreStats('用户');
  stats.total = users.length;

  try {
    for (const userData of users) {
      try {
        await UserModel.findByIdAndUpdate(userData._id || userData.userId, userData, {
          upsert: true,
          new: true
        });
        stats.addSuccess();
        console.log(`[Restore] ✓ 恢复用户: ${userData.phone || userData.userId || userData._id}`);
      } catch (error) {
        stats.addFailure(`用户 ${userData.phone || userData.userId || userData._id}: ${error.message}`);
        console.error(`[Restore] ✗ 恢复失败: ${userData.phone || userData.userId || userData._id}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Restore] 用户恢复过程出错:', error);
    throw error;
  }
}

/**
 * 恢复项目数据
 */
async function restoreProjects(projects) {
  console.log('[Restore] 恢复项目数据...');

  const stats = new RestoreStats('项目');
  stats.total = projects.length;

  try {
    for (const projectData of projects) {
      try {
        await ProjectModel.findByIdAndUpdate(projectData._id, projectData, {
          upsert: true,
          new: true
        });
        stats.addSuccess();
        console.log(`[Restore] ✓ 恢复项目: ${projectData.name}`);
      } catch (error) {
        stats.addFailure(`项目 ${projectData._id}: ${error.message}`);
        console.error(`[Restore] ✗ 恢复失败: ${projectData._id}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Restore] 项目恢复过程出错:', error);
    throw error;
  }
}

/**
 * 恢复聊天数据
 */
async function restoreChats(chats) {
  console.log('[Restore] 恢复聊天数据...');

  const stats = new RestoreStats('聊天');
  stats.total = chats.length;

  try {
    for (const chatData of chats) {
      try {
        await ChatModel.findByIdAndUpdate(chatData._id, chatData, {
          upsert: true,
          new: true
        });
        stats.addSuccess();
        console.log(`[Restore] ✓ 恢复聊天: ${chatData.title}`);
      } catch (error) {
        stats.addFailure(`聊天 ${chatData._id}: ${error.message}`);
        console.error(`[Restore] ✗ 恢复失败: ${chatData._id}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Restore] 聊天恢复过程出错:', error);
    throw error;
  }
}

/**
 * 恢复商业计划书数据
 */
async function restoreBusinessPlans(businessPlans) {
  console.log('[Restore] 恢复商业计划书数据...');

  const stats = new RestoreStats('商业计划书');
  stats.total = businessPlans.length;

  try {
    for (const planData of businessPlans) {
      try {
        await BusinessPlanModel.findByIdAndUpdate(planData._id, planData, {
          upsert: true,
          new: true
        });
        stats.addSuccess();
        console.log(`[Restore] ✓ 恢复商业计划书: ${planData.title}`);
      } catch (error) {
        stats.addFailure(`商业计划书 ${planData._id}: ${error.message}`);
        console.error(`[Restore] ✗ 恢复失败: ${planData._id}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Restore] 商业计划书恢复过程出错:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  ThinkCraft 数据恢复工具');
  console.log('  从JSON文件导入数据到MongoDB');
  console.log('========================================\n');

  try {
    // 获取备份文件路径
    const backupFile = process.argv[2];
    if (!backupFile) {
      console.error('[Restore] 错误: 请指定备份文件路径');
      console.log('[Restore] 使用方法: node scripts/restore-data.js <backup-file>');
      process.exit(1);
    }

    // 检查文件是否存在
    if (!fs.existsSync(backupFile)) {
      console.error(`[Restore] 错误: 备份文件不存在: ${backupFile}`);
      process.exit(1);
    }

    // 读取备份文件
    console.log(`[Restore] 读取备份文件: ${backupFile}`);
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));

    console.log(`[Restore] 备份版本: ${backupData.version}`);
    console.log(`[Restore] 备份时间: ${backupData.timestamp}\n`);

    // 连接MongoDB
    console.log('[Restore] 连接MongoDB...');
    await mongoManager.connect();
    console.log('[Restore] MongoDB连接成功\n');

    // 恢复所有数据
    const { users = [], projects = [], chats = [], businessPlans = [] } = backupData.data;

    const userStats = await restoreUsers(users);
    userStats.print();

    const projectStats = await restoreProjects(projects);
    projectStats.print();

    const chatStats = await restoreChats(chats);
    chatStats.print();

    const businessPlanStats = await restoreBusinessPlans(businessPlans);
    businessPlanStats.print();

    console.log('[Restore] 恢复完成！');
    console.log('[Restore] 建议运行验证脚本: node scripts/verify-migration.js\n');

    process.exit(0);
  } catch (error) {
    console.error('\n[Restore] 恢复失败:', error);
    process.exit(1);
  } finally {
    try {
      await mongoManager.disconnect();
    } catch (error) {
      console.error('[Restore] 断开连接失败:', error);
    }
  }
}

// 执行恢复
main();
