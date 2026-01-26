/**
 * 消息添加事件
 */
import { DomainEvent } from '../../../../shared/domain/index.js';

export class MessageAddedEvent extends DomainEvent {
  constructor(data) {
    super('chat.message.added', data);
  }
}
