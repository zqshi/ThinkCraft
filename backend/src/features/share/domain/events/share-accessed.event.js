/**
 * Share访问事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ShareAccessedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'share.accessed',
      aggregateId: payload.shareId,
      payload
    });
  }

  get shareId() {
    return this.payload.shareId;
  }

  get resourceId() {
    return this.payload.resourceId;
  }

  get resourceType() {
    return this.payload.resourceType;
  }

  get accessCount() {
    return this.payload.accessCount;
  }
}
