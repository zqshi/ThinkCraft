/**
 * 数据验证脚本
 * 验证MongoDB数据的完整性和一致性
 * 使用方法：node scripts/verify-migration.js
 */
import { mongoManager } from '../config/database.js';
import { UserModel } from '../src/features/auth/infrastructure/user.model.js';
import { ProjectModel } from '../src/features/projects/infrastructure/project.model.js';
import { ChatModel } from '../src/features/chat/infrastructure/chat.model.js';
import { BusinessPlanModel } from '../src/features/business-plan/infrastructure/business-plan.model.js';

/**
 * 验证统计
 */
class VerificationStats {
  constructor(entityName) {
    this.entityName = entityName;
    this.total = 0;
    this.valid = 0;
    this.invalid = 0;
    this.errors = [];
  }

  addValid() {
    this.valid++;
  }

  addInvalid(error) {
    this.invalid++;
    this.errors.push(error);
  }

  print() {
    console.log(`\n========== ${this.entityName}验证统计 ==========`);
    console.log(`总计: ${this.total}`);
    console.log(`有效: ${this.valid}`);
    console.log(`无效: ${this.invalid}`);
    console.log('==============================\n');

    if (this.errors.length > 0) {
      console.log('错误详情:');
      this.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }
  }

  get isSuccess() {
    return this.invalid === 0;
  }
}

/**
 * 验证用户数据
 */
async function verifyUsers() {
  console.log('[Verify] 验证用户数据...');

  const stats = new VerificationStats('用户');

  try {
    const users = await UserModel.find({});
    stats.total = users.length;

    console.log(`[Verify] 找到 ${users.length} 个用户`);

    for (const user of users) {
      try {
        // 验证必需字段
        if (!user.userId || !user.username || !user.email || !user.passwordHash) {
          throw new Error('缺少必需字段');
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(user.email)) {
          throw new Error('邮箱格式无效');
        }

        // 验证状态
        const validStatuses = ['active', 'inactive', 'locked', 'deleted'];
        if (!validStatuses.includes(user.status)) {
          throw new Error(`无效的状态: ${user.status}`);
        }

        stats.addValid();
        console.log(`[Verify] ✓ 用户有效: ${user.username}`);
      } catch (error) {
        stats.addInvalid(`用户 ${user.username}: ${error.message}`);
        console.error(`[Verify] ✗ 用户无效: ${user.username}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Verify] 用户验证过程出错:', error);
    throw error;
  }
}

/**
 * 验证项目数据
 */
async function verifyProjects() {
  console.log('[Verify] 验证项目数据...');

  const stats = new VerificationStats('项目');

  try {
    const projects = await ProjectModel.find({});
    stats.total = projects.length;

    console.log(`[Verify] 找到 ${projects.length} 个项目`);

    for (const project of projects) {
      try {
        // 验证必需字段
        if (!project._id || !project.name || !project.mode) {
          throw new Error('缺少必需字段');
        }

        // 验证模式
        const validModes = ['demo', 'development'];
        if (!validModes.includes(project.mode)) {
          throw new Error(`无效的模式: ${project.mode}`);
        }

        // 验证状态
        const validStatuses = ['planning', 'in_progress', 'completed', 'archived', 'deleted'];
        if (!validStatuses.includes(project.status)) {
          throw new Error(`无效的状态: ${project.status}`);
        }

        stats.addValid();
        console.log(`[Verify] ✓ 项目有效: ${project.name}`);
      } catch (error) {
        stats.addInvalid(`项目 ${project._id}: ${error.message}`);
        console.error(`[Verify] ✗ 项目无效: ${project._id}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Verify] 项目验证过程出错:', error);
    throw error;
  }
}

/**
 * 验证聊天数据
 */
async function verifyChats() {
  console.log('[Verify] 验证聊天数据...');

  const stats = new VerificationStats('聊天');

  try {
    const chats = await ChatModel.find({});
    stats.total = chats.length;

    console.log(`[Verify] 找到 ${chats.length} 个聊天会话`);

    for (const chat of chats) {
      try {
        // 验证必需字段
        if (!chat._id || !chat.title) {
          throw new Error('缺少必需字段');
        }

        // 验证状态
        const validStatuses = ['active', 'archived', 'deleted'];
        if (!validStatuses.includes(chat.status)) {
          throw new Error(`无效的状态: ${chat.status}`);
        }

        // 验证消息数组
        if (!Array.isArray(chat.messages)) {
          throw new Error('消息列表必须是数组');
        }

        stats.addValid();
        console.log(`[Verify] ✓ 聊天有效: ${chat.title}`);
      } catch (error) {
        stats.addInvalid(`聊天 ${chat._id}: ${error.message}`);
        console.error(`[Verify] ✗ 聊天无效: ${chat._id}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Verify] 聊天验证过程出错:', error);
    throw error;
  }
}

/**
 * 验证商业计划书数据
 */
async function verifyBusinessPlans() {
  console.log('[Verify] 验证商业计划书数据...');

  const stats = new VerificationStats('商业计划书');

  try {
    const businessPlans = await BusinessPlanModel.find({});
    stats.total = businessPlans.length;

    console.log(`[Verify] 找到 ${businessPlans.length} 个商业计划书`);

    for (const plan of businessPlans) {
      try {
        // 验证必需字段
        if (!plan._id || !plan.title || !plan.projectId) {
          throw new Error('缺少必需字段');
        }

        // 验证状态
        const validStatuses = ['draft', 'completed', 'archived', 'deleted'];
        if (!validStatuses.includes(plan.status)) {
          throw new Error(`无效的状态: ${plan.status}`);
        }

        // 验证章节数组
        if (!Array.isArray(plan.chapters)) {
          throw new Error('章节列表必须是数组');
        }

        stats.addValid();
        console.log(`[Verify] ✓ 商业计划书有效: ${plan.title}`);
      } catch (error) {
        stats.addInvalid(`商业计划书 ${plan._id}: ${error.message}`);
        console.error(`[Verify] ✗ 商业计划书无效: ${plan._id}`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error('[Verify] 商业计划书验证过程出错:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('  ThinkCraft 数据验证工具');
  console.log('  验证MongoDB数据的完整性和一致性');
  console.log('========================================\n');

  try {
    // 连接MongoDB
    console.log('[Verify] 连接MongoDB...');
    await mongoManager.connect();
    console.log('[Verify] MongoDB连接成功\n');

    // 验证所有数据
    const userStats = await verifyUsers();
    userStats.print();

    const projectStats = await verifyProjects();
    projectStats.print();

    const chatStats = await verifyChats();
    chatStats.print();

    const businessPlanStats = await verifyBusinessPlans();
    businessPlanStats.print();

    // 总结
    console.log('\n========== 验证总结 ==========');
    console.log(`用户: ${userStats.valid}/${userStats.total} 有效`);
    console.log(`项目: ${projectStats.valid}/${projectStats.total} 有效`);
    console.log(`聊天: ${chatStats.valid}/${chatStats.total} 有效`);
    console.log(`商业计划书: ${businessPlanStats.valid}/${businessPlanStats.total} 有效`);

    const allValid =
      userStats.isSuccess &&
      projectStats.isSuccess &&
      chatStats.isSuccess &&
      businessPlanStats.isSuccess;

    if (allValid) {
      console.log('\n✅ 所有数据验证通过！');
      process.exit(0);
    } else {
      console.log('\n❌ 发现无效数据，请检查错误详情');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n[Verify] 验证失败:', error);
    process.exit(1);
  } finally {
    try {
      await mongoManager.disconnect();
    } catch (error) {
      console.error('[Verify] 断开连接失败:', error);
    }
  }
}

// 执行验证
main();
