/**
 * Export失败事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportFailedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'export.failed',
      aggregateId: payload.exportId,
      payload
    });
  }

  get exportId() {
    return this.payload.exportId;
  }

  get projectId() {
    return this.payload.projectId;
  }

  get format() {
    return this.payload.format;
  }

  get error() {
    return this.payload.error;
  }
}
