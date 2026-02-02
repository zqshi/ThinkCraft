/**
 * 商业计划书创建事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class BusinessPlanCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'BusinessPlanCreated',
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

  get title() {
    return this.payload.title;
  }

  get generatedBy() {
    return this.payload.generatedBy;
  }
}
