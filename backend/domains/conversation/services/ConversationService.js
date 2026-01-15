/**
 * ConversationService - 对话管理领域服务
 *
 * 职责：
 * 1. 对话生命周期管理（创建、更新、删除）
 * 2. 消息处理和AI对话集成
 * 3. 对话状态和步骤管理
 * 4. 对话分析和完成标记
 */

import { conversationRepository } from '../repositories/ConversationRepository.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';
import { nanoid } from 'nanoid';

const logger = domainLoggers.Conversation;

export class ConversationService {
  constructor(repository = conversationRepository) {
    this.repository = repository;
  }

  /**
   * 创建新对话
   * @param {string} userId - 用户ID
   * @param {string} title - 对话标题
   * @param {Object} userData - 用户数据（可选）
   * @returns {Promise<Object>} 创建的对话
   */
  async createConversation(userId, title, userData = {}) {
    try {
      // 验证输入
      if (!userId || !title) {
        throw new Error('用户ID和对话标题不能为空');
      }

      // 生成对话ID
      const conversationId = `conv_${nanoid(16)}`;

      const conversationData = {
        id: conversationId,
        userId,
        title: title.trim().substring(0, 255), // 限制标题长度
        conversationStep: 0,
        isPinned: false,
        analysisCompleted: false,
        userData: userData
      };

      const conversation = await this.repository.createConversation(conversationData);

      logger.info('创建对话成功', {
        conversationId: conversation.id,
        userId,
        title: conversation.title
      });

      return conversation;
    } catch (error) {
      logger.error('创建对话失败', error);
      throw error;
    }
  }

  /**
   * 获取对话详情
   * @param {string} conversationId - 对话ID
   * @param {boolean} includeMessages - 是否包含消息
   * @returns {Promise<Object|null>} 对话详情
   */
  async getConversation(conversationId, includeMessages = false) {
    try {
      const conversation = await this.repository.getConversationById(conversationId, includeMessages);

      if (!conversation) {
        logger.warn('对话不存在', { conversationId });
        return null;
      }

      return conversation;
    } catch (error) {
      logger.error('获取对话失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的对话列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 对话列表
   */
  async getUserConversations(userId, options = {}) {
    try {
      const conversations = await this.repository.getUserConversations(userId, options);

      logger.debug('获取用户对话列表', {
        userId,
        count: conversations.length,
        options
      });

      return conversations;
    } catch (error) {
      logger.error('获取用户对话列表失败', error);
      throw error;
    }
  }

  /**
   * 更新对话标题
   * @param {string} conversationId - 对话ID
   * @param {string} title - 新标题
   * @returns {Promise<boolean>} 是否成功
   */
  async updateTitle(conversationId, title) {
    try {
      if (!title || title.trim().length === 0) {
        throw new Error('标题不能为空');
      }

      const success = await this.repository.updateConversation(conversationId, {
        title: title.trim().substring(0, 255)
      });

      if (success) {
        logger.info('更新对话标题成功', { conversationId, title });
      }

      return success;
    } catch (error) {
      logger.error('更新对话标题失败', error);
      throw error;
    }
  }

  /**
   * 置顶/取消置顶对话
   * @param {string} conversationId - 对话ID
   * @param {boolean} isPinned - 是否置顶
   * @returns {Promise<boolean>} 是否成功
   */
  async pinConversation(conversationId, isPinned) {
    try {
      const success = await this.repository.pinConversation(conversationId, isPinned);

      if (success) {
        logger.info('更新对话置顶状态', { conversationId, isPinned });
      }

      return success;
    } catch (error) {
      logger.error('更新对话置顶状态失败', error);
      throw error;
    }
  }

  /**
   * 删除对话
   * @param {string} conversationId - 对话ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteConversation(conversationId, userId) {
    try {
      const success = await this.repository.deleteConversation(conversationId, userId);

      if (success) {
        logger.info('删除对话成功', { conversationId, userId });
      } else {
        logger.warn('删除对话失败：对话不存在或无权限', { conversationId, userId });
      }

      return success;
    } catch (error) {
      logger.error('删除对话失败', error);
      throw error;
    }
  }

  /**
   * 推进对话步骤
   * @param {string} conversationId - 对话ID
   * @returns {Promise<number>} 新的步骤数
   */
  async advanceStep(conversationId) {
    try {
      const conversation = await this.repository.getConversationById(conversationId);

      if (!conversation) {
        throw new Error('对话不存在');
      }

      const newStep = conversation.conversationStep + 1;
      await this.repository.updateConversationStep(conversationId, newStep);

      logger.info('推进对话步骤', { conversationId, step: newStep });

      return newStep;
    } catch (error) {
      logger.error('推进对话步骤失败', error);
      throw error;
    }
  }

  /**
   * 标记分析完成
   * @param {string} conversationId - 对话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async markAnalysisCompleted(conversationId) {
    try {
      const success = await this.repository.markAnalysisCompleted(conversationId);

      if (success) {
        logger.info('标记对话分析完成', { conversationId });
      }

      return success;
    } catch (error) {
      logger.error('标记对话分析完成失败', error);
      throw error;
    }
  }

  /**
   * 添加消息到对话
   * @param {string} conversationId - 对话ID
   * @param {string} role - 消息角色（user/assistant/system）
   * @param {string} content - 消息内容
   * @returns {Promise<Object>} 创建的消息
   */
  async addMessage(conversationId, role, content) {
    try {
      // 验证输入
      if (!conversationId || !role || !content) {
        throw new Error('对话ID、角色和内容不能为空');
      }

      if (!['user', 'assistant', 'system'].includes(role)) {
        throw new Error('无效的消息角色');
      }

      // 验证对话是否存在
      const conversation = await this.repository.getConversationById(conversationId);
      if (!conversation) {
        throw new Error('对话不存在');
      }

      const messageData = {
        role,
        content: content.trim()
      };

      const message = await this.repository.addMessage(conversationId, messageData);

      logger.debug('添加消息成功', {
        conversationId,
        messageId: message.id,
        role
      });

      return message;
    } catch (error) {
      logger.error('添加消息失败', error);
      throw error;
    }
  }

  /**
   * 批量添加消息
   * @param {string} conversationId - 对话ID
   * @param {Array<Object>} messages - 消息列表 [{ role, content }]
   * @returns {Promise<Array<Object>>} 创建的消息列表
   */
  async addMessages(conversationId, messages) {
    try {
      // 验证输入
      if (!conversationId || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('对话ID和消息列表不能为空');
      }

      // 验证对话是否存在
      const conversation = await this.repository.getConversationById(conversationId);
      if (!conversation) {
        throw new Error('对话不存在');
      }

      // 验证每条消息
      for (const msg of messages) {
        if (!msg.role || !msg.content) {
          throw new Error('消息的角色和内容不能为空');
        }
        if (!['user', 'assistant', 'system'].includes(msg.role)) {
          throw new Error(`无效的消息角色: ${msg.role}`);
        }
      }

      const created = await this.repository.addMessages(conversationId, messages);

      logger.info('批量添加消息成功', {
        conversationId,
        count: created.length
      });

      return created;
    } catch (error) {
      logger.error('批量添加消息失败', error);
      throw error;
    }
  }

  /**
   * 获取对话的消息历史
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Array<Object>>} 消息列表
   */
  async getMessages(conversationId) {
    try {
      const messages = await this.repository.getMessages(conversationId);

      logger.debug('获取对话消息', {
        conversationId,
        count: messages.length
      });

      return messages;
    } catch (error) {
      logger.error('获取对话消息失败', error);
      throw error;
    }
  }

  /**
   * 发送消息并获取AI回复
   * @param {string} conversationId - 对话ID
   * @param {string} userMessage - 用户消息
   * @param {Object} options - 选项（temperature等）
   * @returns {Promise<Object>} { userMsg, assistantMsg }
   */
  async sendMessage(conversationId, userMessage, options = {}) {
    try {
      // 验证输入
      if (!conversationId || !userMessage || userMessage.trim().length === 0) {
        throw new Error('对话ID和消息内容不能为空');
      }

      // 验证对话是否存在
      const conversation = await this.repository.getConversationById(conversationId);
      if (!conversation) {
        throw new Error('对话不存在');
      }

      // 添加用户消息
      const userMsg = await this.addMessage(conversationId, 'user', userMessage);

      // 获取消息历史（用于AI上下文）
      const messageHistory = await this.getMessages(conversationId);

      // TODO: 集成DeepSeek API获取AI回复
      // 这里先返回模拟响应，实际应该调用AI服务
      const aiResponse = await this._getAIResponse(messageHistory, options);

      // 添加AI回复消息
      const assistantMsg = await this.addMessage(conversationId, 'assistant', aiResponse);

      logger.info('发送消息并获取AI回复成功', {
        conversationId,
        userMsgId: userMsg.id,
        assistantMsgId: assistantMsg.id
      });

      return {
        userMsg,
        assistantMsg
      };
    } catch (error) {
      logger.error('发送消息失败', error);
      throw error;
    }
  }

  /**
   * 获取AI回复（占位方法，需集成DeepSeek API）
   * @private
   * @param {Array<Object>} messageHistory - 消息历史
   * @param {Object} options - 选项
   * @returns {Promise<string>} AI回复
   */
  async _getAIResponse(messageHistory, options = {}) {
    // TODO: 实现DeepSeek API集成
    // 这里先返回占位响应
    logger.warn('使用占位AI响应，需要集成DeepSeek API');

    return '我是AI助手，这是一个占位响应。请集成DeepSeek API以获得真实回复。';
  }

  /**
   * 更新对话的用户数据
   * @param {string} conversationId - 对话ID
   * @param {Object} userData - 用户数据
   * @returns {Promise<boolean>} 是否成功
   */
  async updateUserData(conversationId, userData) {
    try {
      if (!userData || typeof userData !== 'object') {
        throw new Error('用户数据必须是对象');
      }

      const success = await this.repository.updateConversation(conversationId, {
        userData
      });

      if (success) {
        logger.info('更新对话用户数据成功', { conversationId });
      }

      return success;
    } catch (error) {
      logger.error('更新对话用户数据失败', error);
      throw error;
    }
  }

  /**
   * 获取对话统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const stats = await this.repository.getStats();

      logger.debug('获取对话统计信息', stats);

      return stats;
    } catch (error) {
      logger.error('获取对话统计信息失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的对话统计
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户统计
   */
  async getUserStats(userId) {
    try {
      const stats = await this.repository.getUserStats(userId);

      logger.debug('获取用户对话统计', { userId, ...stats });

      return stats;
    } catch (error) {
      logger.error('获取用户对话统计失败', error);
      throw error;
    }
  }

  /**
   * 清空用户的对话（测试用）
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async clearUserConversations(userId) {
    try {
      await this.repository.clearUserConversations(userId);

      logger.warn('清空用户对话', { userId });
    } catch (error) {
      logger.error('清空用户对话失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const conversationService = new ConversationService();

export default ConversationService;
