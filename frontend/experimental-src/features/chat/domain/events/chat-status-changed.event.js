/**
 * 聊天状态变更领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ChatStatusChangedEvent extends DomainEvent {
  constructor(chatId, oldStatus, newStatus) {
    super({
      aggregateId: chatId,
      eventType: 'chat.status_changed',
      data: {
        chatId,
        oldStatus,
        newStatus,
        changedAt: new Date()
      }
    });
  }

  get chatId() {
    return this.data.chatId;
  }

  get oldStatus() {
    return this.data.oldStatus;
  }

  get newStatus() {
    return this.data.newStatus;
  }
}
