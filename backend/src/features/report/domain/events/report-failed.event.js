/**
 * Report失败事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportFailedEvent extends DomainEvent {
  constructor(payload) {
    super('report.failed', payload);
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

  get error() {
    return this.data.error;
  }
}
