/**
 * 报告状态变更事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportStatusChangedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportStatusChanged',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
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

  get changedAt() {
    return this.payload.changedAt;
  }

  get reason() {
    return this.payload.reason;
  }
}
