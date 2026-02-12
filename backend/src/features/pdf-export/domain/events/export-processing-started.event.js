/**
 * Export处理开始事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportProcessingStartedEvent extends DomainEvent {
  constructor(payload) {
    super('export.processing.started', payload);
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
}
