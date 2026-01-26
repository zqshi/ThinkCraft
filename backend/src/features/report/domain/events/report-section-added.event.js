/**
 * Report章节添加事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportSectionAddedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'report.section.added',
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

  get title() {
    return this.payload.title;
  }

  get order() {
    return this.payload.order;
  }
}
