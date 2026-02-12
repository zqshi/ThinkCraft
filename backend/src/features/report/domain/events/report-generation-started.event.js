/**
 * Report生成开始事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ReportGenerationStartedEvent extends DomainEvent {
  constructor(payload) {
    super('report.generation.started', payload);
  }

  get reportId() {
    return this.data.reportId;
  }

  get projectId() {
    return this.data.projectId;
  }

  get type() {
    return this.data.type;
  }
}
