/**
 * Demo生成开始事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class DemoGenerationStartedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'demo.generation.started',
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

  get type() {
    return this.payload.type;
  }
}
