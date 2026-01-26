/**
 * Demo创建事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class DemoCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'demo.created',
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

  get title() {
    return this.payload.title;
  }
}
