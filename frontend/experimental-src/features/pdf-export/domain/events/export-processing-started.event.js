/**
 * 导出处理开始事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportProcessingStartedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ExportProcessingStarted',
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
