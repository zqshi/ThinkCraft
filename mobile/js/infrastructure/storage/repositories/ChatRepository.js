import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Chat Repository
 * 管理对话数据的持久化
 */
export class ChatRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'chats');
  }

  /**
   * 保存对话
   * @param {Object} chat - 对话对象
   * @returns {Promise<any>}
   */
  async saveChat(chat) {
    const chatData = {
      ...chat,
      updatedAt: Date.now()
    };
    return this.save(chatData);
  }

  /**
   * 获取对话
   * @param {string} id - 对话ID
   * @returns {Promise<Object|null>}
   */
  async getChat(id) {
    return this.getById(id);
  }

  /**
   * 获取所有对话（按创建时间倒序）
   * @returns {Promise<Array>}
   */
  async getAllChats() {
    const chats = await this.getAll();
    return chats.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 删除对话
   * @param {string} id - 对话ID
   * @returns {Promise<void>}
   */
  async deleteChat(id) {
    return this.delete(id);
  }

  /**
   * 按创建时间范围查询对话
   * @param {number} startTime - 开始时间戳
   * @param {number} endTime - 结束时间戳
   * @returns {Promise<Array>}
   */
  async getChatsByTimeRange(startTime, endTime) {
    const allChats = await this.getAllChats();
    return allChats.filter(chat =>
      chat.createdAt >= startTime && chat.createdAt <= endTime
    );
  }

  /**
   * 搜索对话（按标题或消息内容）
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchChats(keyword) {
    const allChats = await this.getAllChats();
    const lowerKeyword = keyword.toLowerCase();

    return allChats.filter(chat => {
      // 搜索标题
      if (chat.title && chat.title.toLowerCase().includes(lowerKeyword)) {
        return true;
      }

      // 搜索消息内容
      if (chat.messages && chat.messages.length > 0) {
        return chat.messages.some(msg =>
          msg.content && msg.content.toLowerCase().includes(lowerKeyword)
        );
      }

      return false;
    });
  }

  /**
   * 清空所有对话
   * @returns {Promise<void>}
   */
  async clearAllChats() {
    return this.clear();
  }

  /**
   * 统计对话数量
   * @returns {Promise<number>}
   */
  async countChats() {
    return this.count();
  }

  /**
   * 获取最近的N个对话
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>}
   */
  async getRecentChats(limit = 10) {
    const allChats = await this.getAllChats();
    return allChats.slice(0, limit);
  }

  /**
   * 更新对话的最后访问时间
   * @param {string} id - 对话ID
   * @returns {Promise<any>}
   */
  async updateLastAccessed(id) {
    const chat = await this.getChat(id);
    if (chat) {
      chat.lastAccessedAt = Date.now();
      return this.save(chat);
    }
  }
}
