/**
 * Share撤销事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ShareRevokedEvent extends DomainEvent {
  constructor(payload) {
    super('share.revoked', payload);
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
