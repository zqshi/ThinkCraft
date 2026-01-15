import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';

export class ChatUseCases {
  constructor({ aiClient, eventBus }) {
    this.aiClient = aiClient;
    this.eventBus = eventBus;
  }

  async sendMessage({ messages, systemPrompt }) {
    if (!messages || !Array.isArray(messages)) {
      return {
        success: false,
        error: 'messages 参数必须是数组'
      };
    }

    if (messages.length === 0) {
      return {
        success: false,
        error: 'messages 数组不能为空'
      };
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        return {
          success: false,
          error: '消息格式错误：每条消息必须包含 role 和 content 字段'
        };
      }
      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        return {
          success: false,
          error: `无效的消息角色: ${msg.role}`
        };
      }
    }

    const response = await this.aiClient(messages, systemPrompt);

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.CHAT_COMPLETED, {
      messageCount: messages.length,
      model: response.model,
      tokens: response.usage
    }));

    return {
      success: true,
      data: response
    };
  }
}

export default ChatUseCases;
