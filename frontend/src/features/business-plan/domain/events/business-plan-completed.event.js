/**
 * 商业计划书完成事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class BusinessPlanCompletedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'BusinessPlanCompleted',
      aggregateId: payload.businessPlanId,
      payload
    });
  }

  get businessPlanId() {
    return this.payload.businessPlanId;
  }

  get projectId() {
    return this.payload.projectId;
  }

  get oldStatus() {
    return this.payload.oldStatus;
  }

  get newStatus() {
    return this.payload.newStatus;
  }

  get totalTokens() {
    return this.payload.totalTokens;
  }

  get cost() {
    return this.payload.cost;
  }
}
