/**
 * 聊天状态变更事件
 */
import { DomainEvent } from '../../../../shared/domain/index.js';

export class ChatStatusChangedEvent extends DomainEvent {
  constructor(data) {
    super('chat.status.changed', data);
  }
}
