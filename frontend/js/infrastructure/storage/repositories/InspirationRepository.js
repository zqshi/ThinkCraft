import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Inspiration Repository
 * 管理灵感数据的持久化
 */
export class InspirationRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'inspirations');
  }

  /**
   * 保存灵感
   * @param {Object} inspiration - 灵感对象
   * @returns {Promise<any>}
   */
  async saveInspiration(inspiration) {
    return this.save(inspiration);
  }

  /**
   * 获取灵感
   * @param {string} id - 灵感ID
   * @returns {Promise<Object|null>}
   */
  async getInspiration(id) {
    return this.getById(id);
  }

  /**
   * 获取所有灵感（按创建时间倒序）
   * @returns {Promise<Array>}
   */
  async getAllInspirations() {
    const inspirations = await this.getAll();
    return inspirations.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据状态获取灵感
   * @param {string} status - 状态 (unprocessed/processing/completed)
   * @returns {Promise<Array>}
   */
  async getInspirationsByStatus(status) {
    return this.getByIndex('status', status);
  }

  /**
   * 根据类型获取灵感
   * @param {string} type - 类型
   * @returns {Promise<Array>}
   */
  async getInspirationsByType(type) {
    return this.getByIndex('type', type);
  }

  /**
   * 根据分类获取灵感
   * @param {string} category - 分类
   * @returns {Promise<Array>}
   */
  async getInspirationsByCategory(category) {
    return this.getByIndex('category', category);
  }

  /**
   * 根据关联的ChatId获取灵感
   * @param {string} chatId - 对话ID
   * @returns {Promise<Array>}
   */
  async getInspirationsByChatId(chatId) {
    return this.getByIndex('linkedChatId', chatId);
  }

  /**
   * 删除灵感
   * @param {string} id - 灵感ID
   * @returns {Promise<void>}
   */
  async deleteInspiration(id) {
    return this.delete(id);
  }

  /**
   * 批量更新灵感状态
   * @param {Array<string>} ids - 灵感ID数组
   * @param {string} newStatus - 新状态
   * @returns {Promise<Array>}
   */
  async batchUpdateStatus(ids, newStatus) {
    const promises = ids.map(async (id) => {
      const inspiration = await this.getById(id);
      if (inspiration) {
        inspiration.status = newStatus;
        inspiration.updatedAt = Date.now();
        return this.save(inspiration);
      }
    });

    return Promise.all(promises);
  }

  /**
   * 统计各状态的灵感数量
   * @returns {Promise<Object>}
   */
  async getStatsByStatus() {
    const inspirations = await this.getAll();
    const stats = {
      unprocessed: 0,
      processing: 0,
      completed: 0
    };

    inspirations.forEach(item => {
      if (stats.hasOwnProperty(item.status)) {
        stats[item.status]++;
      }
    });

    return stats;
  }

  /**
   * 清空所有灵感
   * @returns {Promise<void>}
   */
  async clearAllInspirations() {
    return this.clear();
  }

  /**
   * 搜索灵感
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchInspirations(keyword) {
    const allInspirations = await this.getAllInspirations();
    const lowerKeyword = keyword.toLowerCase();

    return allInspirations.filter(item => {
      return (
        (item.title && item.title.toLowerCase().includes(lowerKeyword)) ||
        (item.content && item.content.toLowerCase().includes(lowerKeyword)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
      );
    });
  }

  /**
   * 获取最近的N个灵感
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>}
   */
  async getRecentInspirations(limit = 10) {
    const allInspirations = await this.getAllInspirations();
    return allInspirations.slice(0, limit);
  }
}
