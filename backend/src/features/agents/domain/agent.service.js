/**
 * Agent领域服务
 * 处理跨实体的复杂业务逻辑
 */
import { DomainService } from '../../../shared/domain/index.js';
import { Agent } from './agent.aggregate.js';
import { AgentStatus } from './agent-status.vo.js';
import { AgentType } from './agent-type.vo.js';
import { AgentCapability } from './agent-capability.vo.js';

export class AgentService extends DomainService {
  constructor() {
    super();
  }

  /**
   * 创建新的Agent
   */
  async createAgent(id, name, description, type, capabilities = [], config = {}) {
    this.validateParams({ id, name, description, type });

    try {
      // 转换能力类型
      const capabilityObjects = capabilities.map(cap =>
        typeof cap === 'string' ? AgentCapability.create(cap) : cap
      );

      // 转换Agent类型
      const agentType = typeof type === 'string' ? AgentType.create(type) : type;

      // 创建Agent
      const agent = Agent.create(id, name, description, agentType, capabilityObjects, config);

      return agent;
    } catch (error) {
      throw new Error(`创建Agent失败: ${error.message}`);
    }
  }

  /**
   * 更新Agent
   */
  async updateAgent(agent, updateDTO) {
    this.validateParams({ agent, updateDTO });

    try {
      // 更新名称
      if (updateDTO.name !== null) {
        // 注意：实际项目中可能需要更复杂的更新逻辑
        agent._name = updateDTO.name;
      }

      // 更新描述
      if (updateDTO.description !== null) {
        agent._description = updateDTO.description;
      }

      // 更新配置
      if (updateDTO.config !== null) {
        agent.updateConfig(updateDTO.config);
      }

      // 更新元数据
      if (updateDTO.metadata !== null) {
        for (const [key, value] of Object.entries(updateDTO.metadata)) {
          agent.addMetadata(key, value);
        }
      }

      // 更新能力
      if (updateDTO.capabilities !== null) {
        // 清除现有能力
        for (const capability of [...agent.capabilities]) {
          agent.removeCapability(capability);
        }
        // 添加新能力
        for (const capability of updateDTO.capabilities) {
          const capabilityObj =
            typeof capability === 'string' ? AgentCapability.create(capability) : capability;
          agent.addCapability(capabilityObj);
        }
      }

      return agent;
    } catch (error) {
      throw new Error(`更新Agent失败: ${error.message}`);
    }
  }

  /**
   * 激活Agent
   */
  async activateAgent(agent) {
    this.validateParams({ agent });

    try {
      agent.activate();
      return agent;
    } catch (error) {
      throw new Error(`激活Agent失败: ${error.message}`);
    }
  }

  /**
   * 停用Agent
   */
  async deactivateAgent(agent) {
    this.validateParams({ agent });

    try {
      agent.deactivate();
      return agent;
    } catch (error) {
      throw new Error(`停用Agent失败: ${error.message}`);
    }
  }

  /**
   * 为Agent分配合适的任务
   */
  async assignTaskToAgent(agent, task) {
    this.validateParams({ agent, task });

    try {
      // 检查Agent状态
      if (!agent.status.canExecuteTask) {
        throw new Error('Agent当前状态无法执行任务');
      }

      // 检查Agent是否支持任务类型
      if (!agent.supportsTask(task.type)) {
        throw new Error(`Agent不支持任务类型: ${task.type}`);
      }

      // 设置Agent为忙碌状态
      agent.setBusy();

      return agent;
    } catch (error) {
      throw new Error(`分配任务失败: ${error.message}`);
    }
  }

  /**
   * 为任务选择最合适的Agent
   */
  async selectBestAgentForTask(agents, task) {
    this.validateParams({ agents, task });

    if (!Array.isArray(agents) || agents.length === 0) {
      throw new Error('Agent列表不能为空');
    }

    try {
      const candidates = [];

      for (const agent of agents) {
        // 评分逻辑
        let score = 0;

        // 1. 检查状态（必须可执行任务）
        if (!agent.status.canExecuteTask) {
          continue;
        }

        // 2. 检查能力匹配
        if (agent.supportsTask(task.type)) {
          score += 50;
        }

        // 3. 检查专业能力匹配
        const taskCapabilities = this._getRequiredCapabilitiesForTask(task.type);
        const matchingCapabilities = agent.capabilities.filter(cap =>
          taskCapabilities.includes(cap.value)
        );
        score += matchingCapabilities.length * 20;

        // 4. 检查负载情况（空闲的Agent得分更高）
        if (agent.status.isIdle) {
          score += 10;
        }

        // 5. 检查最近活跃时间（最近活跃的得分更高）
        if (agent.lastActiveAt) {
          const hoursSinceActive = (Date.now() - agent.lastActiveAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceActive < 1) {
            score += 5;
          }
        }

        candidates.push({ agent, score });
      }

      if (candidates.length === 0) {
        throw new Error('没有合适的Agent可以执行此任务');
      }

      // 按得分排序，返回得分最高的Agent
      candidates.sort((a, b) => b.score - a.score);
      return candidates[0].agent;
    } catch (error) {
      throw new Error(`选择最佳Agent失败: ${error.message}`);
    }
  }

  /**
   * 多Agent协作优化
   */
  async optimizeCollaboration(agents, task, collaborationType) {
    this.validateParams({ agents, task, collaborationType });

    try {
      // 根据协作类型进行优化
      switch (collaborationType) {
      case 'parallel':
        return this._optimizeParallelCollaboration(agents, task);
      case 'sequential':
        return this._optimizeSequentialCollaboration(agents, task);
      case 'hierarchical':
        return this._optimizeHierarchicalCollaboration(agents, task);
      default:
        throw new Error(`不支持的协作类型: ${collaborationType}`);
      }
    } catch (error) {
      throw new Error(`优化协作失败: ${error.message}`);
    }
  }

  /**
   * 优化并行协作
   */
  async _optimizeParallelCollaboration(agents, task) {
    // 选择所有空闲且支持任务的Agent
    const availableAgents = agents.filter(
      agent => agent.status.isIdle && agent.supportsTask(task.type)
    );

    // 根据任务复杂度确定需要的Agent数量
    const complexity = this._assessTaskComplexity(task);
    const requiredAgents = Math.min(availableAgents.length, complexity);

    return availableAgents.slice(0, requiredAgents);
  }

  /**
   * 优化顺序协作
   */
  async _optimizeSequentialCollaboration(agents, task) {
    // 按能力专业化程度排序
    const sortedAgents = [...agents].sort((a, b) => {
      const aSpecialization = this._calculateSpecializationScore(a, task.type);
      const bSpecialization = this._calculateSpecializationScore(b, task.type);
      return bSpecialization - aSpecialization;
    });

    // 选择前N个Agent
    const complexity = this._assessTaskComplexity(task);
    return sortedAgents.slice(0, complexity);
  }

  /**
   * 优化分层协作
   */
  async _optimizeHierarchicalCollaboration(agents, task) {
    if (agents.length < 2) {
      throw new Error('分层协作至少需要2个Agent');
    }

    // 选择管理能力最强的作为主Agent
    const masterCandidates = agents.filter(agent =>
      agent.hasCapability(AgentCapability.TASK_COORDINATION)
    );

    if (masterCandidates.length === 0) {
      // 如果没有具有管理能力的Agent，选择能力最全面的
      const sortedAgents = [...agents].sort((a, b) => {
        return b.capabilities.length - a.capabilities.length;
      });
      return [sortedAgents[0], ...sortedAgents.slice(1, 5)];
    }

    // 选择最合适的作为主Agent
    const masterAgent = masterCandidates[0];
    const slaveAgents = agents.filter(agent => agent.id !== masterAgent.id);

    return [masterAgent, ...slaveAgents];
  }

  /**
   * 获取任务所需能力
   */
  _getRequiredCapabilitiesForTask(taskType) {
    const taskCapabilityMap = {
      code_review: ['code_generation', 'debugging'],
      code_generation: ['code_generation'],
      bug_fix: ['debugging'],
      data_analysis: ['data_analysis'],
      report_writing: ['report_generation'],
      planning: ['project_planning'],
      scheduling: ['task_scheduling'],
      ui_design: ['ui_design'],
      visualization: ['visual_creation'],
      team_meeting: ['team_collaboration'],
      progress_report: ['progress_tracking']
    };

    return taskCapabilityMap[taskType] || ['conversation'];
  }

  /**
   * 评估任务复杂度
   */
  _assessTaskComplexity(task) {
    // 简化的复杂度评估
    if (task.content.length > 1000) {
      return 5; // 复杂
    } else if (task.content.length > 500) {
      return 3; // 中等
    } else {
      return 2; // 简单
    }
  }

  /**
   * 计算专业化评分
   */
  _calculateSpecializationScore(agent, taskType) {
    const requiredCapabilities = this._getRequiredCapabilitiesForTask(taskType);
    const matchingCapabilities = agent.capabilities.filter(cap =>
      requiredCapabilities.includes(cap.value)
    );

    // 基础分数：匹配的必需能力数量
    let score = matchingCapabilities.length * 10;

    // 额外分数：专业能力的深度
    if (agent.type.isAnalyst && taskType.includes('analysis')) {
      score += 20;
    }
    if (agent.type.isDeveloper && taskType.includes('code')) {
      score += 20;
    }
    if (agent.type.isDesigner && taskType.includes('design')) {
      score += 20;
    }

    return score;
  }

  /**
   * 获取Agent类型列表
   */
  async getAgentTypes() {
    return [
      AgentType.ASSISTANT,
      AgentType.ANALYST,
      AgentType.PLANNER,
      AgentType.DEVELOPER,
      AgentType.DESIGNER,
      AgentType.MANAGER,
      AgentType.CUSTOM
    ];
  }

  /**
   * 获取Agent能力列表
   */
  async getAgentCapabilities() {
    return [
      AgentCapability.CONVERSATION,
      AgentCapability.QUESTION_ANSWERING,
      AgentCapability.INFORMATION_RETRIEVAL,
      AgentCapability.DATA_ANALYSIS,
      AgentCapability.REPORT_GENERATION,
      AgentCapability.TREND_PREDICTION,
      AgentCapability.PROJECT_PLANNING,
      AgentCapability.TASK_SCHEDULING,
      AgentCapability.RESOURCE_ALLOCATION,
      AgentCapability.CODE_GENERATION,
      AgentCapability.DEBUGGING,
      AgentCapability.TECHNICAL_DOCUMENTATION,
      AgentCapability.UI_DESIGN,
      AgentCapability.VISUAL_CREATION,
      AgentCapability.USER_EXPERIENCE,
      AgentCapability.TASK_COORDINATION,
      AgentCapability.PROGRESS_TRACKING,
      AgentCapability.TEAM_COLLABORATION
    ];
  }
}

// 导出单例实例
export const agentService = new AgentService();
