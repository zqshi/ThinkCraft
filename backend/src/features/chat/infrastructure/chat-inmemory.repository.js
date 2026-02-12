/**
 * 聊天聚合根内存仓库实现
 * 用于测试和开发环境
 */
import { IChatRepository } from '../domain/chat.repository.js';
import { Chat } from '../domain/chat.aggregate.js';

export class InMemoryChatRepository extends IChatRepository {
  constructor() {
    super();
    this._chats = new Map();
  }

  /**
   * 根据ID查找聊天
   */
  async findById(id) {
    return this._chats.get(id) || null;
  }

  /**
   * 保存聊天
   */
  async save(chat) {
    chat.validate();
    this._chats.set(chat.id, chat);
    return chat;
  }

  /**
   * 查找所有聊天
   */
  async findAll(userId) {
    return userId
      ? Array.from(this._chats.values()).filter(chat => chat.userId === userId)
      : Array.from(this._chats.values());
  }

  /**
   * 根据用户ID查找聊天（模拟）
   */
  async findByUserId(userId) {
    return Array.from(this._chats.values()).filter(
      chat => chat.userId === userId && chat.status.value !== 'deleted'
    );
  }

  /**
   * 查找置顶的聊天
   */
  async findPinned(userId) {
    return Array.from(this._chats.values()).filter(
      chat =>
        chat.isPinned && (!userId || chat.userId === userId) && chat.status.value !== 'deleted'
    );
  }

  /**
   * 根据标签查找聊天
   */
  async findByTags(tags, userId) {
    if (!Array.isArray(tags) || tags.length === 0) {
      return [];
    }

    return Array.from(this._chats.values()).filter(chat => {
      if (userId && chat.userId !== userId) {
        return false;
      }
      return tags.some(tag => chat.tags.includes(tag));
    });
  }

  /**
   * 根据状态查找聊天
   */
  async findByStatus(status, userId) {
    return Array.from(this._chats.values()).filter(chat => {
      if (userId && chat.userId !== userId) {
        return false;
      }
      return chat.status.value === status;
    });
  }

  /**
   * 删除聊天
   */
  async delete(id) {
    const chat = this._chats.get(id);
    if (!chat) {
      return false;
    }

    // 软删除：将状态改为deleted
    const { ChatStatus } = await import('../domain/chat-status.vo.js');
    chat.updateStatus(ChatStatus.DELETED);
    await this.save(chat);

    return true;
  }

  /**
   * 检查聊天是否存在
   */
  async exists(id) {
    return this._chats.has(id);
  }

  /**
   * 统计聊天数量
   */
  async count() {
    return this._chats.size;
  }

  /**
   * 搜索聊天（标题和内容）
   */
  async search(keyword) {
    const results = [];
    const lowerKeyword = keyword.toLowerCase();

    for (const chat of this._chats.values()) {
      // 搜索标题
      if (chat.title.toLowerCase().includes(lowerKeyword)) {
        results.push(chat);
        continue;
      }

      // 搜索内容
      const hasMatchingMessage = chat.messages.some(message =>
        message.content.toLowerCase().includes(lowerKeyword)
      );

      if (hasMatchingMessage) {
        results.push(chat);
      }
    }

    return results;
  }

  /**
   * 清除所有数据（用于测试）
   */
  clear() {
    this._chats.clear();
  }

  /**
   * 导入数据（用于测试）
   */
  async importData(chatsData) {
    this._chats.clear();

    for (const chatData of chatsData) {
      const chat = Chat.fromJSON(chatData);
      await this.save(chat);
    }
  }

  /**
   * 导出数据（用于备份）
   */
  exportData() {
    const data = [];
    for (const chat of this._chats.values()) {
      data.push(chat.toJSON());
    }
    return data;
  }
}

// 导出单例实例
export const inMemoryChatRepository = new InMemoryChatRepository();
