/**
 * 导出完成事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportCompletedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ExportCompleted',
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

  get fileUrl() {
    return this.payload.fileUrl;
  }

  get fileSize() {
    return this.payload.fileSize;
  }

  get pageCount() {
    return this.payload.pageCount;
  }
}
