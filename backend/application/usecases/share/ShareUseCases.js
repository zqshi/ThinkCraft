import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';

export class ShareUseCases {
  constructor({ shareService, eventBus }) {
    this.shareService = shareService;
    this.eventBus = eventBus;
  }

  async createShare({ userId, type, data, title, options }) {
    const share = await this.shareService.createShare(userId, type, data, title, options);

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.SHARE_CREATED, {
      shareId: share.id,
      userId,
      type
    }));

    return share;
  }

  async getShare({ shareId, accessInfo }) {
    return this.shareService.getShare(shareId, accessInfo);
  }

  async getUserShares({ userId, options }) {
    return this.shareService.getUserShares(userId, options);
  }

  async deleteShare({ shareId, userId }) {
    return this.shareService.deleteShare(shareId, userId);
  }

  generateQRCodeUrl({ shareId }) {
    return this.shareService.generateQRCodeUrl(shareId);
  }

  async getAccessLogs({ shareId, options }) {
    return this.shareService.getAccessLogs(shareId, options);
  }

  async updateShareTitle({ shareId, title }) {
    return this.shareService.updateShareTitle(shareId, title);
  }

  async extendExpiration({ shareId, additionalDays }) {
    return this.shareService.extendExpiration(shareId, additionalDays);
  }

  async getStats() {
    return this.shareService.getStats();
  }

  async getUserStats({ userId }) {
    return this.shareService.getUserStats(userId);
  }
}

export default ShareUseCases;
