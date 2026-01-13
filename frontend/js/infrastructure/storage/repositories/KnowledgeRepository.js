import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Knowledge Repository
 * 管理知识库数据的持久化
 */
export class KnowledgeRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'knowledge');
  }

  /**
   * 保存知识条目
   * @param {Object} knowledge - 知识对象
   * @returns {Promise<any>}
   */
  async saveKnowledge(knowledge) {
    return this.save(knowledge);
  }

  /**
   * 获取知识条目
   * @param {string} id - 知识ID
   * @returns {Promise<Object|null>}
   */
  async getKnowledge(id) {
    return this.getById(id);
  }

  /**
   * 获取所有知识条目（按创建时间倒序）
   * @returns {Promise<Array>}
   */
  async getAllKnowledge() {
    const items = await this.getAll();
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据类型获取知识
   * @param {string} type - 知识类型
   * @returns {Promise<Array>}
   */
  async getKnowledgeByType(type) {
    return this.getByIndex('type', type);
  }

  /**
   * 根据范围获取知识（project/global）
   * @param {string} scope - 范围
   * @returns {Promise<Array>}
   */
  async getKnowledgeByScope(scope) {
    return this.getByIndex('scope', scope);
  }

  /**
   * 根据项目ID获取知识
   * @param {string} projectId - 项目ID
   * @returns {Promise<Array>}
   */
  async getKnowledgeByProject(projectId) {
    return this.getByIndex('projectId', projectId);
  }

  /**
   * 根据标签获取知识（多值索引）
   * @param {string} tag - 标签
   * @returns {Promise<Array>}
   */
  async getKnowledgeByTag(tag) {
    return this.getByIndex('tags', tag);
  }

  /**
   * 删除知识条目
   * @param {string} id - 知识ID
   * @returns {Promise<void>}
   */
  async deleteKnowledge(id) {
    return this.delete(id);
  }

  /**
   * 搜索知识（按标题、内容和标签）
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchKnowledge(keyword) {
    const allKnowledge = await this.getAllKnowledge();
    const lowerKeyword = keyword.toLowerCase();

    return allKnowledge.filter(item => {
      return (
        (item.title && item.title.toLowerCase().includes(lowerKeyword)) ||
        (item.content && item.content.toLowerCase().includes(lowerKeyword)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)))
      );
    });
  }

  /**
   * 统计各维度的知识数量
   * @returns {Promise<Object>}
   */
  async getStats() {
    const items = await this.getAll();

    const stats = {
      total: items.length,
      byProject: {},
      byType: {},
      byTag: {}
    };

    items.forEach(item => {
      // 按项目统计
      if (item.projectId) {
        stats.byProject[item.projectId] = (stats.byProject[item.projectId] || 0) + 1;
      }

      // 按类型统计
      if (item.type) {
        stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      }

      // 按标签统计
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
        });
      }
    });

    return stats;
  }

  /**
   * 清空所有知识
   * @returns {Promise<void>}
   */
  async clearAllKnowledge() {
    return this.clear();
  }

  /**
   * 获取最近的N个知识条目
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>}
   */
  async getRecentKnowledge(limit = 10) {
    const allKnowledge = await this.getAllKnowledge();
    return allKnowledge.slice(0, limit);
  }

  /**
   * 按时间范围获取知识
   * @param {number} startTime - 开始时间戳
   * @param {number} endTime - 结束时间戳
   * @returns {Promise<Array>}
   */
  async getKnowledgeByTimeRange(startTime, endTime) {
    const allKnowledge = await this.getAllKnowledge();
    return allKnowledge.filter(item =>
      item.createdAt >= startTime && item.createdAt <= endTime
    );
  }

  /**
   * 批量添加标签
   * @param {string} id - 知识ID
   * @param {Array<string>} newTags - 新标签数组
   * @returns {Promise<any>}
   */
  async addTags(id, newTags) {
    const item = await this.getKnowledge(id);
    if (item) {
      item.tags = item.tags || [];
      item.tags = [...new Set([...item.tags, ...newTags])]; // 去重
      item.updatedAt = Date.now();
      return this.save(item);
    }
  }

  /**
   * 移除标签
   * @param {string} id - 知识ID
   * @param {Array<string>} tagsToRemove - 要移除的标签数组
   * @returns {Promise<any>}
   */
  async removeTags(id, tagsToRemove) {
    const item = await this.getKnowledge(id);
    if (item && item.tags) {
      item.tags = item.tags.filter(tag => !tagsToRemove.includes(tag));
      item.updatedAt = Date.now();
      return this.save(item);
    }
  }
}
