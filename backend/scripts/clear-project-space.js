/**
 * 清理所有Mock数据（MongoDB）
 * 用于投产前彻底清理测试数据
 * 运行方式：node backend/scripts/clear-project-space.js
 */
import dotenv from 'dotenv';
import { mongoManager } from '../config/database.js';
import { ProjectModel } from '../src/features/projects/infrastructure/project.model.js';
import { BusinessPlanModel } from '../src/features/business-plan/infrastructure/business-plan.model.js';
import { ChatModel } from '../src/features/chat/infrastructure/chat.model.js';
import { AnalysisReportModel } from '../src/features/report/infrastructure/analysis-report.model.js';
import { UserModel } from '../src/features/auth/infrastructure/user.model.js';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

async function clearAllMockData() {
  console.log('========================================');
  console.log('开始清理所有Mock数据...');
  console.log('========================================\n');

  await mongoManager.connect();

  // 统计当前数据量
  console.log('[统计] 当前数据量：');
  const [projectCount, planCount, chatCount, reportCount, userCount] = await Promise.all([
    ProjectModel.countDocuments({}),
    BusinessPlanModel.countDocuments({}),
    ChatModel.countDocuments({}),
    AnalysisReportModel.countDocuments({}),
    UserModel.countDocuments({})
  ]);

  console.log(`  - Projects: ${projectCount}`);
  console.log(`  - Business Plans: ${planCount}`);
  console.log(`  - Chats: ${chatCount}`);
  console.log(`  - Analysis Reports: ${reportCount}`);
  console.log(`  - Users: ${userCount}`);
  console.log('');

  // 确认清理
  const totalRecords = projectCount + planCount + chatCount + reportCount + userCount;
  if (totalRecords === 0) {
    console.log('[提示] 数据库已经是空的，无需清理。');
    return;
  }

  console.log(`[警告] 即将删除 ${totalRecords} 条记录！`);
  console.log('[执行] 开始清理...\n');

  // 执行清理
  const [projectResult, planResult, chatResult, reportResult, userResult] = await Promise.all([
    ProjectModel.deleteMany({}),
    BusinessPlanModel.deleteMany({}),
    ChatModel.deleteMany({}),
    AnalysisReportModel.deleteMany({}),
    UserModel.deleteMany({})
  ]);

  console.log('[完成] 清理结果：');
  console.log(`  - 已删除 Projects: ${projectResult.deletedCount}`);
  console.log(`  - 已删除 Business Plans: ${planResult.deletedCount}`);
  console.log(`  - 已删除 Chats: ${chatResult.deletedCount}`);
  console.log(`  - 已删除 Analysis Reports: ${reportResult.deletedCount}`);
  console.log(`  - 已删除 Users: ${userResult.deletedCount}`);
  console.log('');

  const totalDeleted =
    projectResult.deletedCount +
    planResult.deletedCount +
    chatResult.deletedCount +
    reportResult.deletedCount +
    userResult.deletedCount;

  console.log('========================================');
  console.log(`✓ 清理完成！共删除 ${totalDeleted} 条记录`);
  console.log('========================================');
}

clearAllMockData()
  .catch((error) => {
    console.error('\n[错误] 清理失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoManager.disconnect();
  });
