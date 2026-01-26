/**
 * Chat领域层导出
 */

// 聚合根
export { Chat } from './chat.aggregate.js';

// 实体
export { Message } from './message.entity.js';

// 值对象
export { ChatStatus } from './chat-status.vo.js';
export { MessageType } from './message-type.vo.js';
export { MessageStatus } from './message-status.vo.js';

// 领域服务
export { ChatService } from './chat.service.js';

// 仓库接口
export { IChatRepository } from './chat.repository.js';

// 领域事件
export { ChatCreatedEvent } from './events/chat-created.event.js';
export { MessageAddedEvent } from './events/message-added.event.js';
export { ChatStatusChangedEvent } from './events/chat-status-changed.event.js';
