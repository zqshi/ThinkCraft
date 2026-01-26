/**
 * Demo生成失败事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class DemoGenerationFailedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'demo.generation.failed',
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

  get error() {
    return this.payload.error;
  }
}
