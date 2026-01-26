/**
 * 数据恢复脚本
 * 从JSON文件导入数据到MongoDB
 * 使用方法：node scripts/restore-data.js <backup-file>
 */
import fs from 'fs';
import path from 'path';
import { mongoManager } from '../config/database.js';
import { UserMongoRepository } from '../src/features/auth/infrastructure/user-mongodb.repository.js';
import { User } from '../src/features/auth/domain/user.aggregate.js';
import { UserId } from '../src/features/auth/domain/value-objects/user-id.vo.js';
import { Username } from '../src/features/auth/domain/value-objects/username.vo.js';
import { Email } from '../src/features/auth/domain/value-objects/email.vo.js';
import { Password } from '../src/features/auth/domain/value-objects/password.vo.js';
import { UserStatus } from '../src/features/auth/domain/value-objects/user-status.vo.js';

/**
 * 恢复统计
 */
class RestoreStats {
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
    console.log('\n========== 恢复统计 ==========');
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
async function restoreUsers(userData) {
  console.log('[Restore] 恢复用户数据...');

  const stats = new RestoreStats();
  const mongoRepo = new UserMongoRepository();

  stats.total = userData.length;
  console.log(`[Restore] 找到 ${userData.length} 个用户`);

  for (const data of userData) {
    try {
      // 重建领域模型
      const user = new User(
        UserId.fromString(data.userId),
        new Username(data.username),
        new Email(data.email),
        Password.fromHash(data.passwordHash),
        UserStatus.fromString(data.status)
      );

      // 设置其他属性
      user._lastLoginAt = data.lastLoginAt ? new Date(data.lastLoginAt) : null;
      user._loginAttempts = data.loginAttempts || 0;
      user._lockedUntil = data.lockedUntil ? new Date(data.lockedUntil) : null;
      user.emailVerified = data.emailVerified || false;
      user.emailVerificationToken = data.emailVerificationToken || null;
      user.emailVerificationExpires = data.emailVerificationExpires ? new Date(data.emailVerificationExpires) : null;
      user.passwordResetToken = data.passwordResetToken || null;
      user.passwordResetExpires = data.passwordResetExpires ? new Date(data.passwordResetExpires) : null;
      user.loginHistory = data.loginHistory || [];
      user.preferences = data.preferences || {
        language: 'zh-CN',
        theme: 'light',
        notifications: { email: true, push: true }
      };
      user.deletedAt = data.deletedAt ? new Date(data.deletedAt) : null;
      user.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
      user.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();

      // 保存到MongoDB
      await mongoRepo.save(user);
      stats.addSuccess();
      console.log(`[Restore] ✓ 恢复用户: ${data.username}`);
    } catch (error) {
      stats.addFailure(`用户 ${data.username}: ${error.message}`);
      console.error(`[Restore] ✗ 恢复失败: ${data.username}`, error.message);
    }
  }

  return stats;
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  ThinkCraft 数据恢复工具');
  console.log('  从JSON文件导入到MongoDB');
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
      console.error(`[Restore] 错误: 文件不存在: ${backupFile}`);
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

    // 恢复用户数据
    const userStats = await restoreUsers(backupData.data.users);
    userStats.print();

    // TODO: 恢复其他实体（项目、聊天、商业计划书等）

    console.log('[Restore] 恢复完成！');
    console.log('[Restore] 建议运行验证脚本: node scripts/verify-migration.js\n');

    process.exit(0);
  } catch (error) {
    console.error('\n[Restore] 恢复失败:', error);
    process.exit(1);
  } finally {
    // 断开连接
    try {
      await mongoManager.disconnect();
    } catch (error) {
      console.error('[Restore] 断开连接失败:', error);
    }
  }
}

// 执行恢复
main();
