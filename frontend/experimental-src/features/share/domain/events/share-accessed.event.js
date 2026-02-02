/**
 * 分享访问事件
 */
export class ShareAccessedEvent {
  constructor({ shareId, resourceId, accessCount, timestamp }) {
    this.eventName = 'ShareAccessed';
    this.shareId = shareId;
    this.resourceId = resourceId;
    this.accessCount = accessCount;
    this.timestamp = timestamp;
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
