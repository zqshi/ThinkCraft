/**
 * BusinessPlanRepository - 商业计划书 PostgreSQL数据持久化仓储
 *
 * 使用Sequelize ORM进行数据持久化
 */

import { BusinessPlan as BusinessPlanModel } from '../../../infrastructure/database/models/index.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';

const logger = domainLoggers.BusinessPlan;

export class BusinessPlanRepository {
  /**
   * 根据ID获取商业计划书
   * @param {string} planId - 计划书ID
   * @returns {Promise<Object|null>} 商业计划书JSON或null
   */
  async getPlanById(planId) {
    try {
      const plan = await BusinessPlanModel.findByPk(planId);
      return plan ? plan.toJSON() : null;
    } catch (error) {
      logger.error('根据ID获取商业计划书失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有商业计划书
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 商业计划书列表
   */
  async getUserPlans(userId, options = {}) {
    try {
      const { status = null, limit = 50, offset = 0 } = options;

      const where = { userId };
      if (status) {
        where.status = status;
      }

      const plans = await BusinessPlanModel.findAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      logger.debug('获取用户商业计划书', { userId, count: plans.length });
      return plans.map(plan => plan.toJSON());
    } catch (error) {
      logger.error('获取用户商业计划书失败', error);
      throw error;
    }
  }

  /**
   * 根据对话ID获取商业计划书
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Object|null>} 商业计划书JSON或null
   */
  async getPlanByConversationId(conversationId) {
    try {
      const plan = await BusinessPlanModel.findOne({
        where: { conversationId },
        order: [['createdAt', 'DESC']]
      });

      return plan ? plan.toJSON() : null;
    } catch (error) {
      logger.error('根据对话ID获取商业计划书失败', error);
      throw error;
    }
  }

  /**
   * 保存商业计划书（新增或更新）
   * @param {Object} planData - 计划书数据
   * @returns {Promise<boolean>} 是否成功
   */
  async savePlan(planData) {
    try {
      const existing = await BusinessPlanModel.findByPk(planData.id);

      if (existing) {
        await existing.update(planData);
        logger.info('更新商业计划书', { planId: planData.id });
      } else {
        await BusinessPlanModel.create(planData);
        logger.info('创建商业计划书', { planId: planData.id });
      }

      return true;
    } catch (error) {
      logger.error('保存商业计划书失败', error);
      return false;
    }
  }

  /**
   * 更新计划书状态
   * @param {string} planId - 计划书ID
   * @param {string} status - 新状态 (draft/final/archived)
   * @returns {Promise<boolean>} 是否成功
   */
  async updateStatus(planId, status) {
    try {
      const plan = await BusinessPlanModel.findByPk(planId);
      if (!plan) {
        return false;
      }

      await plan.update({ status });
      logger.info('更新商业计划书状态', { planId, status });
      return true;
    } catch (error) {
      logger.error('更新计划书状态失败', error);
      return false;
    }
  }

  /**
   * 更新计划书版本
   * @param {string} planId - 计划书ID
   * @param {number} version - 版本号
   * @returns {Promise<boolean>} 是否成功
   */
  async updateVersion(planId, version) {
    try {
      const plan = await BusinessPlanModel.findByPk(planId);
      if (!plan) {
        return false;
      }

      await plan.update({ version });
      logger.info('更新商业计划书版本', { planId, version });
      return true;
    } catch (error) {
      logger.error('更新计划书版本失败', error);
      return false;
    }
  }

  /**
   * 删除商业计划书
   * @param {string} planId - 计划书ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deletePlan(planId, userId) {
    try {
      const deleted = await BusinessPlanModel.destroy({
        where: {
          id: planId,
          userId
        }
      });

      if (deleted > 0) {
        logger.info('删除商业计划书', { planId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('删除商业计划书失败', error);
      return false;
    }
  }

  /**
   * 清空用户的所有商业计划书（测试用）
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async clearUserPlans(userId) {
    try {
      await BusinessPlanModel.destroy({
        where: { userId }
      });

      logger.warn('清空用户商业计划书', { userId });
    } catch (error) {
      logger.error('清空用户商业计划书失败', error);
      throw error;
    }
  }

  /**
   * 清空所有商业计划书（测试用）
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await BusinessPlanModel.destroy({
        where: {},
        truncate: true
      });

      logger.warn('清空所有商业计划书');
    } catch (error) {
      logger.error('清空所有商业计划书失败', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const total = await BusinessPlanModel.count();

      const byStatus = {
        draft: await BusinessPlanModel.count({ where: { status: 'draft' } }),
        final: await BusinessPlanModel.count({ where: { status: 'final' } }),
        archived: await BusinessPlanModel.count({ where: { status: 'archived' } })
      };

      // 获取唯一用户数
      const users = await BusinessPlanModel.findAll({
        attributes: ['userId'],
        group: ['userId']
      });

      logger.debug('获取商业计划书统计信息', {
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
   * 按用户统计计划书数量
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户统计
   */
  async getUserStats(userId) {
    try {
      const total = await BusinessPlanModel.count({
        where: { userId }
      });

      const draft = await BusinessPlanModel.count({
        where: {
          userId,
          status: 'draft'
        }
      });

      const final = await BusinessPlanModel.count({
        where: {
          userId,
          status: 'final'
        }
      });

      const archived = await BusinessPlanModel.count({
        where: {
          userId,
          status: 'archived'
        }
      });

      return {
        total,
        draft,
        final,
        archived
      };
    } catch (error) {
      logger.error('获取用户统计失败', error);
      throw error;
    }
  }

  /**
   * 获取最新版本的商业计划书
   * @param {string} userId - 用户ID
   * @returns {Promise<Object|null>} 最新商业计划书或null
   */
  async getLatestPlan(userId) {
    try {
      const plan = await BusinessPlanModel.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      return plan ? plan.toJSON() : null;
    } catch (error) {
      logger.error('获取最新商业计划书失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const businessPlanRepository = new BusinessPlanRepository();

export default BusinessPlanRepository;
