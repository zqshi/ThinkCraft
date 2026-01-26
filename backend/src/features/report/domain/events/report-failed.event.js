/**
 * Report失败事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportFailedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'report.failed',
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

  get error() {
    return this.payload.error;
  }
}
