/**
 * 数据备份脚本
 * 将内存数据导出到JSON文件
 * 使用方法：node scripts/backup-data.js
 */
import fs from 'fs';
import path from 'path';
import { UserInMemoryRepository } from '../src/features/auth/infrastructure/user-inmemory.repository.js';

/**
 * 备份用户数据
 */
async function backupUsers() {
  console.log('[Backup] 备份用户数据...');

  const memoryRepo = new UserInMemoryRepository();

  try {
    const users = await memoryRepo.findAll();
    console.log(`[Backup] 找到 ${users.length} 个用户`);

    // 转换为可序列化的格式
    const userData = users.map(user => ({
      userId: user.id.value,
      username: user.username.value,
      email: user.email.value,
      passwordHash: user.password.hash,
      status: user.status.value,
      lastLoginAt: user.lastLoginAt,
      loginAttempts: user.loginAttempts,
      lockedUntil: user.lockedUntil,
      emailVerified: user.emailVerified || false,
      emailVerificationToken: user.emailVerificationToken || null,
      emailVerificationExpires: user.emailVerificationExpires || null,
      passwordResetToken: user.passwordResetToken || null,
      passwordResetExpires: user.passwordResetExpires || null,
      loginHistory: user.loginHistory || [],
      preferences: user.preferences || {
        language: 'zh-CN',
        theme: 'light',
        notifications: { email: true, push: true }
      },
      deletedAt: user.deletedAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    return userData;
  } catch (error) {
    console.error('[Backup] 备份用户数据失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  ThinkCraft 数据备份工具');
  console.log('  导出内存数据到JSON文件');
  console.log('========================================\n');

  try {
    // 创建备份目录
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
      console.log('[Backup] 创建备份目录:', backupDir);
    }

    // 生成备份文件名（带时间戳）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    // 备份用户数据
    const users = await backupUsers();

    // TODO: 备份其他实体（项目、聊天、商业计划书等）

    // 构建备份数据
    const backupData = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        users
        // TODO: 添加其他实体
      }
    };

    // 写入文件
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log(`\n[Backup] 备份完成！`);
    console.log(`[Backup] 文件位置: ${backupFile}`);
    console.log(`[Backup] 用户数量: ${users.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n[Backup] 备份失败:', error);
    process.exit(1);
  }
}

// 执行备份
main();
