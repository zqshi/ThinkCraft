/**
 * Chat领域模块导出
 */
export { Chat, ChatFactory } from './chat.aggregate.js';
export { Message, MessageFactory } from './entities/message.entity.js';

// 值对象
export { ChatId } from './value-objects/chat-id.vo.js';
export { ChatStatus } from './value-objects/chat-status.vo.js';
export { ChatTitle } from './value-objects/chat-title.vo.js';
export { MessageId } from './value-objects/message-id.vo.js';
export { MessageType } from './value-objects/message-type.vo.js';
export { MessageContent } from './value-objects/message-content.vo.js';
export { MessageStatus } from './value-objects/message-status.vo.js';
export { UserId } from './value-objects/user-id.vo.js';

// 领域事件
export { ChatCreatedEvent } from './events/chat-created.event.js';
export { MessageAddedEvent } from './events/message-added.event.js';
export { ChatStatusChangedEvent } from './events/chat-status-changed.event.js';
