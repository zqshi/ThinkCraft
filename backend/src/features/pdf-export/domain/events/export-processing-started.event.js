/**
 * Export处理开始事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportProcessingStartedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'export.processing.started',
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
}
