/**
 * Chat功能模块导出
 */

// 领域层
export * from './domain/index.js';

// 应用层
export { ChatUseCase, chatUseCase } from './application/chat.use-case.js';
export * from './application/chat.dto.js';

// 基础设施层
export {
  InMemoryChatRepository,
  inMemoryChatRepository
} from './infrastructure/chat-inmemory.repository.js';

// 接口层
export { default as chatRoutes } from './interfaces/chat-routes.js';
