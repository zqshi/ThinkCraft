/**
 * 报告章节添加事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportSectionAddedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportSectionAdded',
      aggregateId: payload.reportId,
      payload
    });
  }

  get reportId() {
    return this.payload.reportId;
  }

  get projectId() {
    return this.payload.projectId;
  }

  get sectionTitle() {
    return this.payload.sectionTitle;
  }

  get sectionType() {
    return this.payload.sectionType;
  }

  get sectionOrder() {
    return this.payload.sectionOrder;
  }

  get addedBy() {
    return this.payload.addedBy;
  }
}
