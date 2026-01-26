/**
 * Report完成事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportCompletedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'report.completed',
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

  get type() {
    return this.payload.type;
  }

  get sectionCount() {
    return this.payload.sectionCount;
  }

  get completedAt() {
    return this.payload.completedAt;
  }
}
