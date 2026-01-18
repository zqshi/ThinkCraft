/**
 * ConversationRepository - 对话 PostgreSQL数据持久化仓储
 *
 * 使用Sequelize ORM进行数据持久化
 */

import { Conversation as ConversationModel, Message as MessageModel } from '../../../infrastructure/database/models/index.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';

const logger = domainLoggers.Conversation;

export class ConversationRepository {
  /**
   * 根据ID获取对话
   * @param {string} conversationId - 对话ID
   * @param {boolean} includeMessages - 是否包含消息
   * @returns {Promise<Object|null>} 对话JSON或null
   */
  async getConversationById(conversationId, includeMessages = false) {
    try {
      const options = {
        where: { id: conversationId }
      };

      if (includeMessages) {
        options.include = [{
          model: MessageModel,
          as: 'messages',
          order: [['createdAt', 'ASC']]
        }];
      }

      const conversation = await ConversationModel.findOne(options);
      return conversation ? conversation.toJSON() : null;
    } catch (error) {
      logger.error('根据ID获取对话失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有对话
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 对话列表
   */
  async getUserConversations(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, isPinned = null } = options;

      const where = { userId };
      if (isPinned !== null) {
        where.isPinned = isPinned;
      }

      const conversations = await ConversationModel.findAll({
        where,
        limit,
        offset,
        order: [
          ['is_pinned', 'DESC'], // 置顶的在前（使用数据库字段名）
          ['updated_at', 'DESC']  // 最近更新的在前（使用数据库字段名）
        ]
      });

      logger.debug('获取用户对话', { userId, count: conversations.length });
      return conversations.map(conv => conv.toJSON());
    } catch (error) {
      logger.error('获取用户对话失败', error);
      throw error;
    }
  }

  /**
   * 创建对话
   * @param {Object} conversationData - 对话数据
   * @returns {Promise<Object>} 创建的对话
   */
  async createConversation(conversationData) {
    try {
      const conversation = await ConversationModel.create(conversationData);
      logger.info('创建对话', { conversationId: conversation.id, userId: conversationData.userId });
      return conversation.toJSON();
    } catch (error) {
      logger.error('创建对话失败', error);
      throw error;
    }
  }

  /**
   * 更新对话
   * @param {string} conversationId - 对话ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<boolean>} 是否成功
   */
  async updateConversation(conversationId, updates) {
    try {
      const conversation = await ConversationModel.findByPk(conversationId);
      if (!conversation) {
        return false;
      }

      await conversation.update(updates);
      logger.info('更新对话', { conversationId, updates: Object.keys(updates) });
      return true;
    } catch (error) {
      logger.error('更新对话失败', error);
      return false;
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
      const deleted = await ConversationModel.destroy({
        where: {
          id: conversationId,
          userId
        }
      });

      if (deleted > 0) {
        logger.info('删除对话', { conversationId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('删除对话失败', error);
      return false;
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
      const conversation = await ConversationModel.findByPk(conversationId);
      if (!conversation) {
        return false;
      }

      await conversation.update({ isPinned });
      logger.info('置顶对话', { conversationId, isPinned });
      return true;
    } catch (error) {
      logger.error('置顶对话失败', error);
      return false;
    }
  }

  /**
   * 更新对话步骤
   * @param {string} conversationId - 对话ID
   * @param {number} step - 对话步骤
   * @returns {Promise<boolean>} 是否成功
   */
  async updateConversationStep(conversationId, step) {
    try {
      const conversation = await ConversationModel.findByPk(conversationId);
      if (!conversation) {
        return false;
      }

      await conversation.update({ conversationStep: step });
      logger.debug('更新对话步骤', { conversationId, step });
      return true;
    } catch (error) {
      logger.error('更新对话步骤失败', error);
      return false;
    }
  }

  /**
   * 标记分析完成
   * @param {string} conversationId - 对话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async markAnalysisCompleted(conversationId) {
    try {
      const conversation = await ConversationModel.findByPk(conversationId);
      if (!conversation) {
        return false;
      }

      await conversation.update({ analysisCompleted: true });
      logger.info('标记分析完成', { conversationId });
      return true;
    } catch (error) {
      logger.error('标记分析完成失败', error);
      return false;
    }
  }

  /**
   * 获取对话的所有消息
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Array<Object>>} 消息列表
   */
  async getMessages(conversationId) {
    try {
      const messages = await MessageModel.findAll({
        where: { conversationId },
        order: [['created_at', 'ASC']]  // 使用数据库中的snake_case字段名
      });

      logger.debug('获取对话消息', { conversationId, count: messages.length });
      return messages.map(msg => msg.toJSON());
    } catch (error) {
      logger.error('获取对话消息失败', error);
      throw error;
    }
  }

  /**
   * 添加消息到对话
   * @param {string} conversationId - 对话ID
   * @param {Object} messageData - 消息数据 { role, content }
   * @returns {Promise<Object>} 创建的消息
   */
  async addMessage(conversationId, messageData) {
    try {
      const message = await MessageModel.create({
        conversationId,
        ...messageData
      });

      logger.debug('添加消息', { conversationId, role: messageData.role });
      return message.toJSON();
    } catch (error) {
      logger.error('添加消息失败', error);
      throw error;
    }
  }

  /**
   * 批量添加消息
   * @param {string} conversationId - 对话ID
   * @param {Array<Object>} messages - 消息列表
   * @returns {Promise<Array<Object>>} 创建的消息列表
   */
  async addMessages(conversationId, messages) {
    try {
      const messagesToCreate = messages.map(msg => ({
        conversationId,
        ...msg
      }));

      const created = await MessageModel.bulkCreate(messagesToCreate);
      logger.debug('批量添加消息', { conversationId, count: messages.length });
      return created.map(msg => msg.toJSON());
    } catch (error) {
      logger.error('批量添加消息失败', error);
      throw error;
    }
  }

  /**
   * 清空用户的所有对话（测试用）
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async clearUserConversations(userId) {
    try {
      await ConversationModel.destroy({
        where: { userId }
      });

      logger.warn('清空用户对话', { userId });
    } catch (error) {
      logger.error('清空用户对话失败', error);
      throw error;
    }
  }

  /**
   * 清空所有对话（测试用）
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await MessageModel.destroy({ where: {}, truncate: true });
      await ConversationModel.destroy({ where: {}, truncate: true });

      logger.warn('清空所有对话');
    } catch (error) {
      logger.error('清空所有对话失败', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const totalConversations = await ConversationModel.count();
      const totalMessages = await MessageModel.count();
      const pinnedConversations = await ConversationModel.count({
        where: { isPinned: true }
      });
      const completedAnalysis = await ConversationModel.count({
        where: { analysisCompleted: true }
      });

      // 获取唯一用户数
      const users = await ConversationModel.findAll({
        attributes: ['userId'],
        group: ['userId']
      });

      logger.debug('获取对话统计信息', {
        totalUsers: users.length,
        totalConversations,
        totalMessages
      });

      return {
        totalUsers: users.length,
        totalConversations,
        totalMessages,
        pinnedConversations,
        completedAnalysis,
        avgMessagesPerConversation: totalConversations > 0
          ? Math.round(totalMessages / totalConversations)
          : 0
      };
    } catch (error) {
      logger.error('获取统计信息失败', error);
      throw error;
    }
  }

  /**
   * 按用户统计对话数量
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户统计
   */
  async getUserStats(userId) {
    try {
      const total = await ConversationModel.count({
        where: { userId }
      });

      const pinned = await ConversationModel.count({
        where: {
          userId,
          isPinned: true
        }
      });

      const completed = await ConversationModel.count({
        where: {
          userId,
          analysisCompleted: true
        }
      });

      const totalMessages = await MessageModel.count({
        include: [{
          model: ConversationModel,
          where: { userId }
        }]
      });

      return {
        total,
        pinned,
        completed,
        totalMessages,
        avgMessagesPerConversation: total > 0 ? Math.round(totalMessages / total) : 0
      };
    } catch (error) {
      logger.error('获取用户统计失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const conversationRepository = new ConversationRepository();

export default ConversationRepository;
