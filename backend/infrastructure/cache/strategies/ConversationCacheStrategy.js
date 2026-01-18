import { cacheConfig } from '../../../config/cache.js';

export class ConversationCacheStrategy {
  static getConversationKey(conversationId) {
    return `conversation:${conversationId}`;
  }

  static getUserListKey(userId) {
    return `conversations:${userId}`;
  }

  static get ttl() {
    return {
      conversation: cacheConfig.TTL.CONVERSATION,
      list: cacheConfig.TTL.CONVERSATION_LIST
    };
  }
}
