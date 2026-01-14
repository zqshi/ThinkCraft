/**
 * CollaborationPlanningService
 * 协同规划服务 - 核心业务逻辑
 *
 * 职责：
 * 1. 创建协同计划
 * 2. AI能力分析
 * 3. 生成三种协同模式
 * 4. 管理协同计划生命周期
 */

import { callDeepSeekAPI } from '../../../config/deepseek.js';
import { CollaborationPlan } from '../models/CollaborationPlan.js';
import { CapabilityAnalysis } from '../models/valueObjects/CapabilityAnalysis.js';
import { PromptBuilder } from '../models/valueObjects/CollaborationPrompts.js';

/**
 * CollaborationPlanningService 类
 */
export class CollaborationPlanningService {
  /**
   * 构造函数
   * @param {Object} agentHireService - Agent雇佣服务
   */
  constructor(agentHireService) {
    this.agentHireService = agentHireService;
    this.plans = new Map(); // planId -> CollaborationPlan（内存存储）
  }

  /**
   * 创建协同计划（步骤1：用户输入目标）
   * @param {string} userId - 用户ID
   * @param {string} goal - 协同目标
   * @param {string} projectId - 项目ID（可选）
   * @returns {CollaborationPlan}
   */
  createPlan(userId, goal, projectId = null) {
    console.log(`[CollaborationPlanning] 创建协同计划: userId=${userId}, projectId=${projectId || 'null'}, goal=${goal}`);

    const plan = CollaborationPlan.create(userId, goal, projectId);

    // 验证
    const validation = plan.validate();
    if (!validation.valid) {
      throw new Error(`协同计划数据无效: ${validation.errors.join(', ')}`);
    }

    // 保存
    this.plans.set(plan.id, plan);

    console.log(`[CollaborationPlanning] 协同计划已创建: ${plan.id}`);
    return plan;
  }

  /**
   * 分析能力（步骤2：AI判断是否满足）
   * @param {string} planId - 协同计划ID
   * @param {Array<string>} agentIds - 指定的Agent ID列表（可选，用于项目模式）
   * @returns {Promise<Object>} { planId, analysis, nextStep }
   */
  async analyzeCapability(planId, agentIds = null) {
    console.log(`[CollaborationPlanning] 开始能力分析: planId=${planId}, 指定Agent=${agentIds ? agentIds.length : 'null'}`);

    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`协同计划不存在: ${planId}`);
    }

    // 获取分析用的Agent列表
    let currentAgents;
    if (agentIds && agentIds.length > 0) {
      // 项目模式：使用项目的assignedAgents
      const allAgents = this.agentHireService.getUserAgents(plan.userId);
      currentAgents = allAgents.filter(agent => agentIds.includes(agent.id));
      console.log(`[CollaborationPlanning] 项目模式: 从 ${allAgents.length} 个Agent中筛选出 ${currentAgents.length} 个项目Agent`);
    } else {
      // 全局模式：使用用户所有Agent
      currentAgents = this.agentHireService.getUserAgents(plan.userId);
      console.log(`[CollaborationPlanning] 全局模式: 用户当前有 ${currentAgents.length} 个Agent`);
    }

    // 构建提示词
    const prompt = PromptBuilder.buildCapabilityAnalysisPrompt(
      plan.goal,
      currentAgents
    );

    // 调用AI分析
    console.log('[CollaborationPlanning] 调用AI进行能力分析...');
    const aiResponse = await callDeepSeekAPI(
      [{ role: 'user', content: prompt }],
      null,
      {
        max_tokens: 1500,
        temperature: 0.3  // 低温度保证JSON结构稳定
      }
    );

    // 解析AI响应（提取JSON）
    const analysisData = this._extractJSON(aiResponse.content);

    // 创建能力分析值对象
    const analysis = CapabilityAnalysis.fromAIResponse(analysisData, currentAgents);

    // 验证能力分析数据
    const validation = analysis.validate();
    if (!validation.valid) {
      console.error('[CollaborationPlanning] 能力分析数据无效:', validation.errors);
      throw new Error(`能力分析数据无效: ${validation.errors.join(', ')}`);
    }

    // 保存到计划
    plan.setCapabilityAnalysis(analysis);

    console.log(`[CollaborationPlanning] 能力分析完成: ${analysis.isSufficient ? '✅ 满足' : '⚠️ 不足'} (置信度: ${analysis.confidenceScore}%)`);

    return {
      planId: plan.id,
      analysis: analysis.toJSON(),
      nextStep: analysis.isSufficient ? 'generate_modes' : 'hire_agents'
    };
  }

  /**
   * 生成协同模式（步骤3：AI生成三种模式）
   * @param {string} planId - 协同计划ID
   * @returns {Promise<Object>} { planId, modes, metadata }
   */
  async generateCollaborationModes(planId) {
    console.log(`[CollaborationPlanning] 开始生成协同模式: planId=${planId}`);

    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`协同计划不存在: ${planId}`);
    }

    if (!plan.capabilityAnalysis) {
      throw new Error('请先完成能力分析');
    }

    if (!plan.capabilityAnalysis.isSufficient) {
      throw new Error('当前能力不足，请先雇佣推荐的Agent');
    }

    // 获取可用Agent（空闲且未解雇）
    const availableAgents = this.agentHireService.getUserAgents(plan.userId)
      .filter(a => a.canAcceptTask());

    if (availableAgents.length === 0) {
      throw new Error('当前没有可用的Agent');
    }

    console.log(`[CollaborationPlanning] 可用Agent数量: ${availableAgents.length}`);

    // 构建提示词
    const prompt = PromptBuilder.buildCollaborationModePrompt(
      plan.goal,
      plan.capabilityAnalysis.toJSON(),
      availableAgents
    );

    // 调用AI生成协同模式
    console.log('[CollaborationPlanning] 调用AI生成协同模式...');
    const aiResponse = await callDeepSeekAPI(
      [{ role: 'user', content: prompt }],
      null,
      {
        max_tokens: 2500,
        temperature: 0.7  // 中等温度，平衡创造性和稳定性
      }
    );

    // 解析三种模式
    const modes = this._extractJSON(aiResponse.content);

    // 验证必需字段
    if (!modes.roleRecommendation || !modes.workflowOrchestration || !modes.taskDecomposition) {
      throw new Error('AI返回的协同模式不完整');
    }

    // 保存到计划
    plan.setCollaborationModes(
      modes.roleRecommendation,
      modes.workflowOrchestration,
      modes.taskDecomposition
    );

    console.log('[CollaborationPlanning] 协同模式生成完成');
    console.log(`  - 工作流步骤: ${modes.workflowOrchestration.steps.length}个`);
    console.log(`  - 推荐Agent: ${modes.roleRecommendation.recommended.length}个`);
    console.log(`  - 主要任务: ${modes.taskDecomposition.mainTasks.length}个`);

    return {
      planId: plan.id,
      modes: {
        roleRecommendation: plan.roleRecommendation,
        workflowOrchestration: plan.workflowOrchestration,
        taskDecomposition: plan.taskDecomposition
      },
      metadata: modes.metadata || {}
    };
  }

  /**
   * 获取协同计划
   * @param {string} planId - 协同计划ID
   * @returns {Object|null}
   */
  getPlan(planId) {
    const plan = this.plans.get(planId);
    return plan ? plan.toJSON() : null;
  }

  /**
   * 获取用户所有协同计划
   * @param {string} userId - 用户ID
   * @returns {Array}
   */
  getUserPlans(userId) {
    const plans = [];
    for (const plan of this.plans.values()) {
      if (plan.userId === userId) {
        plans.push(plan.toJSON());
      }
    }
    return plans;
  }

  /**
   * 删除协同计划
   * @param {string} planId - 协同计划ID
   * @returns {boolean}
   */
  deletePlan(planId) {
    return this.plans.delete(planId);
  }

  /**
   * 提取JSON（处理AI可能返回的markdown包裹）
   * @param {string} text - AI响应文本
   * @returns {Object} 解析后的JSON对象
   * @private
   */
  _extractJSON(text) {
    // 尝试提取 ```json ... ``` 中的内容
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('[CollaborationPlanning] JSON解析失败（markdown格式）:', e.message);
        throw new Error('AI返回的JSON格式无效（markdown包裹）');
      }
    }

    // 尝试提取 {...} 或 [...]
    const objectMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[1]);
      } catch (e) {
        console.error('[CollaborationPlanning] JSON解析失败（对象提取）:', e.message);
        throw new Error('AI返回的JSON格式无效（对象提取）');
      }
    }

    // 尝试直接解析
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('[CollaborationPlanning] JSON解析失败（直接解析）:', e.message);
      console.error('[CollaborationPlanning] AI原始响应:', text.substring(0, 500));
      throw new Error('AI返回的JSON格式无效，请检查提示词或重试');
    }
  }
}

export default CollaborationPlanningService;
