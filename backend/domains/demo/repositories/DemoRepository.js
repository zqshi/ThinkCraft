/**
 * DemoRepository - Demo生成 PostgreSQL数据持久化仓储
 *
 * 使用Sequelize ORM进行数据持久化
 */

import { Demo as DemoModel } from '../../../infrastructure/database/models/index.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';

const logger = domainLoggers.Demo;

export class DemoRepository {
  /**
   * 根据ID获取Demo
   * @param {string} demoId - Demo ID
   * @returns {Promise<Object|null>} Demo JSON或null
   */
  async getDemoById(demoId) {
    try {
      const demo = await DemoModel.findByPk(demoId);
      return demo ? demo.toJSON() : null;
    } catch (error) {
      logger.error('根据ID获取Demo失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有Demo
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} Demo列表
   */
  async getUserDemos(userId, options = {}) {
    try {
      const { type = null, status = null, limit = 50, offset = 0 } = options;

      const where = { userId };
      if (type) {
        where.type = type;
      }
      if (status) {
        where.status = status;
      }

      const demos = await DemoModel.findAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      logger.debug('获取用户Demo', { userId, count: demos.length });
      return demos.map(demo => demo.toJSON());
    } catch (error) {
      logger.error('获取用户Demo失败', error);
      throw error;
    }
  }

  /**
   * 根据对话ID获取Demo
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Array<Object>>} Demo列表
   */
  async getDemosByConversationId(conversationId) {
    try {
      const demos = await DemoModel.findAll({
        where: { conversationId },
        order: [['createdAt', 'DESC']]
      });

      return demos.map(demo => demo.toJSON());
    } catch (error) {
      logger.error('根据对话ID获取Demo失败', error);
      throw error;
    }
  }

  /**
   * 保存Demo（新增或更新）
   * @param {Object} demoData - Demo数据
   * @returns {Promise<boolean>} 是否成功
   */
  async saveDemo(demoData) {
    try {
      const existing = await DemoModel.findByPk(demoData.id);

      if (existing) {
        await existing.update(demoData);
        logger.info('更新Demo', { demoId: demoData.id });
      } else {
        await DemoModel.create(demoData);
        logger.info('创建Demo', { demoId: demoData.id });
      }

      return true;
    } catch (error) {
      logger.error('保存Demo失败', error);
      return false;
    }
  }

  /**
   * 更新Demo状态
   * @param {string} demoId - Demo ID
   * @param {string} status - 新状态 (draft/published/archived)
   * @returns {Promise<boolean>} 是否成功
   */
  async updateStatus(demoId, status) {
    try {
      const demo = await DemoModel.findByPk(demoId);
      if (!demo) {
        return false;
      }

      await demo.update({ status });
      logger.info('更新Demo状态', { demoId, status });
      return true;
    } catch (error) {
      logger.error('更新Demo状态失败', error);
      return false;
    }
  }

  /**
   * 更新Demo预览URL
   * @param {string} demoId - Demo ID
   * @param {string} previewUrl - 预览URL
   * @returns {Promise<boolean>} 是否成功
   */
  async updatePreviewUrl(demoId, previewUrl) {
    try {
      const demo = await DemoModel.findByPk(demoId);
      if (!demo) {
        return false;
      }

      await demo.update({ previewUrl });
      logger.info('更新Demo预览URL', { demoId, previewUrl });
      return true;
    } catch (error) {
      logger.error('更新Demo预览URL失败', error);
      return false;
    }
  }

  /**
   * 删除Demo
   * @param {string} demoId - Demo ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteDemo(demoId, userId) {
    try {
      const deleted = await DemoModel.destroy({
        where: {
          id: demoId,
          userId
        }
      });

      if (deleted > 0) {
        logger.info('删除Demo', { demoId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('删除Demo失败', error);
      return false;
    }
  }

  /**
   * 清空用户的所有Demo（测试用）
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async clearUserDemos(userId) {
    try {
      await DemoModel.destroy({
        where: { userId }
      });

      logger.warn('清空用户Demo', { userId });
    } catch (error) {
      logger.error('清空用户Demo失败', error);
      throw error;
    }
  }

  /**
   * 清空所有Demo（测试用）
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await DemoModel.destroy({
        where: {},
        truncate: true
      });

      logger.warn('清空所有Demo');
    } catch (error) {
      logger.error('清空所有Demo失败', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const total = await DemoModel.count();

      const byType = {
        web: await DemoModel.count({ where: { type: 'web' } }),
        mobile: await DemoModel.count({ where: { type: 'mobile' } }),
        desktop: await DemoModel.count({ where: { type: 'desktop' } }),
        prototype: await DemoModel.count({ where: { type: 'prototype' } })
      };

      const byStatus = {
        draft: await DemoModel.count({ where: { status: 'draft' } }),
        published: await DemoModel.count({ where: { status: 'published' } }),
        archived: await DemoModel.count({ where: { status: 'archived' } })
      };

      // 获取唯一用户数
      const users = await DemoModel.findAll({
        attributes: ['userId'],
        group: ['userId']
      });

      logger.debug('获取Demo统计信息', {
        totalUsers: users.length,
        total,
        byType,
        byStatus
      });

      return {
        totalUsers: users.length,
        total,
        byType,
        byStatus
      };
    } catch (error) {
      logger.error('获取统计信息失败', error);
      throw error;
    }
  }

  /**
   * 按用户统计Demo数量
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户统计
   */
  async getUserStats(userId) {
    try {
      const total = await DemoModel.count({
        where: { userId }
      });

      const byType = {
        web: await DemoModel.count({ where: { userId, type: 'web' } }),
        mobile: await DemoModel.count({ where: { userId, type: 'mobile' } }),
        desktop: await DemoModel.count({ where: { userId, type: 'desktop' } }),
        prototype: await DemoModel.count({ where: { userId, type: 'prototype' } })
      };

      const byStatus = {
        draft: await DemoModel.count({ where: { userId, status: 'draft' } }),
        published: await DemoModel.count({ where: { userId, status: 'published' } }),
        archived: await DemoModel.count({ where: { userId, status: 'archived' } })
      };

      return {
        total,
        byType,
        byStatus
      };
    } catch (error) {
      logger.error('获取用户统计失败', error);
      throw error;
    }
  }

  /**
   * 获取最新Demo
   * @param {string} userId - 用户ID
   * @param {string} type - Demo类型（可选）
   * @returns {Promise<Object|null>} 最新Demo或null
   */
  async getLatestDemo(userId, type = null) {
    try {
      const where = { userId };
      if (type) {
        where.type = type;
      }

      const demo = await DemoModel.findOne({
        where,
        order: [['createdAt', 'DESC']]
      });

      return demo ? demo.toJSON() : null;
    } catch (error) {
      logger.error('获取最新Demo失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const demoRepository = new DemoRepository();

export default DemoRepository;
