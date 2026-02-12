/**
 * Report章节添加事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportSectionAddedEvent extends DomainEvent {
  constructor(payload) {
    super('report.section.added', payload);
  }

  get reportId() {
    return this.data.reportId;
  }

  get sectionId() {
    return this.data.sectionId;
  }

  get title() {
    return this.data.title;
  }

  get order() {
    return this.data.order;
  }
}
