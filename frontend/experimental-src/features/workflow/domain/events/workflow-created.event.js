import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

/**
 * 工作流创建事件
 */
export class WorkflowCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'workflow.created',
      aggregateId: payload.workflowId,
      payload
    });
  }

  get workflowId() {
    return this.payload.workflowId;
  }

  get projectId() {
    return this.payload.projectId;
  }

  get name() {
    return this.payload.name;
  }

  get type() {
    return this.payload.type;
  }

  get createdBy() {
    return this.payload.createdBy;
  }
}
