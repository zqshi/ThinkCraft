/**
 * 消息添加领域事件
 */
import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

export class MessageAddedEvent extends DomainEvent {
  constructor(chatId, messageId, content, type) {
    super({
      aggregateId: chatId,
      eventType: 'message.added',
      data: {
        chatId,
        messageId,
        content,
        type,
        addedAt: new Date()
      }
    });
  }

  get chatId() {
    return this.data.chatId;
  }

  get messageId() {
    return this.data.messageId;
  }

  get content() {
    return this.data.content;
  }

  get type() {
    return this.data.type;
  }
}
