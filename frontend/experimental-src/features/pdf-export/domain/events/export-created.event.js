/**
 * 导出创建事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ExportCreated',
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

  get title() {
    return this.payload.title;
  }

  get format() {
    return this.payload.format;
  }

  get requestedBy() {
    return this.payload.requestedBy;
  }
}
