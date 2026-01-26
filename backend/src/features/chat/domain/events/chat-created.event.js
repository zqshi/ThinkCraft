/**
 * 聊天创建事件
 */
import { DomainEvent } from '../../../../shared/domain/index.js';

export class ChatCreatedEvent extends DomainEvent {
  constructor(data) {
    super('chat.created', data);
  }
}
