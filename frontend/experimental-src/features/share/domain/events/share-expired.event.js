/**
 * 分享过期事件
 */
export class ShareExpiredEvent {
  constructor({ shareId, resourceId, expiredAt }) {
    this.eventName = 'ShareExpired';
    this.shareId = shareId;
    this.resourceId = resourceId;
    this.expiredAt = expiredAt;
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
