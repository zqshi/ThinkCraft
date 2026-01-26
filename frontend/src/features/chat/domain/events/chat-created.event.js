/**
 * 聊天创建领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class ChatCreatedEvent extends DomainEvent {
  constructor(chatId, title) {
    super({
      aggregateId: chatId,
      eventType: 'chat.created',
      data: {
        chatId,
        title,
        createdAt: new Date()
      }
    });
  }

  get chatId() {
    return this.data.chatId;
  }

  get title() {
    return this.data.title;
  }
}
