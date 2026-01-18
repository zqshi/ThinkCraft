/**
 * ShareRepository - 分享链接 PostgreSQL数据持久化仓储
 *
 * 负责分享链接和访问日志的CRUD操作
 */

import { ShareLink as ShareLinkModel, ShareAccessLog as ShareAccessLogModel } from '../../../infrastructure/database/models/index.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';

const logger = domainLoggers.Share;

export class ShareRepository {
  /**
   * 根据ID获取分享链接
   * @param {string} shareId - 分享ID
   * @returns {Promise<Object|null>} 分享链接JSON或null
   */
  async getShareById(shareId) {
    try {
      const share = await ShareLinkModel.findByPk(shareId);
      return share ? share.toJSON() : null;
    } catch (error) {
      logger.error('根据ID获取分享链接失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有分享链接
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 分享链接列表
   */
  async getUserShares(userId, options = {}) {
    try {
      const { type = null, limit = 50, offset = 0 } = options;

      const where = { userId };
      if (type) {
        where.type = type;
      }

      const shares = await ShareLinkModel.findAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      logger.debug('获取用户分享链接', { userId, count: shares.length });
      return shares.map(share => share.toJSON());
    } catch (error) {
      logger.error('获取用户分享链接失败', error);
      throw error;
    }
  }

  /**
   * 创建分享链接
   * @param {Object} shareData - 分享数据
   * @returns {Promise<Object>} 创建的分享链接
   */
  async createShare(shareData) {
    try {
      const share = await ShareLinkModel.create(shareData);
      logger.info('创建分享链接', {
        shareId: share.id,
        userId: shareData.userId,
        type: shareData.type
      });
      return share.toJSON();
    } catch (error) {
      logger.error('创建分享链接失败', error);
      throw error;
    }
  }

  /**
   * 更新分享链接
   * @param {string} shareId - 分享ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<boolean>} 是否成功
   */
  async updateShare(shareId, updates) {
    try {
      const share = await ShareLinkModel.findByPk(shareId);
      if (!share) {
        return false;
      }

      await share.update(updates);
      logger.info('更新分享链接', { shareId, updates: Object.keys(updates) });
      return true;
    } catch (error) {
      logger.error('更新分享链接失败', error);
      return false;
    }
  }

  /**
   * 删除分享链接
   * @param {string} shareId - 分享ID
   * @param {string} userId - 用户ID（可选，用于权限验证）
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteShare(shareId, userId = null) {
    try {
      const where = { id: shareId };
      if (userId) {
        where.userId = userId;
      }

      const deleted = await ShareLinkModel.destroy({ where });

      if (deleted > 0) {
        logger.info('删除分享链接', { shareId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('删除分享链接失败', error);
      return false;
    }
  }

  /**
   * 增加浏览次数
   * @param {string} shareId - 分享ID
   * @returns {Promise<number>} 新的浏览次数
   */
  async incrementViews(shareId) {
    try {
      const share = await ShareLinkModel.findByPk(shareId);
      if (!share) {
        throw new Error('分享链接不存在');
      }

      const newViews = share.views + 1;
      await share.update({ views: newViews });

      logger.debug('增加分享浏览次数', { shareId, views: newViews });
      return newViews;
    } catch (error) {
      logger.error('增加分享浏览次数失败', error);
      throw error;
    }
  }

  /**
   * 记录访问日志
   * @param {Object} logData - 访问日志数据
   * @returns {Promise<Object>} 创建的日志
   */
  async logAccess(logData) {
    try {
      const log = await ShareAccessLogModel.create(logData);
      logger.debug('记录分享访问', {
        shareId: logData.shareId,
        ipAddress: logData.ipAddress
      });
      return log.toJSON();
    } catch (error) {
      logger.error('记录分享访问失败', error);
      throw error;
    }
  }

  /**
   * 获取分享的访问日志
   * @param {string} shareId - 分享ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 访问日志列表
   */
  async getAccessLogs(shareId, options = {}) {
    try {
      const { limit = 100, offset = 0 } = options;

      const logs = await ShareAccessLogModel.findAll({
        where: { shareId },
        limit,
        offset,
        order: [['accessedAt', 'DESC']]
      });

      logger.debug('获取分享访问日志', { shareId, count: logs.length });
      return logs.map(log => log.toJSON());
    } catch (error) {
      logger.error('获取分享访问日志失败', error);
      throw error;
    }
  }

  /**
   * 清理过期分享
   * @returns {Promise<number>} 清理的数量
   */
  async cleanExpiredShares() {
    try {
      const now = new Date();
      const deleted = await ShareLinkModel.destroy({
        where: {
          expiresAt: {
            [ShareLinkModel.sequelize.Sequelize.Op.lt]: now
          }
        }
      });

      if (deleted > 0) {
        logger.info('清理过期分享', { count: deleted });
      }

      return deleted;
    } catch (error) {
      logger.error('清理过期分享失败', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const totalShares = await ShareLinkModel.count();
      const totalViews = await ShareLinkModel.sum('views') || 0;

      // 按类型统计
      const sharesByType = await ShareLinkModel.findAll({
        attributes: [
          'type',
          [ShareLinkModel.sequelize.fn('COUNT', ShareLinkModel.sequelize.col('id')), 'count']
        ],
        group: ['type']
      });

      const typeStats = {};
      for (const item of sharesByType) {
        typeStats[item.type] = parseInt(item.get('count'));
      }

      // 获取唯一用户数
      const users = await ShareLinkModel.findAll({
        attributes: ['userId'],
        group: ['userId']
      });

      logger.debug('获取分享统计信息', {
        totalUsers: users.length,
        totalShares,
        totalViews
      });

      return {
        totalUsers: users.length,
        totalShares,
        totalViews,
        sharesByType: typeStats,
        avgViewsPerShare: totalShares > 0 ? Math.round(totalViews / totalShares) : 0
      };
    } catch (error) {
      logger.error('获取统计信息失败', error);
      throw error;
    }
  }

  /**
   * 按用户统计分享数量
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户统计
   */
  async getUserStats(userId) {
    try {
      const total = await ShareLinkModel.count({
        where: { userId }
      });

      const totalViews = await ShareLinkModel.sum('views', {
        where: { userId }
      }) || 0;

      // 按类型统计
      const sharesByType = await ShareLinkModel.findAll({
        attributes: [
          'type',
          [ShareLinkModel.sequelize.fn('COUNT', ShareLinkModel.sequelize.col('id')), 'count']
        ],
        where: { userId },
        group: ['type']
      });

      const typeStats = {};
      for (const item of sharesByType) {
        typeStats[item.type] = parseInt(item.get('count'));
      }

      return {
        total,
        totalViews,
        sharesByType: typeStats,
        avgViewsPerShare: total > 0 ? Math.round(totalViews / total) : 0
      };
    } catch (error) {
      logger.error('获取用户统计失败', error);
      throw error;
    }
  }

  /**
   * 清空用户的所有分享（测试用）
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async clearUserShares(userId) {
    try {
      await ShareLinkModel.destroy({
        where: { userId }
      });

      logger.warn('清空用户分享', { userId });
    } catch (error) {
      logger.error('清空用户分享失败', error);
      throw error;
    }
  }

  /**
   * 清空所有分享（测试用）
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await ShareAccessLogModel.destroy({ where: {}, truncate: true });
      await ShareLinkModel.destroy({ where: {}, truncate: true });

      logger.warn('清空所有分享');
    } catch (error) {
      logger.error('清空所有分享失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const shareRepository = new ShareRepository();

export default ShareRepository;
