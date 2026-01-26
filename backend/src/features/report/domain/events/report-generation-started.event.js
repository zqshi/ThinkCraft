/**
 * Report生成开始事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportGenerationStartedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'report.generation.started',
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
}
