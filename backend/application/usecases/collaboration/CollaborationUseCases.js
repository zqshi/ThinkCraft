import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';

export class CollaborationUseCases {
  constructor({ collaborationPlanningService, collaborationExecutionService, eventBus }) {
    this.collaborationPlanningService = collaborationPlanningService;
    this.collaborationExecutionService = collaborationExecutionService;
    this.eventBus = eventBus;
  }

  createPlan({ userId, goal, projectId }) {
    if (!userId) {
      return { success: false, error: '用户ID不能为空' };
    }

    if (!goal || goal.trim().length < 10) {
      return { success: false, error: '协同目标至少需要10个字符' };
    }

    const plan = this.collaborationPlanningService.createPlan(userId, goal, projectId);

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.COLLABORATION_CREATED, {
      planId: plan.id,
      userId,
      goal: plan.goal
    }));

    return { success: true, data: plan };
  }

  async analyzeCapability({ planId, agentIds }) {
    if (!planId) {
      return { success: false, error: '协同计划ID不能为空' };
    }

    const result = await this.collaborationPlanningService.analyzeCapability(planId, agentIds);
    return { success: true, data: result };
  }

  async generateModes({ planId }) {
    if (!planId) {
      return { success: false, error: '协同计划ID不能为空' };
    }

    const result = await this.collaborationPlanningService.generateCollaborationModes(planId);
    return { success: true, data: result };
  }

  getPlan({ planId }) {
    if (!planId) {
      return { success: false, error: '协同计划ID不能为空' };
    }

    const plan = this.collaborationPlanningService.getPlan(planId);
    if (!plan) {
      return { success: false, error: '协同计划不存在' };
    }

    return { success: true, data: plan };
  }

  getUserPlans({ userId }) {
    const plans = this.collaborationPlanningService.getUserPlans(userId);
    return { success: true, data: { plans, total: plans.length } };
  }

  async executePlan({ planId, executionMode }) {
    if (!planId) {
      return { success: false, error: '协同计划ID不能为空' };
    }

    if (!['workflow', 'task_decomposition'].includes(executionMode)) {
      return { success: false, error: '不支持的执行模式' };
    }

    const result = await this.collaborationExecutionService.execute(planId, executionMode);

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.COLLABORATION_EXECUTED, {
      planId,
      executionMode,
      completedAt: result.completedAt
    }));

    return { success: true, data: result };
  }

  deletePlan({ planId }) {
    const deleted = this.collaborationPlanningService.deletePlan(planId);

    if (!deleted) {
      return { success: false, error: '协同计划不存在' };
    }

    return { success: true, data: { deleted: true } };
  }
}

export default CollaborationUseCases;
