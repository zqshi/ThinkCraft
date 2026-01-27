/**
 * Chat MongoDB仓库实现
 * 处理聊天会话的持久化
 */
import { ChatModel } from './chat.model.js';
import { Chat } from '../domain/chat.aggregate.js';
import { ChatStatus } from '../domain/chat-status.vo.js';
import { Message } from '../domain/message.entity.js';
import logger from '../../../infrastructure/logger/logger.js';

export class ChatMongoRepository {
  /**
   * 根据ID查找聊天
   */
  async findById(chatId) {
    try {
      const doc = await ChatModel.findById(chatId).lean();
      if (!doc) {
        return null;
      }
      return this._toDomain(doc);
    } catch (error) {
      logger.error('[ChatMongoRepository] 查找聊天失败:', error);
      throw error;
    }
  }

  /**
   * 根据用户ID查找所有聊天
   */
  async findByUserId(userId, options = {}) {
    try {
      const { status, limit = 50, offset = 0, includeArchived = false } = options;

      const query = { userId };
      if (status) {
        query.status = status;
      } else if (!includeArchived) {
        query.status = { $ne: 'archived' };
      }

      const docs = await ChatModel.find(query)
        .sort({ isPinned: -1, updatedAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return docs.map(doc => this._toDomain(doc));
    } catch (error) {
      logger.error('[ChatMongoRepository] 查找用户聊天失败:', error);
      throw error;
    }
  }

  /**
   * 根据标签查找聊天
   */
  async findByTag(userId, tag) {
    try {
      const docs = await ChatModel.find({
        userId,
        tags: tag,
        status: { $ne: 'deleted' }
      })
        .sort({ updatedAt: -1 })
        .lean();

      return docs.map(doc => this._toDomain(doc));
    } catch (error) {
      logger.error('[ChatMongoRepository] 根据标签查找聊天失败:', error);
      throw error;
    }
  }

  /**
   * 保存聊天
   */
  async save(chat) {
    try {
      const data = this._toPersistence(chat);

      await ChatModel.findByIdAndUpdate(data._id, data, {
        upsert: true,
        new: true
      });

      // 发布领域事件
      const events = chat.getDomainEvents();
      for (const event of events) {
        // TODO: 发布到事件总线
        logger.info('[ChatMongoRepository] Domain event:', event.eventName);
      }
      chat.clearDomainEvents();

      return chat;
    } catch (error) {
      logger.error('[ChatMongoRepository] 保存聊天失败:', error);
      throw error;
    }
  }

  /**
   * 删除聊天（软删除）
   */
  async delete(chatId) {
    try {
      await ChatModel.findByIdAndUpdate(chatId, {
        status: 'deleted',
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('[ChatMongoRepository] 删除聊天失败:', error);
      throw error;
    }
  }

  /**
   * 统计用户聊天数量
   */
  async countByUserId(userId, options = {}) {
    try {
      const { status } = options;
      const query = { userId };

      if (status) {
        query.status = status;
      } else {
        query.status = { $ne: 'deleted' };
      }

      return await ChatModel.countDocuments(query);
    } catch (error) {
      logger.error('[ChatMongoRepository] 统计聊天数量失败:', error);
      throw error;
    }
  }

  /**
   * 搜索聊天
   */
  async search(userId, keyword, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;

      const docs = await ChatModel.find({
        userId,
        status: { $ne: 'deleted' },
        $or: [
          { title: { $regex: keyword, $options: 'i' } },
          { 'messages.content': { $regex: keyword, $options: 'i' } }
        ]
      })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return docs.map(doc => this._toDomain(doc));
    } catch (error) {
      logger.error('[ChatMongoRepository] 搜索聊天失败:', error);
      throw error;
    }
  }

  /**
   * 将数据库文档转换为领域对象
   */
  _toDomain(doc) {
    const messages = doc.messages.map(
      msg => new Message(msg.id, msg.type, msg.content, msg.metadata, new Date(msg.createdAt))
    );

    const status = ChatStatus.create(doc.status);

    return new Chat(
      doc._id,
      doc.title,
      status,
      messages,
      doc.tags || [],
      doc.isPinned || false,
      new Date(doc.createdAt),
      new Date(doc.updatedAt)
    );
  }

  /**
   * 将领域对象转换为数据库文档
   */
  _toPersistence(chat) {
    const json = chat.toJSON();

    return {
      _id: json.id,
      userId: json.userId || 'system', // TODO: 从上下文获取userId
      title: json.title,
      status: json.status,
      messages: json.messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        createdAt: msg.createdAt
      })),
      tags: json.tags,
      isPinned: json.isPinned,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt
    };
  }
}
