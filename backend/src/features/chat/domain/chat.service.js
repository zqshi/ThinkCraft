/**
 * 聊天领域服务
 * 处理跨实体的复杂业务逻辑
 */
import { DomainService } from '../../../shared/domain/index.js';
import { Chat } from './chat.aggregate.js';
import { Message } from './message.entity.js';

export class ChatService extends DomainService {
  constructor() {
    super();
  }

  /**
   * 创建新的聊天会话
   */
  async createChat(chatId, userId, title, initialMessage = null) {
    this.validateParams({ chatId, userId, title });

    try {
      let initialMessageEntity = null;
      if (initialMessage) {
        if (typeof initialMessage === 'string') {
          initialMessageEntity = this._createMessage(
            this._generateMessageId(),
            initialMessage,
            'text',
            'user'
          );
        } else {
          initialMessageEntity = this._createMessage(
            this._generateMessageId(),
            initialMessage.content,
            initialMessage.type || 'text',
            initialMessage.sender || 'user'
          );
        }
      }

      const chat = Chat.createForUser(chatId, userId, title, initialMessageEntity);
      return chat;
    } catch (error) {
      throw new Error(`创建聊天失败: ${error.message}`);
    }
  }

  /**
   * 添加消息到聊天
   */
  async addMessageToChat(chat, messageContent, messageType = 'text', sender = 'user') {
    this.validateParams({ chat, messageContent });

    try {
      // 创建消息
      const messageId = this._generateMessageId();
      const message = this._createMessage(messageId, messageContent, messageType, sender);

      // 添加消息到聊天
      chat.addMessage(message);

      return message;
    } catch (error) {
      throw new Error(`添加消息失败: ${error.message}`);
    }
  }

  /**
   * 批量添加消息
   */
  async addMessagesToChat(chat, messages) {
    this.validateParams({ chat, messages });

    if (!Array.isArray(messages)) {
      throw new Error('消息必须是数组');
    }

    const addedMessages = [];

    try {
      for (const msg of messages) {
        const message = this._createMessage(
          this._generateMessageId(),
          msg.content,
          msg.type || 'text',
          msg.sender || 'user'
        );
        chat.addMessage(message);
        addedMessages.push(message);
      }

      return addedMessages;
    } catch (error) {
      throw new Error(`批量添加消息失败: ${error.message}`);
    }
  }

  /**
   * 归档聊天
   */
  async archiveChat(chat) {
    this.validateParams({ chat });

    try {
      const { ChatStatus } = await import('./chat-status.vo.js');
      chat.updateStatus(ChatStatus.ARCHIVED);
      return chat;
    } catch (error) {
      throw new Error(`归档聊天失败: ${error.message}`);
    }
  }

  /**
   * 恢复聊天
   */
  async restoreChat(chat) {
    this.validateParams({ chat });

    try {
      const { ChatStatus } = await import('./chat-status.vo.js');
      chat.updateStatus(ChatStatus.ACTIVE);
      return chat;
    } catch (error) {
      throw new Error(`恢复聊天失败: ${error.message}`);
    }
  }

  /**
   * 合并多个聊天
   */
  async mergeChats(targetChat, sourceChats) {
    this.validateParams({ targetChat, sourceChats });

    if (!Array.isArray(sourceChats)) {
      throw new Error('源聊天必须是数组');
    }

    try {
      const allMessages = [];

      // 收集所有消息
      for (const chat of sourceChats) {
        allMessages.push(...chat.messages);
      }

      // 按时间排序
      allMessages.sort((a, b) => a.createdAt - b.createdAt);

      // 批量添加到目标聊天
      await this.addMessagesToChat(targetChat, allMessages);

      return targetChat;
    } catch (error) {
      throw new Error(`合并聊天失败: ${error.message}`);
    }
  }

  /**
   * 搜索聊天内容
   */
  async searchInChat(chat, keyword) {
    this.validateParams({ chat, keyword });

    if (!keyword || typeof keyword !== 'string') {
      throw new Error('搜索关键词必须是字符串');
    }

    try {
      const results = [];
      const lowerKeyword = keyword.toLowerCase();

      for (const message of chat.messages) {
        if (message.content.toLowerCase().includes(lowerKeyword)) {
          results.push({
            message: message,
            matchedContent: this._extractMatchedContent(message.content, keyword)
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`搜索聊天内容失败: ${error.message}`);
    }
  }

  /**
   * 生成消息ID
   */
  _generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建消息
   */
  _createMessage(id, content, type, sender) {
    switch (type) {
      case 'text':
        return Message.createText(id, content, sender);
      case 'image':
        return Message.createImage(id, content, sender);
      case 'code':
        return Message.createCode(id, content, 'javascript', sender);
      default:
        return Message.createText(id, content, sender);
    }
  }

  /**
   * 提取匹配的内容片段
   */
  _extractMatchedContent(content, keyword) {
    const index = content.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) {
      return null;
    }

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + keyword.length + 50);

    return {
      fullContent: content,
      matchedContent: content.substring(start, end),
      matchIndex: index
    };
  }
}
