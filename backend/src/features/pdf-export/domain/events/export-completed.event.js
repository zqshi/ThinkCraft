/**
 * Export完成事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportCompletedEvent extends DomainEvent {
  constructor(payload) {
    super('export.completed', payload);
  }

  get exportId() {
    return this.data.exportId;
  }

  get projectId() {
    return this.data.projectId;
  }

  get format() {
    return this.data.format;
  }

  get filePath() {
    return this.data.filePath;
  }

  get fileSize() {
    return this.data.fileSize;
  }

  get completedAt() {
    return this.data.completedAt;
  }
}
