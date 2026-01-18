/**
 * 任务分配服务（Domain Service）
 * 负责处理Agent任务分配和执行相关的业务逻辑
 *
 * DDD 领域服务特点：
 * - 协调Agent实体和AI服务
 * - 处理任务生命周期
 * - 管理任务状态转换
 */

import { callDeepSeekAPI } from '../../../config/deepseek.js';

/**
 * Agent任务提示词模板
 */
const AGENT_TASK_PROMPTS = {
  'product-manager': `你是一名资深产品经理。{TASK}

请从产品角度给出专业建议：
- 需求分析：深入理解用户需求和业务目标
- 产品设计：功能规划、优先级排序
- 竞品分析：行业竞品研究
- 数据驱动：基于数据做产品决策

输出要求：
- 结构化、清晰
- 数据支撑
- 可执行性强`,

  'designer': `你是一名资深UI/UX设计师。{TASK}

请从设计角度给出专业建议：
- 用户体验：交互流程、易用性
- 视觉设计：配色、布局、风格
- 设计规范：组件库、设计系统
- 可访问性：无障碍设计

输出要求：
- 具体、可落地
- 符合设计趋势
- 考虑用户心理`,

  'frontend-dev': `你是一名资深前端工程师。{TASK}

请从前端技术角度给出专业建议：
- 技术选型：框架、工具选择
- 架构设计：组件设计、状态管理
- 性能优化：加载速度、渲染优化
- 代码规范：最佳实践、可维护性

输出要求：
- 技术准确
- 代码示例
- 性能考虑`,

  'backend-dev': `你是一名资深后端工程师。{TASK}

请从后端技术角度给出专业建议：
- 系统架构：服务设计、数据流
- API设计：RESTful、GraphQL
- 数据库设计：表结构、索引优化
- 性能优化：缓存、并发处理

输出要求：
- 架构清晰
- 代码示例
- 可扩展性强`,

  'marketing': `你是一名资深营销专员。{TASK}

请从市场营销角度给出专业建议：
- 营销策略：渠道选择、预算分配
- 内容营销：文案撰写、内容规划
- 用户增长：获客、转化、留存
- 数据分析：ROI分析、效果评估

输出要求：
- 策略明确
- 可执行性强
- 数据驱动`,

  'operations': `你是一名资深运营专员。{TASK}

请从产品运营角度给出专业建议：
- 用户运营：用户分层、活跃策略
- 活动策划：活动设计、执行方案
- 数据分析：用户行为、运营指标
- 内容运营：内容规划、质量管控

输出要求：
- 策略清晰
- 可落地执行
- 效果可衡量`,

  'sales': `你是一名资深销售经理。{TASK}

请从销售角度给出专业建议：
- 销售策略：目标客户、销售流程
- 商务谈判：谈判技巧、合作模式
- 客户管理：客户关系、售后服务
- 业绩管理：目标设定、激励机制

输出要求：
- 策略实用
- 案例丰富
- 易于执行`,

  'customer-service': `你是一名专业客服专员。{TASK}

请从客户服务角度给出专业建议：
- 客户沟通：沟通技巧、话术设计
- 问题解决：快速响应、有效解决
- 服务质量：服务标准、满意度提升
- 投诉处理：投诉应对、改进措施

输出要求：
- 专业友好
- 解决方案明确
- 易于操作`,

  'accountant': `你是一名专业财务专员。{TASK}

请从财务角度给出专业建议：
- 财务分析：收支分析、成本控制
- 预算管理：预算编制、执行监控
- 报表制作：财务报表、数据可视化
- 风险控制：财务风险、合规管理

输出要求：
- 数据准确
- 分析深入
- 建议可行`,

  'legal': `你是一名专业法务顾问。{TASK}

请从法律角度给出专业建议：
- 合同审核：条款审查、风险识别
- 法律咨询：法规解读、合规建议
- 知识产权：专利保护、侵权应对
- 风险控制：法律风险、预防措施

输出要求：
- 法律准确
- 风险明确
- 建议可操作`,

  'consultant': `你是一名资深商业顾问。{TASK}

请从战略角度给出专业建议：
- 战略规划：长期目标、发展路径
- 商业模式：盈利模式、商业闭环
- 市场洞察：行业趋势、机会识别
- 风险评估：潜在风险、应对策略

输出要求：
- 战略高度
- 深度洞察
- 可落地性`,

  'data-analyst': `你是一名资深数据分析师。{TASK}

请从数据分析角度给出专业建议：
- 数据收集：数据源、采集方案
- 数据分析：统计分析、可视化
- 业务洞察：数据解读、趋势预测
- 决策支持：数据驱动、优化建议

输出要求：
- 数据准确
- 可视化清晰
- 洞察深刻`
};

/**
 * 任务分配服务类
 */
export class TaskAssignmentService {
  /**
   * 构造函数
   * @param {Object} agentHireService - Agent雇佣服务（用于获取Agent）
   */
  constructor(agentHireService) {
    this.agentHireService = agentHireService;
    this.taskHistory = new Map(); // agentId -> tasks[]
  }

  /**
   * 分配任务给Agent
   * @param {string} userId - 用户ID
   * @param {string} agentId - Agent ID
   * @param {string} task - 任务描述
   * @param {string} context - 背景信息（可选）
   * @returns {Promise<Object>} { success: boolean, result?: Object, error?: string }
   */
  async assignTask(userId, agentId, task, context = null) {
    try {
      // 1. 验证参数
      const validation = this._validateTaskParams(userId, agentId, task);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 2. 获取Agent
      const agent = this.agentHireService.getAgentById(userId, agentId);
      if (!agent) {
        return {
          success: false,
          error: 'Agent不存在'
        };
      }

      // 3. 检查Agent是否可以接受任务
      if (!agent.canAcceptTask()) {
        return {
          success: false,
          error: `Agent ${agent.nickname} 不可用（状态: ${agent.status}, 已解雇: ${agent.isFired()}）`
        };
      }

      // 4. 分配任务给Agent（更新Agent状态）
      try {
        agent.assignTask({ description: task, context });
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }

      console.log(`[TaskAssignmentService] ${agent.nickname} 开始处理任务: ${task}`);

      // 5. 使用AI生成任务结果
      let aiResult;
      try {
        aiResult = await this._executeTaskWithAI(agent, task, context);
      } catch (error) {
        // AI调用失败，标记任务失败
        agent.failTask(error.message);
        return {
          success: false,
          error: `AI调用失败: ${error.message}`
        };
      }

      // 6. 完成任务
      const completedTask = agent.completeTask({
        content: aiResult.content,
        tokens: aiResult.usage.total_tokens
      });

      // 7. 保存任务历史
      this._saveTaskHistory(agentId, {
        ...completedTask,
        agentName: agent.nickname,
        agentType: agent.typeId
      });

      console.log(`[TaskAssignmentService] ${agent.nickname} 完成任务，tokens: ${aiResult.usage.total_tokens}`);

      // 8. 返回任务结果
      return {
        success: true,
        result: {
          agentId: agent.id,
          agentName: agent.nickname,
          agentType: agent.typeId,
          task,
          result: aiResult.content,
          tokens: aiResult.usage.total_tokens,
          completedAt: completedTask.completedAt
        }
      };

    } catch (error) {
      console.error('[TaskAssignmentService] 任务分配失败:', error);
      return {
        success: false,
        error: `任务分配失败: ${error.message}`
      };
    }
  }

  /**
   * 批量分配任务
   * @param {string} userId - 用户ID
   * @param {Array<Object>} taskRequests - 任务列表 [{ agentId, task, context }]
   * @returns {Promise<Object>} { success: boolean, results: Array, errors: Array }
   */
  async batchAssignTasks(userId, taskRequests) {
    const results = {
      success: true,
      results: [],
      errors: []
    };

    for (const request of taskRequests) {
      const result = await this.assignTask(
        userId,
        request.agentId,
        request.task,
        request.context
      );

      if (result.success) {
        results.results.push(result.result);
      } else {
        results.success = false;
        results.errors.push({
          agentId: request.agentId,
          task: request.task,
          error: result.error
        });
      }
    }

    return results;
  }

  /**
   * 获取Agent的任务历史
   * @param {string} agentId - Agent ID
   * @param {number} limit - 返回数量限制
   * @returns {Array<Object>} 任务历史列表
   */
  getTaskHistory(agentId, limit = 10) {
    const history = this.taskHistory.get(agentId) || [];
    return history.slice(-limit).reverse(); // 返回最近的N条
  }

  /**
   * 获取用户所有Agent的任务历史
   * @param {string} userId - 用户ID
   * @param {number} limit - 每个Agent返回的任务数量
   * @returns {Array<Object>} 任务历史列表
   */
  getUserTaskHistory(userId, limit = 10) {
    const agents = this.agentHireService.getUserAgents(userId);
    const allHistory = [];

    for (const agent of agents) {
      const history = this.getTaskHistory(agent.id, limit);
      allHistory.push(...history);
    }

    // 按完成时间排序
    return allHistory.sort((a, b) =>
      new Date(b.completedAt) - new Date(a.completedAt)
    );
  }

  /**
   * 获取任务统计信息
   * @param {string} userId - 用户ID
   * @returns {Object} 任务统计
   */
  getTaskStats(userId) {
    const agents = this.agentHireService.getUserAgents(userId);

    let totalTasks = 0;
    let totalTokens = 0;
    const byAgentType = {};

    for (const agent of agents) {
      totalTasks += agent.tasksCompleted;

      const history = this.getTaskHistory(agent.id);
      totalTokens += history.reduce((sum, task) => sum + (task.tokens || 0), 0);

      const agentType = agent.getType();
      const typeName = agentType?.name || 'unknown';

      if (!byAgentType[typeName]) {
        byAgentType[typeName] = {
          count: 0,
          tasks: 0
        };
      }

      byAgentType[typeName].count++;
      byAgentType[typeName].tasks += agent.tasksCompleted;
    }

    return {
      totalTasks,
      totalTokens,
      byAgentType,
      avgTasksPerAgent: agents.length > 0 ? (totalTasks / agents.length).toFixed(2) : 0
    };
  }

  /**
   * 推荐最合适的Agent来完成任务
   * @param {string} userId - 用户ID
   * @param {string} taskDescription - 任务描述
   * @returns {Object|null} 推荐的Agent
   */
  recommendAgent(userId, taskDescription) {
    const agents = this.agentHireService.getUserAgents(userId)
      .filter(agent => agent.canAcceptTask());

    if (agents.length === 0) {
      return null;
    }

    // 简单的关键词匹配算法
    const taskLower = taskDescription.toLowerCase();
    let bestAgent = null;
    let bestScore = 0;

    for (const agent of agents) {
      const skills = agent.getSkills();
      let score = 0;

      // 技能匹配度
      for (const skill of skills) {
        if (taskLower.includes(skill.toLowerCase())) {
          score += 10;
        }
      }

      // 绩效加成
      score += agent.performance / 10;

      // 空闲优先（相同分数下选择空闲的）
      if (agent.isIdle()) {
        score += 5;
      }

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    return bestAgent;
  }

  /**
   * 使用AI执行任务
   * @private
   */
  async _executeTaskWithAI(agent, task, context) {
    const agentType = agent.getType();
    const promptTemplate = AGENT_TASK_PROMPTS[agent.typeId] ||
                          AGENT_TASK_PROMPTS['consultant'];

    const prompt = promptTemplate.replace('{TASK}', task);

    const fullPrompt = context
      ? `${prompt}\n\n背景信息：\n${context}`
      : prompt;

    // 调用DeepSeek API
    return await callDeepSeekAPI(
      [{ role: 'user', content: fullPrompt }],
      null,
      {
        max_tokens: 2000,
        temperature: 0.7
      }
    );
  }

  /**
   * 验证任务参数
   * @private
   */
  _validateTaskParams(userId, agentId, task) {
    if (!userId) {
      return { valid: false, error: '用户ID不能为空' };
    }

    if (!agentId) {
      return { valid: false, error: 'Agent ID不能为空' };
    }

    if (!task || task.trim().length === 0) {
      return { valid: false, error: '任务描述不能为空' };
    }

    return { valid: true };
  }

  /**
   * 保存任务历史
   * @private
   */
  _saveTaskHistory(agentId, taskData) {
    if (!this.taskHistory.has(agentId)) {
      this.taskHistory.set(agentId, []);
    }

    this.taskHistory.get(agentId).push(taskData);

    // 保持最近100条记录
    const history = this.taskHistory.get(agentId);
    if (history.length > 100) {
      this.taskHistory.set(agentId, history.slice(-100));
    }
  }

  /**
   * 清空任务历史（仅用于测试）
   */
  clearTaskHistory() {
    this.taskHistory.clear();
  }
}

// 导出提示词模板（供其他模块使用）
export { AGENT_TASK_PROMPTS };

export default TaskAssignmentService;
