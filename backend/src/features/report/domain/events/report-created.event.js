/**
 * Report创建事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportCreatedEvent extends DomainEvent {
  constructor(payload) {
    super('report.created', payload);
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

  get title() {
    return this.data.title;
  }
}
