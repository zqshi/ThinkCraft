import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';

const logger = domainLoggers.Agent;

export class AgentUseCases {
  constructor({ agentHireService, taskAssignmentService, salaryService, eventBus, aiClient }) {
    this.agentHireService = agentHireService;
    this.taskAssignmentService = taskAssignmentService;
    this.salaryService = salaryService;
    this.eventBus = eventBus;
    this.aiClient = aiClient;
  }

  getAgentTypes() {
    return this.agentHireService.getAvailableAgentTypes();
  }

  hireAgent({ userId, agentType, nickname }) {
    const result = this.agentHireService.hire(userId, agentType, nickname);

    if (result.success) {
      this.eventBus.publish(new DomainEvent(EVENT_TYPES.AGENT_HIRED, {
        userId,
        agentId: result.agent.id,
        agentType,
        hiredAt: result.agent.hiredAt
      }));
    }

    return result;
  }

  getUserAgents({ userId }) {
    const agents = this.agentHireService.getUserAgents(userId);
    const stats = this.agentHireService.getTeamStats(userId);
    return { agents, stats };
  }

  async assignTask({ userId, agentId, task, context }) {
    const result = await this.taskAssignmentService.assignTask(userId, agentId, task, context);

    if (result.success) {
      this.eventBus.publish(new DomainEvent(EVENT_TYPES.AGENT_TASK_ASSIGNED, {
        userId,
        agentId,
        task,
        context
      }));
    }

    return result;
  }

  fireAgent({ userId, agentId }) {
    const result = this.agentHireService.fire(userId, agentId);

    if (result.success) {
      this.eventBus.publish(new DomainEvent(EVENT_TYPES.AGENT_FIRED, {
        userId,
        agentId,
        firedAt: result.agent.firedAt
      }));
    }

    return result;
  }

  updateNickname({ userId, agentId, nickname }) {
    const agent = this.agentHireService.getAgentById(userId, agentId);

    if (!agent) {
      return null;
    }

    if (nickname) {
      agent.nickname = nickname;
    }

    return agent;
  }

  getSalaryReport({ userId }) {
    return this.salaryService.getSalaryAnalysisReport(userId);
  }

  getTaskHistory({ userId, limit }) {
    const history = this.taskAssignmentService.getUserTaskHistory(userId, limit);
    const stats = this.taskAssignmentService.getTaskStats(userId);
    return { history, stats };
  }

  async teamCollaboration({ userId, agentIds, task, context }) {
    const selectedAgents = agentIds
      .map(id => this.agentHireService.getAgentById(userId, id))
      .filter(agent => agent !== null);

    if (selectedAgents.length === 0) {
      return {
        success: false,
        error: '未找到指定的Agent'
      };
    }

    logger.info('团队协同开始', {
      userId,
      agentIds,
      task
    });

    selectedAgents.forEach(agent => {
      agent.assignTask({ description: task, context, type: 'team-collaboration' });
    });

    const agentRoles = selectedAgents
      .map(agent => {
        const agentType = agent.getType();
        return `${agentType.emoji} ${agent.nickname}（${agentType.name}）`;
      })
      .join('、');

    const prompt = `你现在是一个由多个专业人员组成的团队：${agentRoles}。

请团队协作完成以下任务：
${task}

${context ? `背景信息：\n${context}` : ''}

要求：
- 每个角色从自己的专业角度贡献意见
- 团队成员之间要有协作和讨论
- 输出综合性的解决方案

请用以下格式输出：
1. 【团队讨论】各角色的初步想法
2. 【方案整合】综合各方意见的最终方案
3. 【分工协作】明确每个角色的具体任务`;

    try {
      const result = await this.aiClient(
        [{ role: 'user', content: prompt }],
        null,
        {
          max_tokens: 3000,
          temperature: 0.8
        }
      );

      selectedAgents.forEach(agent => {
        agent.completeTask({
          content: result.content,
          tokens: result.usage.total_tokens / selectedAgents.length
        });
      });

      const collaborationResult = {
        teamMembers: selectedAgents.map(agent => ({
          id: agent.id,
          name: agent.nickname,
          type: agent.typeId
        })),
        task,
        result: result.content,
        tokens: result.usage.total_tokens,
        completedAt: new Date().toISOString()
      };

      this.eventBus.publish(new DomainEvent(EVENT_TYPES.TEAM_COLLABORATION_COMPLETED, {
        userId,
        agentIds,
        task,
        completedAt: collaborationResult.completedAt
      }));

      return {
        success: true,
        data: collaborationResult
      };
    } catch (error) {
      selectedAgents.forEach(agent => {
        if (agent.isWorking()) {
          agent.failTask('团队协同失败');
        }
      });

      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default AgentUseCases;
