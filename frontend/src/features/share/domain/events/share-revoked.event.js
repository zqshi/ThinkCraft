/**
 * 分享撤销事件
 */
export class ShareRevokedEvent {
  constructor({ shareId, resourceId, revokedAt }) {
    this.eventName = 'ShareRevoked';
    this.shareId = shareId;
    this.resourceId = resourceId;
    this.revokedAt = revokedAt;
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
