/**
 * Share创建事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ShareCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'share.created',
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

  get permission() {
    return this.payload.permission;
  }

  get createdBy() {
    return this.payload.createdBy;
  }
}
