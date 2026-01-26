/**
 * 报告生成事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportGeneratedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ReportGenerated',
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

  get type() {
    return this.payload.type;
  }

  get title() {
    return this.payload.title;
  }

  get generatedBy() {
    return this.payload.generatedBy;
  }

  get sectionCount() {
    return this.payload.sectionCount;
  }

  get contentLength() {
    return this.payload.contentLength;
  }

  get generationTime() {
    return this.payload.generationTime;
  }
}
