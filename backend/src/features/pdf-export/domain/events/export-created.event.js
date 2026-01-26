/**
 * Export创建事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'export.created',
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

  get title() {
    return this.payload.title;
  }
}
