/**
 * Export创建事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportCreatedEvent extends DomainEvent {
  constructor(payload) {
    super('export.created', payload);
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

  get title() {
    return this.data.title;
  }
}
