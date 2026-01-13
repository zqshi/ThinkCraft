/**
 * 薪资管理服务（Domain Service）
 * 负责处理Agent薪资计算、成本预测、预算管理相关的业务逻辑
 *
 * DDD 领域服务特点：
 * - 处理薪资相关计算逻辑
 * - 提供成本分析和预测
 * - 支持预算管理决策
 */

import { AgentType } from '../models/valueObjects/AgentType.js';

/**
 * 薪资管理服务类
 */
export class SalaryService {
  /**
   * 构造函数
   * @param {Object} agentHireService - Agent雇佣服务
   */
  constructor(agentHireService) {
    this.agentHireService = agentHireService;
  }

  /**
   * 计算用户的月度薪资成本
   * @param {string} userId - 用户ID
   * @returns {Object} 月度成本信息
   */
  calculateMonthlyCost(userId) {
    const agents = this.agentHireService.getUserAgents(userId);
    const activeAgents = agents.filter(agent => !agent.isFired());

    // 计算总成本
    let totalCost = 0;
    const costByCategory = {};
    const costByAgent = [];

    for (const agent of activeAgents) {
      const salary = agent.getSalary();
      totalCost += salary;

      // 按类别统计
      const agentType = agent.getType();
      const category = agentType?.category || 'unknown';

      if (!costByCategory[category]) {
        costByCategory[category] = {
          count: 0,
          cost: 0
        };
      }

      costByCategory[category].count++;
      costByCategory[category].cost += salary;

      // 按Agent统计
      costByAgent.push({
        agentId: agent.id,
        agentName: agent.nickname,
        agentType: agent.typeId,
        salary: salary
      });
    }

    // 按薪资排序
    costByAgent.sort((a, b) => b.salary - a.salary);

    return {
      totalCost,
      agentCount: activeAgents.length,
      costByCategory: Object.entries(costByCategory).map(([category, data]) => ({
        category,
        count: data.count,
        cost: data.cost,
        percentage: ((data.cost / totalCost) * 100).toFixed(2)
      })),
      costByAgent,
      averageSalary: activeAgents.length > 0
        ? Math.round(totalCost / activeAgents.length)
        : 0
    };
  }

  /**
   * 预测未来N个月的成本
   * @param {string} userId - 用户ID
   * @param {number} months - 月数
   * @returns {Object} 成本预测
   */
  forecastCost(userId, months = 12) {
    const monthlyCost = this.calculateMonthlyCost(userId);
    const projections = [];

    for (let i = 1; i <= months; i++) {
      projections.push({
        month: i,
        cost: monthlyCost.totalCost,
        cumulativeCost: monthlyCost.totalCost * i
      });
    }

    return {
      currentMonthlyCost: monthlyCost.totalCost,
      projections,
      totalCostForPeriod: monthlyCost.totalCost * months,
      averageMonthlyCost: monthlyCost.totalCost
    };
  }

  /**
   * 根据预算推荐团队配置
   * @param {number} monthlyBudget - 月度预算
   * @param {Object} requirements - 需求 { categories: ['product', 'tech'], minAgents: 3 }
   * @returns {Object} 推荐配置
   */
  recommendTeamByBudget(monthlyBudget, requirements = {}) {
    const {
      categories = null,
      minAgents = 1,
      maxAgents = 10
    } = requirements;

    // 获取所有Agent类型
    let availableTypes = AgentType.getAll();

    // 按类别过滤
    if (categories && categories.length > 0) {
      availableTypes = availableTypes.filter(type =>
        categories.includes(type.category)
      );
    }

    // 按薪资排序（从低到高）
    availableTypes.sort((a, b) => a.salary - b.salary);

    // 贪心算法：尽可能多地雇佣Agent
    const recommendations = [];
    let remainingBudget = monthlyBudget;
    let totalCost = 0;

    for (const agentType of availableTypes) {
      if (recommendations.length >= maxAgents) {
        break;
      }

      if (agentType.salary <= remainingBudget) {
        recommendations.push({
          typeId: agentType.id,
          name: agentType.name,
          salary: agentType.salary,
          level: agentType.level,
          category: agentType.category
        });

        totalCost += agentType.salary;
        remainingBudget -= agentType.salary;
      }
    }

    // 检查是否满足最小数量
    const meetRequirements = recommendations.length >= minAgents;

    return {
      budget: monthlyBudget,
      recommendations,
      totalCost,
      remainingBudget,
      agentCount: recommendations.length,
      meetRequirements,
      utilizationRate: ((totalCost / monthlyBudget) * 100).toFixed(2)
    };
  }

  /**
   * 计算Agent的性价比（ROI）
   * @param {string} userId - 用户ID
   * @param {string} agentId - Agent ID
   * @returns {Object} ROI分析
   */
  calculateAgentROI(userId, agentId) {
    const agent = this.agentHireService.getAgentById(userId, agentId);

    if (!agent) {
      return null;
    }

    const salary = agent.getSalary();
    const workingDays = agent.getWorkingDays();
    const tasksCompleted = agent.tasksCompleted;
    const performance = agent.performance;

    // 计算每日成本（假设一个月30天）
    const dailyCost = salary / 30;
    const totalCost = dailyCost * workingDays;

    // 简单的ROI计算：任务完成数 * 绩效 / 成本
    const productivityScore = tasksCompleted * (performance / 100);
    const roi = totalCost > 0 ? (productivityScore / totalCost * 1000).toFixed(2) : 0;

    return {
      agentId: agent.id,
      agentName: agent.nickname,
      agentType: agent.typeId,
      salary,
      workingDays,
      totalCost: Math.round(totalCost),
      tasksCompleted,
      performance,
      productivityScore: productivityScore.toFixed(2),
      roi: parseFloat(roi),
      costPerTask: tasksCompleted > 0 ? Math.round(totalCost / tasksCompleted) : 0,
      rating: this._getRatingFromROI(parseFloat(roi))
    };
  }

  /**
   * 比较多个Agent的性价比
   * @param {string} userId - 用户ID
   * @returns {Array<Object>} ROI排行榜
   */
  compareAgentsROI(userId) {
    const agents = this.agentHireService.getUserAgents(userId)
      .filter(agent => !agent.isFired() && agent.tasksCompleted > 0);

    const roiList = agents.map(agent =>
      this.calculateAgentROI(userId, agent.id)
    ).filter(roi => roi !== null);

    // 按ROI排序
    roiList.sort((a, b) => b.roi - a.roi);

    return roiList;
  }

  /**
   * 获取薪资分析报告
   * @param {string} userId - 用户ID
   * @returns {Object} 综合报告
   */
  getSalaryAnalysisReport(userId) {
    const monthlyCost = this.calculateMonthlyCost(userId);
    const forecast = this.forecastCost(userId, 12);
    const roiRanking = this.compareAgentsROI(userId);

    // 计算行业平均薪资
    const categoryAverageSalaries = {};
    for (const category of AgentType.getCategories()) {
      categoryAverageSalaries[category] = AgentType.getAverageSalary(category);
    }

    return {
      summary: {
        currentMonthlyCost: monthlyCost.totalCost,
        agentCount: monthlyCost.agentCount,
        averageSalary: monthlyCost.averageSalary,
        annualCost: monthlyCost.totalCost * 12
      },
      costBreakdown: monthlyCost,
      forecast: forecast,
      roiRanking: roiRanking.slice(0, 5), // 前5名
      categoryBenchmark: categoryAverageSalaries,
      recommendations: this._generateRecommendations(userId, monthlyCost, roiRanking)
    };
  }

  /**
   * 检查预算是否足够
   * @param {string} userId - 用户ID
   * @param {number} budget - 预算
   * @returns {Object} 预算检查结果
   */
  checkBudget(userId, budget) {
    const monthlyCost = this.calculateMonthlyCost(userId);
    const isWithinBudget = monthlyCost.totalCost <= budget;
    const difference = budget - monthlyCost.totalCost;
    const utilizationRate = (monthlyCost.totalCost / budget * 100).toFixed(2);

    return {
      budget,
      currentCost: monthlyCost.totalCost,
      isWithinBudget,
      difference,
      utilizationRate: parseFloat(utilizationRate),
      status: isWithinBudget ? 'safe' : 'over-budget',
      canHireMore: isWithinBudget && difference > 0,
      maxAdditionalSalary: difference
    };
  }

  /**
   * 模拟雇佣新Agent后的成本
   * @param {string} userId - 用户ID
   * @param {string} agentTypeId - 要雇佣的Agent类型ID
   * @returns {Object} 模拟结果
   */
  simulateHire(userId, agentTypeId) {
    const agentType = AgentType.getById(agentTypeId);
    if (!agentType) {
      return {
        success: false,
        error: '无效的Agent类型'
      };
    }

    const currentCost = this.calculateMonthlyCost(userId);
    const newCost = currentCost.totalCost + agentType.salary;
    const costIncrease = agentType.salary;
    const costIncreaseRate = ((costIncrease / currentCost.totalCost) * 100).toFixed(2);

    return {
      success: true,
      agentType: {
        id: agentType.id,
        name: agentType.name,
        salary: agentType.salary
      },
      currentCost: currentCost.totalCost,
      newCost,
      costIncrease,
      costIncreaseRate: parseFloat(costIncreaseRate),
      newAgentCount: currentCost.agentCount + 1,
      newAverageSalary: Math.round(newCost / (currentCost.agentCount + 1))
    };
  }

  /**
   * 根据ROI获取评级
   * @private
   */
  _getRatingFromROI(roi) {
    if (roi >= 10) return '优秀';
    if (roi >= 5) return '良好';
    if (roi >= 2) return '一般';
    return '待提升';
  }

  /**
   * 生成优化建议
   * @private
   */
  _generateRecommendations(userId, monthlyCost, roiRanking) {
    const recommendations = [];

    // 1. 高成本低产出Agent建议
    const lowROIAgents = roiRanking.filter(agent => agent.roi < 2);
    if (lowROIAgents.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `有 ${lowROIAgents.length} 个Agent的ROI较低，建议优化任务分配或考虑重新配置团队`
      });
    }

    // 2. 预算建议
    if (monthlyCost.totalCost > 50000) {
      recommendations.push({
        type: 'budget',
        priority: 'medium',
        message: '月度成本较高，建议定期评估团队配置的必要性'
      });
    }

    // 3. 类别平衡建议
    const categoryCount = monthlyCost.costByCategory.length;
    if (categoryCount < 3) {
      recommendations.push({
        type: 'diversity',
        priority: 'low',
        message: '团队技能类别较少，建议增加多样性以提升综合能力'
      });
    }

    return recommendations;
  }
}

export default SalaryService;
