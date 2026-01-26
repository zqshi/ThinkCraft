/**
 * Share撤销事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ShareRevokedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'share.revoked',
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
