/**
 * Export失败事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportFailedEvent extends DomainEvent {
  constructor(payload) {
    super('export.failed', payload);
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

  get error() {
    return this.data.error;
  }
}
