/**
 * Export完成事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportCompletedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'export.completed',
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

  get filePath() {
    return this.payload.filePath;
  }

  get fileSize() {
    return this.payload.fileSize;
  }

  get completedAt() {
    return this.payload.completedAt;
  }
}
