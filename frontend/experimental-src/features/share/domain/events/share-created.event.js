/**
 * 分享创建事件
 */
export class ShareCreatedEvent {
  constructor({
    shareId,
    resourceId,
    resourceType,
    permission,
    hasPassword,
    hasExpiry,
    createdBy
  }) {
    this.eventName = 'ShareCreated';
    this.shareId = shareId;
    this.resourceId = resourceId;
    this.resourceType = resourceType;
    this.permission = permission;
    this.hasPassword = hasPassword;
    this.hasExpiry = hasExpiry;
    this.createdBy = createdBy;
    this.timestamp = new Date();
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
