import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

/**
 * 工作流状态变更事件
 */
export class WorkflowStatusChangedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'workflow.status-changed',
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

  get oldStatus() {
    return this.payload.oldStatus;
  }

  get newStatus() {
    return this.payload.newStatus;
  }

  get changedBy() {
    return this.payload.changedBy;
  }
}
