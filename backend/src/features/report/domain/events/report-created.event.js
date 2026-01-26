/**
 * Report创建事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'report.created',
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

  get title() {
    return this.payload.title;
  }
}
