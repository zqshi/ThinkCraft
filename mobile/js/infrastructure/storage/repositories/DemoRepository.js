import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Demo Repository
 * 管理Demo项目数据的持久化
 */
export class DemoRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'demos');
  }

  /**
   * 保存Demo
   * @param {Object} demo - Demo对象
   * @returns {Promise<any>}
   */
  async saveDemo(demo) {
    return this.save(demo);
  }

  /**
   * 获取Demo
   * @param {string} id - Demo ID
   * @returns {Promise<Object|null>}
   */
  async getDemo(id) {
    return this.getById(id);
  }

  /**
   * 获取所有Demo（按时间倒序）
   * @returns {Promise<Array>}
   */
  async getAllDemos() {
    const demos = await this.getAll();
    return demos.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 根据类型获取Demo
   * @param {string} type - Demo类型 (web/app/miniapp等)
   * @returns {Promise<Array>}
   */
  async getDemosByType(type) {
    return this.getByIndex('type', type);
  }

  /**
   * 删除Demo
   * @param {string} id - Demo ID
   * @returns {Promise<void>}
   */
  async deleteDemo(id) {
    return this.delete(id);
  }

  /**
   * 清空所有Demo
   * @returns {Promise<void>}
   */
  async clearAllDemos() {
    return this.clear();
  }

  /**
   * 统计Demo数量
   * @returns {Promise<number>}
   */
  async countDemos() {
    return this.count();
  }

  /**
   * 按类型统计Demo
   * @returns {Promise<Object>}
   */
  async countByType() {
    const demos = await this.getAll();
    const stats = {};

    demos.forEach(demo => {
      const type = demo.type || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * 获取最近的N个Demo
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>}
   */
  async getRecentDemos(limit = 10) {
    const allDemos = await this.getAllDemos();
    return allDemos.slice(0, limit);
  }
}
