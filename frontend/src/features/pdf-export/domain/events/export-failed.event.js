/**
 * 导出失败事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ExportFailedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ExportFailed',
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

  get errorMessage() {
    return this.payload.errorMessage;
  }
}
