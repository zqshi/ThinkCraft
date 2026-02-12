/**
 * Share创建事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ShareCreatedEvent extends DomainEvent {
  constructor(payload) {
    super('share.created', payload);
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

  get permission() {
    return this.data.permission;
  }

  get createdBy() {
    return this.data.createdBy;
  }
}
