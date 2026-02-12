/**
 * Share访问事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ShareAccessedEvent extends DomainEvent {
  constructor(payload) {
    super('share.accessed', payload);
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

  get accessCount() {
    return this.data.accessCount;
  }
}
