/**
 * Demo生成完成事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class DemoGenerationCompletedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'demo.generation.completed',
      aggregateId: payload.demoId,
      payload
    });
  }

  get demoId() {
    return this.payload.demoId;
  }

  get projectId() {
    return this.payload.projectId;
  }

  get fileCount() {
    return this.payload.fileCount;
  }

  get completedAt() {
    return this.payload.completedAt;
  }
}
