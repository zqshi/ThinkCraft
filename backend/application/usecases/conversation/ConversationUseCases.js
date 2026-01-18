import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';

export class ConversationUseCases {
  constructor({ conversationService, eventBus }) {
    this.conversationService = conversationService;
    this.eventBus = eventBus;
  }

  async createConversation({ userId, title, userData }) {
    const conversation = await this.conversationService.createConversation(userId, title, userData);

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.CONVERSATION_CREATED, {
      conversationId: conversation.id,
      userId,
      title: conversation.title
    }));

    return conversation;
  }

  async getConversation({ conversationId, includeMessages }) {
    return this.conversationService.getConversation(conversationId, includeMessages);
  }

  async getUserConversations({ userId, options }) {
    return this.conversationService.getUserConversations(userId, options);
  }

  async updateTitle({ conversationId, title }) {
    return this.conversationService.updateTitle(conversationId, title);
  }

  async pinConversation({ conversationId, isPinned }) {
    return this.conversationService.pinConversation(conversationId, isPinned);
  }

  async deleteConversation({ conversationId, userId }) {
    return this.conversationService.deleteConversation(conversationId, userId);
  }

  async addMessage({ conversationId, role, content }) {
    return this.conversationService.addMessage(conversationId, role, content);
  }

  async getMessages({ conversationId }) {
    return this.conversationService.getMessages(conversationId);
  }

  async sendMessage({ conversationId, message, options }) {
    return this.conversationService.sendMessage(conversationId, message, options);
  }

  async advanceStep({ conversationId }) {
    return this.conversationService.advanceStep(conversationId);
  }

  async markAnalysisCompleted({ conversationId }) {
    return this.conversationService.markAnalysisCompleted(conversationId);
  }

  async getStats() {
    return this.conversationService.getStats();
  }

  async getUserStats({ userId }) {
    return this.conversationService.getUserStats(userId);
  }
}

export default ConversationUseCases;
