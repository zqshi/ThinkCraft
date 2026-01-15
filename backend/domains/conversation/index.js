/**
 * Conversation领域模块统一导出
 */

import { ConversationRepository, conversationRepository } from './repositories/ConversationRepository.js';
import { ConversationService, conversationService } from './services/ConversationService.js';

// 导出类和实例
export { ConversationRepository, conversationRepository };
export { ConversationService, conversationService };

// Conversation领域门面
export const ConversationDomain = {
  repository: conversationRepository,
  service: conversationService
};

export default ConversationDomain;
