/**
 * Share过期事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ShareExpiredEvent extends DomainEvent {
  constructor(payload) {
    super('share.expired', payload);
  }

  get shareId() {
    return this.data.shareId;
  }

  get resourceId() {
    return this.data.resourceId;
  }

  get resourceType() {
    return this.data.resourceType;
  }
}
