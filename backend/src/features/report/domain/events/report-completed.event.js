/**
 * Report完成事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportCompletedEvent extends DomainEvent {
  constructor(payload) {
    super('report.completed', payload);
  }

  get reportId() {
    return this.data.reportId;
  }

  get projectId() {
    return this.data.projectId;
  }

  get type() {
    return this.data.type;
  }

  get sectionCount() {
    return this.data.sectionCount;
  }

  get completedAt() {
    return this.data.completedAt;
  }
}
