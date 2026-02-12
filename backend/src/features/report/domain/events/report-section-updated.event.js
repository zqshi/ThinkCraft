/**
 * Report章节更新事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportSectionUpdatedEvent extends DomainEvent {
  constructor(payload) {
    super('report.section.updated', payload);
  }

  get reportId() {
    return this.data.reportId;
  }

  get sectionId() {
    return this.data.sectionId;
  }

  get updates() {
    return this.data.updates;
  }
}
