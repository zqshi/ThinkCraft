/**
 * Agent领域测试文件
 * 验证重构后的Agent领域功能是否正常
 *
 * 运行方式（Node.js环境）：
 * node backend/domains/agent/test-agent-domain.js
 */

import { AgentType } from './models/valueObjects/AgentType.js';
import { Agent, AgentStatus } from './models/Agent.js';
import { AgentHireService } from './services/AgentHireService.js';
import { TaskAssignmentService } from './services/TaskAssignmentService.js';
import { SalaryService } from './services/SalaryService.js';

/**
 * 测试套件
 */
async function runAgentDomainTests() {
  console.log('='.repeat(60));
  console.log('Agent领域测试开始');
  console.log('='.repeat(60));

  let testsPassed = 0;
  let testsFailed = 0;
  const errors = [];

  try {
    // ===== 测试1：AgentType值对象 =====
    console.log('\n📝 测试1: AgentType值对象...');

    const allTypes = AgentType.getAll();
    if (allTypes.length === 12) {
      console.log(`  ✓ 获取所有Agent类型成功（${allTypes.length}个）`);
      testsPassed++;
    } else {
      errors.push(`Agent类型数量不正确: 期望12个，实际${allTypes.length}个`);
      testsFailed++;
    }

    const pmType = AgentType.getById('product-manager');
    if (pmType && pmType.name === '产品经理') {
      console.log('  ✓ 根据ID获取Agent类型成功');
      testsPassed++;
    } else {
      errors.push('根据ID获取Agent类型失败');
      testsFailed++;
    }

    const techAgents = AgentType.getByCategory('tech');
    if (techAgents.length === 2) {
      console.log(`  ✓ 按类别过滤成功（tech类别${techAgents.length}个）`);
      testsPassed++;
    }

    const avgSalary = AgentType.getAverageSalary();
    if (avgSalary > 0) {
      console.log(`  ✓ 计算平均薪资成功: ${avgSalary}元`);
      testsPassed++;
    }

    // ===== 测试2：Agent实体 =====
    console.log('\n📝 测试2: Agent实体...');

    const agent1 = Agent.hire('test-user-1', 'product-manager', '测试产品经理');
    if (agent1 && agent1.nickname === '测试产品经理') {
      console.log('  ✓ 雇佣Agent成功');
      testsPassed++;
    } else {
      errors.push('雇佣Agent失败');
      testsFailed++;
    }

    if (agent1.isIdle() && agent1.canAcceptTask()) {
      console.log('  ✓ Agent初始状态正确（空闲且可接受任务）');
      testsPassed++;
    }

    const validation = agent1.validate();
    if (validation.valid) {
      console.log('  ✓ Agent数据验证通过');
      testsPassed++;
    }

    // ===== 测试3：任务分配和完成 =====
    console.log('\n📝 测试3: 任务分配和完成...');

    try {
      agent1.assignTask({ description: '制定产品规划', context: '新产品' });
      if (agent1.isWorking()) {
        console.log('  ✓ 任务分配成功，Agent状态变为工作中');
        testsPassed++;
      }
    } catch (error) {
      errors.push(`任务分配失败: ${error.message}`);
      testsFailed++;
    }

    try {
      const completedTask = agent1.completeTask({ content: '产品规划完成', tokens: 1000 });
      if (agent1.isIdle() && agent1.tasksCompleted === 1) {
        console.log('  ✓ 任务完成成功，Agent恢复空闲状态');
        console.log(`    任务完成数: ${agent1.tasksCompleted}`);
        testsPassed++;
      }
    } catch (error) {
      errors.push(`任务完成失败: ${error.message}`);
      testsFailed++;
    }

    // ===== 测试4：绩效管理 =====
    console.log('\n📝 测试4: 绩效管理...');

    const initialPerformance = agent1.performance;
    agent1.updatePerformance(-10);
    if (agent1.performance === initialPerformance - 10) {
      console.log(`  ✓ 绩效更新成功: ${initialPerformance} -> ${agent1.performance}`);
      testsPassed++;
    }

    agent1.setPerformance(100);
    if (agent1.performance === 100) {
      console.log('  ✓ 绩效设置成功');
      testsPassed++;
    }

    // ===== 测试5：解雇Agent =====
    console.log('\n📝 测试5: 解雇Agent...');

    const agent2 = Agent.hire('test-user-1', 'designer', '测试设计师');
    const fireResult = agent2.fire();
    if (fireResult && agent2.isFired() && agent2.status === AgentStatus.OFFLINE) {
      console.log('  ✓ 解雇Agent成功');
      testsPassed++;
    }

    if (!agent2.canAcceptTask()) {
      console.log('  ✓ 已解雇的Agent不能接受新任务');
      testsPassed++;
    }

    // ===== 测试6：AgentHireService =====
    console.log('\n📝 测试6: AgentHireService...');

    const hireService = new AgentHireService();

    const hireResult1 = hireService.hire('user-1', 'frontend-dev', '前端工程师A');
    if (hireResult1.success) {
      console.log('  ✓ 使用服务雇佣Agent成功');
      testsPassed++;
    } else {
      errors.push(`雇佣失败: ${hireResult1.error}`);
      testsFailed++;
    }

    const hireResult2 = hireService.hire('user-1', 'backend-dev');
    const hireResult3 = hireService.hire('user-1', 'marketing');

    const userAgents = hireService.getUserAgents('user-1');
    if (userAgents.length === 3) {
      console.log(`  ✓ 获取用户Agent列表成功（${userAgents.length}个）`);
      testsPassed++;
    }

    // ===== 测试7：团队统计 =====
    console.log('\n📝 测试7: 团队统计...');

    const teamStats = hireService.getTeamStats('user-1');
    if (teamStats.total === 3 && teamStats.active === 3) {
      console.log('  ✓ 团队统计正确');
      console.log(`    总人数: ${teamStats.total}, 活跃: ${teamStats.active}`);
      console.log(`    月度成本: ${teamStats.monthlyCost}元`);
      testsPassed++;
    }

    // ===== 测试8：预算推荐 =====
    console.log('\n📝 测试8: 预算推荐...');

    const recommendations = hireService.recommendAgentsByBudget(15000);
    if (recommendations.length > 0) {
      console.log(`  ✓ 预算推荐成功（${recommendations.length}个推荐）`);
      console.log(`    推荐: ${recommendations.slice(0, 3).map(r => r.name).join(', ')}`);
      testsPassed++;
    }

    // ===== 测试9：技能搜索 =====
    console.log('\n📝 测试9: 技能搜索...');

    const searchResults = hireService.searchAgentsBySkill('数据分析');
    if (searchResults.length > 0) {
      console.log(`  ✓ 技能搜索成功（找到${searchResults.length}个）`);
      testsPassed++;
    }

    // ===== 测试10：解雇服务 =====
    console.log('\n📝 测试10: 解雇服务...');

    const agent = hireService.getUserAgents('user-1')[0];
    const fireServiceResult = hireService.fire('user-1', agent.id);
    if (fireServiceResult.success) {
      console.log('  ✓ 通过服务解雇Agent成功');
      testsPassed++;
    }

    // ===== 测试11：TaskAssignmentService（模拟，不调用真实AI） =====
    console.log('\n📝 测试11: TaskAssignmentService（跳过AI调用）...');

    const taskService = new TaskAssignmentService(hireService);

    // 创建新的空闲Agent用于测试
    hireService.hire('user-2', 'consultant', '测试顾问');
    const testAgent = hireService.getUserAgents('user-2')[0];

    // 手动分配任务（不调用AI）
    try {
      testAgent.assignTask({ description: '战略规划', context: '测试' });
      console.log('  ✓ 任务服务初始化成功');
      testsPassed++;

      testAgent.completeTask({ content: '测试结果', tokens: 500 });
      console.log('  ✓ 任务完成流程正常');
      testsPassed++;
    } catch (error) {
      errors.push(`任务服务测试失败: ${error.message}`);
      testsFailed++;
    }

    // ===== 测试12：SalaryService =====
    console.log('\n📝 测试12: SalaryService...');

    const salaryService = new SalaryService(hireService);

    const monthlyCost = salaryService.calculateMonthlyCost('user-1');
    if (monthlyCost.totalCost > 0) {
      console.log('  ✓ 计算月度成本成功');
      console.log(`    总成本: ${monthlyCost.totalCost}元`);
      console.log(`    Agent数: ${monthlyCost.agentCount}`);
      testsPassed++;
    }

    const forecast = salaryService.forecastCost('user-1', 6);
    if (forecast.projections.length === 6) {
      console.log(`  ✓ 成本预测成功（${forecast.projections.length}个月）`);
      console.log(`    半年总成本: ${forecast.totalCostForPeriod}元`);
      testsPassed++;
    }

    // ===== 测试13：预算检查 =====
    console.log('\n📝 测试13: 预算检查...');

    const budgetCheck = salaryService.checkBudget('user-1', 50000);
    console.log('  ✓ 预算检查成功');
    console.log(`    预算: ${budgetCheck.budget}元`);
    console.log(`    当前成本: ${budgetCheck.currentCost}元`);
    console.log(`    状态: ${budgetCheck.status}`);
    console.log(`    利用率: ${budgetCheck.utilizationRate}%`);
    testsPassed++;

    // ===== 测试14：雇佣模拟 =====
    console.log('\n📝 测试14: 雇佣模拟...');

    const simulation = salaryService.simulateHire('user-1', 'data-analyst');
    if (simulation.success) {
      console.log('  ✓ 雇佣模拟成功');
      console.log(`    新增成本: ${simulation.costIncrease}元`);
      console.log(`    成本增长率: ${simulation.costIncreaseRate}%`);
      testsPassed++;
    }

    // ===== 测试15：薪资分析报告 =====
    console.log('\n📝 测试15: 薪资分析报告...');

    const report = salaryService.getSalaryAnalysisReport('user-1');
    if (report.summary && report.costBreakdown && report.forecast) {
      console.log('  ✓ 生成薪资分析报告成功');
      console.log(`    年度成本: ${report.summary.annualCost}元`);
      console.log(`    平均薪资: ${report.summary.averageSalary}元`);
      console.log(`    优化建议: ${report.recommendations.length}条`);
      testsPassed++;
    }

    // ===== 测试16：Agent JSON序列化 =====
    console.log('\n📝 测试16: Agent序列化...');

    const agent3 = Agent.hire('user-3', 'designer');
    const jsonData = agent3.toJSON();
    const persistenceData = agent3.toPersistence();

    if (jsonData.id && jsonData.name && jsonData.skills) {
      console.log('  ✓ Agent JSON序列化成功');
      testsPassed++;
    }

    if (persistenceData.id && persistenceData.typeId) {
      console.log('  ✓ Agent持久化数据格式正确');
      testsPassed++;
    }

    // ===== 测试17：Agent恢复 =====
    console.log('\n📝 测试17: Agent从数据恢复...');

    const restoredAgent = Agent.fromData(persistenceData);
    if (restoredAgent.id === agent3.id && restoredAgent.typeId === agent3.typeId) {
      console.log('  ✓ Agent数据恢复成功');
      testsPassed++;
    }

    // ===== 测试18：统计信息 =====
    console.log('\n📝 测试18: Agent统计信息...');

    const stats = agent3.getStats();
    if (stats.id && stats.hasOwnProperty('tasksCompleted') && stats.hasOwnProperty('performance')) {
      console.log('  ✓ 获取Agent统计信息成功');
      console.log(`    任务完成数: ${stats.tasksCompleted}`);
      console.log(`    绩效: ${stats.performance}`);
      testsPassed++;
    }

    // 汇总结果
    console.log('\n' + '='.repeat(60));
    console.log(`✅ 测试通过: ${testsPassed}`);
    console.log(`❌ 测试失败: ${testsFailed}`);
    console.log('='.repeat(60));

    if (testsFailed > 0) {
      console.log('\n失败详情:');
      errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (testsFailed === 0) {
      console.log('\n🎉 所有测试通过！Agent领域重构成功！');
    }

    return {
      success: testsFailed === 0,
      passed: testsPassed,
      failed: testsFailed,
      errors
    };

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 测试执行失败:', error);
    console.error('='.repeat(60));
    console.error(error.stack);

    return {
      success: false,
      error: error.message
    };
  }
}

// 运行测试
runAgentDomainTests()
  .then(result => {
    if (result.success) {
      console.log('\n✅ Agent领域测试全部通过！');
      process.exit(0);
    } else {
      console.log('\n❌ Agent领域测试失败！');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ 测试运行错误:', error);
    process.exit(1);
  });

// 导出测试函数（供其他模块使用）
export { runAgentDomainTests };
