/**
 * Share过期事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ShareExpiredEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'share.expired',
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
}
