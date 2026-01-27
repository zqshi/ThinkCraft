/**
 * 数据备份脚本
 * 将MongoDB数据导出到JSON文件
 * 使用方法：node scripts/backup-data.js
 */
import fs from 'fs';
import path from 'path';
import { mongoManager } from '../config/database.js';
import { UserModel } from '../src/features/auth/infrastructure/user.model.js';
import { ProjectModel } from '../src/features/projects/infrastructure/project.model.js';
import { ChatModel } from '../src/features/chat/infrastructure/chat.model.js';
import { BusinessPlanModel } from '../src/features/business-plan/infrastructure/business-plan.model.js';

/**
 * 备份用户数据
 */
async function backupUsers() {
  console.log('[Backup] 备份用户数据...');
  try {
    const users = await UserModel.find({}).lean();
    console.log(`[Backup] 找到 ${users.length} 个用户`);
    return users;
  } catch (error) {
    console.error('[Backup] 备份用户数据失败:', error);
    throw error;
  }
}

/**
 * 备份项目数据
 */
async function backupProjects() {
  console.log('[Backup] 备份项目数据...');
  try {
    const projects = await ProjectModel.find({}).lean();
    console.log(`[Backup] 找到 ${projects.length} 个项目`);
    return projects;
  } catch (error) {
    console.error('[Backup] 备份项目数据失败:', error);
    throw error;
  }
}

/**
 * 备份聊天数据
 */
async function backupChats() {
  console.log('[Backup] 备份聊天数据...');
  try {
    const chats = await ChatModel.find({}).lean();
    console.log(`[Backup] 找到 ${chats.length} 个聊天会话`);
    return chats;
  } catch (error) {
    console.error('[Backup] 备份聊天数据失败:', error);
    throw error;
  }
}

/**
 * 备份商业计划书数据
 */
async function backupBusinessPlans() {
  console.log('[Backup] 备份商业计划书数据...');
  try {
    const businessPlans = await BusinessPlanModel.find({}).lean();
    console.log(`[Backup] 找到 ${businessPlans.length} 个商业计划书`);
    return businessPlans;
  } catch (error) {
    console.error('[Backup] 备份商业计划书数据失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  ThinkCraft 数据备份工具');
  console.log('  导出MongoDB数据到JSON文件');
  console.log('========================================\n');

  try {
    // 连接MongoDB
    console.log('[Backup] 连接MongoDB...');
    await mongoManager.connect();
    console.log('[Backup] MongoDB连接成功\n');

    // 创建备份目录
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('[Backup] 创建备份目录:', backupDir);
    }

    // 生成备份文件名（带时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    // 备份所有数据
    const users = await backupUsers();
    const projects = await backupProjects();
    const chats = await backupChats();
    const businessPlans = await backupBusinessPlans();

    // 构建备份数据
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        users,
        projects,
        chats,
        businessPlans
      }
    };

    // 写入文件
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log(`\n[Backup] 备份完成！`);
    console.log(`[Backup] 文件位置: ${backupFile}`);
    console.log(`[Backup] 用户数量: ${users.length}`);
    console.log(`[Backup] 项目数量: ${projects.length}`);
    console.log(`[Backup] 聊天数量: ${chats.length}`);
    console.log(`[Backup] 商业计划书数量: ${businessPlans.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n[Backup] 备份失败:', error);
    process.exit(1);
  } finally {
    try {
      await mongoManager.disconnect();
    } catch (error) {
      console.error('[Backup] 断开连接失败:', error);
    }
  }
}

// 执行备份
main();
