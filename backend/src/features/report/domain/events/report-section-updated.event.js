/**
 * Report章节更新事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportSectionUpdatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'report.section.updated',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }

  get sectionId() {
    return this.payload.sectionId;
  }

  get updates() {
    return this.payload.updates;
  }
}
