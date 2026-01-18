/**
 * Agent雇佣服务（Domain Service）
 * 负责处理Agent雇佣相关的业务逻辑
 *
 * DDD 领域服务特点：
 * - 封装跨实体的业务逻辑
 * - 支持数据持久化（通过Repository）
 * - 协调实体和值对象
 */

import { Agent } from '../models/Agent.js';
import { AgentType } from '../models/valueObjects/AgentType.js';

/**
 * Agent雇佣服务类
 */
export class AgentHireService {
  /**
   * 构造函数
   * @param {Object} agentRepository - Agent仓储（用于持久化）
   */
  constructor(agentRepository = null) {
    this.agentRepository = agentRepository;
    // 内存缓存（提高性能，Map: userId -> Agent[]）
    this.userAgents = new Map();

    // 如果提供了Repository，从持久化数据初始化
    if (this.agentRepository) {
      this._loadFromRepository();
    }
  }

  /**
   * 从Repository加载数据到内存
   * @private
   */
  _loadFromRepository() {
    try {
      const stats = this.agentRepository.getStats();
      console.log('[AgentHireService] 从Repository加载数据:', stats);

      // 注意：这里只是获取统计信息，实际数据按需加载（lazy loading）
      // 避免一次性加载所有用户数据到内存
    } catch (error) {
      console.error('[AgentHireService] 加载数据失败:', error);
    }
  }

  /**
   * 雇佣Agent
   * @param {string} userId - 用户ID
   * @param {string} agentTypeId - Agent类型ID
   * @param {string} nickname - 昵称（可选）
   * @returns {Object} { success: boolean, agent?: Agent, error?: string }
   */
  hire(userId, agentTypeId, nickname = null) {
    // 1. 验证参数
    const validation = this._validateHireParams(userId, agentTypeId);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // 2. 检查Agent类型是否存在
    const agentType = AgentType.getById(agentTypeId);
    if (!agentType) {
      return {
        success: false,
        error: `无效的Agent类型: ${agentTypeId}`
      };
    }

    // 3. 业务规则检查
    const businessCheck = this._checkBusinessRules(userId, agentType);
    if (!businessCheck.valid) {
      return {
        success: false,
        error: businessCheck.error
      };
    }

    // 4. 创建Agent实例（使用工厂方法）
    const agent = Agent.hire(userId, agentTypeId, nickname);
    if (!agent) {
      return {
        success: false,
        error: 'Agent创建失败'
      };
    }

    // 5. 验证Agent实例
    const agentValidation = agent.validate();
    if (!agentValidation.valid) {
      return {
        success: false,
        error: `Agent数据无效: ${agentValidation.errors.join(', ')}`
      };
    }

    // 6. 保存Agent
    this._saveAgent(userId, agent);

    // 7. 记录日志（可以发送领域事件）
    console.log(`[AgentHireService] 用户 ${userId} 雇佣了 ${agent.nickname} (${agentType.name})`);

    return {
      success: true,
      agent: agent
    };
  }

  /**
   * 批量雇佣Agent
   * @param {string} userId - 用户ID
   * @param {Array<Object>} hireRequests - 雇佣请求列表 [{ agentTypeId, nickname }]
   * @returns {Object} { success: boolean, agents: Agent[], errors: Array }
   */
  batchHire(userId, hireRequests) {
    const results = {
      success: true,
      agents: [],
      errors: []
    };

    for (const request of hireRequests) {
      const result = this.hire(userId, request.agentTypeId, request.nickname);

      if (result.success) {
        results.agents.push(result.agent);
      } else {
        results.success = false;
        results.errors.push({
          agentTypeId: request.agentTypeId,
          error: result.error
        });
      }
    }

    return results;
  }

  /**
   * 获取用户的所有Agent
   * @param {string} userId - 用户ID
   * @returns {Array<Agent>} Agent列表
   */
  getUserAgents(userId) {
    // 1. 先从内存缓存获取
    if (this.userAgents.has(userId)) {
      return this.userAgents.get(userId);
    }

    // 2. 如果有Repository，从持久化数据加载
    if (this.agentRepository) {
      const agentsData = this.agentRepository.getUserAgents(userId);

      // 将JSON数据转换为Agent实例
      const agents = agentsData.map(data => Agent.fromJSON(data));

      // 缓存到内存
      this.userAgents.set(userId, agents);

      return agents;
    }

    // 3. 没有Repository，返回空数组
    return [];
  }

  /**
   * 根据ID获取Agent
   * @param {string} userId - 用户ID
   * @param {string} agentId - Agent ID
   * @returns {Agent|null} Agent实例或null
   */
  getAgentById(userId, agentId) {
    const agents = this.getUserAgents(userId);
    return agents.find(agent => agent.id === agentId) || null;
  }

  /**
   * 解雇Agent
   * @param {string} userId - 用户ID
   * @param {string} agentId - Agent ID
   * @returns {Object} { success: boolean, error?: string }
   */
  fire(userId, agentId) {
    const agent = this.getAgentById(userId, agentId);

    if (!agent) {
      return {
        success: false,
        error: 'Agent不存在'
      };
    }

    if (agent.isFired()) {
      return {
        success: false,
        error: 'Agent已经被解雇'
      };
    }

    // 解雇Agent
    agent.fire();

    // 同步到Repository
    this._syncToRepository(userId);

    console.log(`[AgentHireService] 用户 ${userId} 解雇了 ${agent.nickname}`);

    return {
      success: true,
      agent: agent
    };
  }

  /**
   * 获取团队统计信息
   * @param {string} userId - 用户ID
   * @returns {Object} 团队统计
   */
  getTeamStats(userId) {
    const agents = this.getUserAgents(userId);
    const activeAgents = agents.filter(a => !a.isFired());

    // 按类别分组
    const byCategory = {};
    for (const agent of activeAgents) {
      const type = agent.getType();
      const category = type?.category || 'unknown';

      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(agent);
    }

    // 计算总薪资
    const monthlyCost = activeAgents.reduce((sum, agent) => sum + agent.getSalary(), 0);

    // 计算平均绩效
    const avgPerformance = activeAgents.length > 0
      ? activeAgents.reduce((sum, agent) => sum + agent.performance, 0) / activeAgents.length
      : 0;

    // 按状态统计
    const byStatus = {
      idle: activeAgents.filter(a => a.isIdle()).length,
      working: activeAgents.filter(a => a.isWorking()).length
    };

    return {
      total: agents.length,
      active: activeAgents.length,
      fired: agents.filter(a => a.isFired()).length,
      byCategory: Object.entries(byCategory).map(([category, agents]) => ({
        category,
        count: agents.length
      })),
      byStatus,
      monthlyCost,
      avgPerformance: Math.round(avgPerformance),
      totalTasksCompleted: activeAgents.reduce((sum, a) => sum + a.tasksCompleted, 0)
    };
  }

  /**
   * 获取可雇佣的Agent类型列表
   * @returns {Array<Object>} Agent类型列表
   */
  getAvailableAgentTypes() {
    return AgentType.getAll().map(type => ({
      ...type,
      available: true
    }));
  }

  /**
   * 根据预算推荐Agent
   * @param {number} budget - 预算
   * @returns {Array<Object>} 推荐的Agent类型
   */
  recommendAgentsByBudget(budget) {
    const allTypes = AgentType.getAll();
    const affordable = allTypes.filter(type => type.salary <= budget);

    // 按性价比排序（薪资越低、级别越高越好）
    const levelScore = {
      'junior': 1,
      'mid': 2,
      'senior': 3,
      'expert': 4
    };

    return affordable
      .map(type => ({
        ...type,
        score: levelScore[type.level] / type.salary * 10000
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // 返回前5个推荐
  }

  /**
   * 根据技能搜索可雇佣的Agent
   * @param {string} skill - 技能关键词
   * @returns {Array<Object>} 匹配的Agent类型
   */
  searchAgentsBySkill(skill) {
    return AgentType.searchBySkill(skill);
  }

  /**
   * 验证雇佣参数
   * @private
   */
  _validateHireParams(userId, agentTypeId) {
    if (!userId) {
      return { valid: false, error: '用户ID不能为空' };
    }

    if (!agentTypeId) {
      return { valid: false, error: 'Agent类型ID不能为空' };
    }

    return { valid: true };
  }

  /**
   * 检查业务规则
   * @private
   */
  _checkBusinessRules(userId, agentType) {
    // 示例业务规则：
    // 1. 检查团队人数限制
    const agents = this.getUserAgents(userId);
    const MAX_TEAM_SIZE = 50; // 最大团队规模

    if (agents.length >= MAX_TEAM_SIZE) {
      return {
        valid: false,
        error: `团队人数已达上限（${MAX_TEAM_SIZE}人）`
      };
    }

    // 2. 检查是否重复雇佣同类型（可选规则）
    // const hasSameType = agents.some(a => a.typeId === agentType.id && !a.isFired());
    // if (hasSameType) {
    //   return {
    //     valid: false,
    //     error: `已经雇佣了${agentType.name}，不能重复雇佣`
    //   };
    // }

    // 更多业务规则可以在这里添加...

    return { valid: true };
  }

  /**
   * 保存Agent到存储
   * @private
   */
  _saveAgent(userId, agent) {
    if (!this.userAgents.has(userId)) {
      this.userAgents.set(userId, []);
    }

    this.userAgents.get(userId).push(agent);

    // 如果有Repository，保存到持久化存储
    if (this.agentRepository) {
      this.agentRepository.saveAgent(userId, agent.toJSON());
    }
  }

  /**
   * 同步用户的所有Agent到Repository
   * @private
   */
  _syncToRepository(userId) {
    if (this.agentRepository && this.userAgents.has(userId)) {
      const agents = this.userAgents.get(userId);
      const agentsData = agents.map(agent => agent.toJSON());
      this.agentRepository.saveUserAgents(userId, agentsData);
    }
  }

  /**
   * 清空用户的所有Agent（仅用于测试）
   * @param {string} userId - 用户ID
   */
  clearUserAgents(userId) {
    this.userAgents.delete(userId);
  }

  /**
   * 清空所有数据（仅用于测试）
   */
  clearAll() {
    this.userAgents.clear();

    if (this.agentRepository) {
      this.agentRepository.clearAll();
    }
  }
}

export default AgentHireService;
