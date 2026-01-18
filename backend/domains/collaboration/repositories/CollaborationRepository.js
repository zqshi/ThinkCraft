/**
 * CollaborationRepository - 协同计划 PostgreSQL数据持久化仓储
 *
 * 使用Sequelize ORM进行数据持久化
 */

import { CollaborationPlan as CollaborationPlanModel } from '../../../infrastructure/database/models/index.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';

const logger = domainLoggers.Collaboration;

export class CollaborationRepository {
  /**
   * 根据ID获取协同计划
   * @param {string} planId - 计划ID
   * @returns {Promise<Object|null>} 协同计划JSON或null
   */
  async getPlanById(planId) {
    try {
      const plan = await CollaborationPlanModel.findByPk(planId);
      return plan ? plan.toJSON() : null;
    } catch (error) {
      logger.error('根据ID获取协同计划失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有协同计划
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 协同计划列表
   */
  async getUserPlans(userId, options = {}) {
    try {
      const { status = null, limit = 50, offset = 0 } = options;

      const where = { userId };
      if (status) {
        where.status = status;
      }

      const plans = await CollaborationPlanModel.findAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      logger.debug('获取用户协同计划', { userId, count: plans.length });
      return plans.map(plan => plan.toJSON());
    } catch (error) {
      logger.error('获取用户协同计划失败', error);
      throw error;
    }
  }

  /**
   * 保存协同计划（新增或更新）
   * @param {Object} planData - 计划数据
   * @returns {Promise<boolean>} 是否成功
   */
  async savePlan(planData) {
    try {
      const existing = await CollaborationPlanModel.findByPk(planData.id);

      if (existing) {
        await existing.update(planData);
        logger.info('更新协同计划', { planId: planData.id });
      } else {
        await CollaborationPlanModel.create(planData);
        logger.info('创建协同计划', { planId: planData.id });
      }

      return true;
    } catch (error) {
      logger.error('保存协同计划失败', error);
      return false;
    }
  }

  /**
   * 更新计划状态
   * @param {string} planId - 计划ID
   * @param {string} status - 新状态
   * @returns {Promise<boolean>} 是否成功
   */
  async updateStatus(planId, status) {
    try {
      const plan = await CollaborationPlanModel.findByPk(planId);
      if (!plan) {
        return false;
      }

      await plan.update({ status });
      logger.info('更新协同计划状态', { planId, status });
      return true;
    } catch (error) {
      logger.error('更新计划状态失败', error);
      return false;
    }
  }

  /**
   * 更新计划进度
   * @param {string} planId - 计划ID
   * @param {number} progress - 进度（0-100）
   * @returns {Promise<boolean>} 是否成功
   */
  async updateProgress(planId, progress) {
    try {
      const plan = await CollaborationPlanModel.findByPk(planId);
      if (!plan) {
        return false;
      }

      await plan.update({ progress });
      logger.debug('更新协同计划进度', { planId, progress });
      return true;
    } catch (error) {
      logger.error('更新计划进度失败', error);
      return false;
    }
  }

  /**
   * 删除协同计划
   * @param {string} planId - 计划ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deletePlan(planId, userId) {
    try {
      const deleted = await CollaborationPlanModel.destroy({
        where: {
          id: planId,
          userId
        }
      });

      if (deleted > 0) {
        logger.info('删除协同计划', { planId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('删除协同计划失败', error);
      return false;
    }
  }

  /**
   * 清空用户的所有协同计划（测试用）
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async clearUserPlans(userId) {
    try {
      await CollaborationPlanModel.destroy({
        where: { userId }
      });

      logger.warn('清空用户协同计划', { userId });
    } catch (error) {
      logger.error('清空用户协同计划失败', error);
      throw error;
    }
  }

  /**
   * 清空所有协同计划（测试用）
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await CollaborationPlanModel.destroy({
        where: {},
        truncate: true
      });

      logger.warn('清空所有协同计划');
    } catch (error) {
      logger.error('清空所有协同计划失败', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const total = await CollaborationPlanModel.count();

      const byStatus = {};
      const statuses = ['draft', 'active', 'paused', 'completed', 'cancelled'];

      for (const status of statuses) {
        byStatus[status] = await CollaborationPlanModel.count({
          where: { status }
        });
      }

      // 获取唯一用户数
      const users = await CollaborationPlanModel.findAll({
        attributes: ['userId'],
        group: ['userId']
      });

      logger.debug('获取协同计划统计信息', {
        totalUsers: users.length,
        total,
        byStatus
      });

      return {
        totalUsers: users.length,
        total,
        byStatus
      };
    } catch (error) {
      logger.error('获取统计信息失败', error);
      throw error;
    }
  }

  /**
   * 按用户统计计划数量
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户统计
   */
  async getUserStats(userId) {
    try {
      const total = await CollaborationPlanModel.count({
        where: { userId }
      });

      const active = await CollaborationPlanModel.count({
        where: {
          userId,
          status: 'active'
        }
      });

      const completed = await CollaborationPlanModel.count({
        where: {
          userId,
          status: 'completed'
        }
      });

      return {
        total,
        active,
        completed,
        draft: total - active - completed
      };
    } catch (error) {
      logger.error('获取用户统计失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const collaborationRepository = new CollaborationRepository();

export default CollaborationRepository;
