/**
 * ReportRepository - 报告 PostgreSQL数据持久化仓储
 *
 * 负责报告数据的CRUD操作
 */

import { Report as ReportModel } from '../../../infrastructure/database/models/index.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';

const logger = domainLoggers.Report;

export class ReportRepository {
  /**
   * 根据ID获取报告
   * @param {string} reportId - 报告ID
   * @returns {Promise<Object|null>} 报告JSON或null
   */
  async getReportById(reportId) {
    try {
      const report = await ReportModel.findByPk(reportId);
      return report ? report.toJSON() : null;
    } catch (error) {
      logger.error('根据ID获取报告失败', error);
      throw error;
    }
  }

  /**
   * 根据对话ID获取报告
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Object|null>} 报告JSON或null
   */
  async getReportByConversationId(conversationId) {
    try {
      const report = await ReportModel.findOne({
        where: { conversationId },
        order: [['version', 'DESC']] // 获取最新版本
      });
      return report ? report.toJSON() : null;
    } catch (error) {
      logger.error('根据对话ID获取报告失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有报告
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 报告列表
   */
  async getUserReports(userId, options = {}) {
    try {
      const { status = null, limit = 50, offset = 0 } = options;

      const where = { userId };
      if (status) {
        where.status = status;
      }

      const reports = await ReportModel.findAll({
        where,
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      logger.debug('获取用户报告', { userId, count: reports.length });
      return reports.map(report => report.toJSON());
    } catch (error) {
      logger.error('获取用户报告失败', error);
      throw error;
    }
  }

  /**
   * 创建报告
   * @param {Object} reportData - 报告数据
   * @returns {Promise<Object>} 创建的报告
   */
  async createReport(reportData) {
    try {
      const report = await ReportModel.create(reportData);
      logger.info('创建报告', {
        reportId: report.id,
        conversationId: reportData.conversationId,
        userId: reportData.userId
      });
      return report.toJSON();
    } catch (error) {
      logger.error('创建报告失败', error);
      throw error;
    }
  }

  /**
   * 更新报告
   * @param {string} reportId - 报告ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<boolean>} 是否成功
   */
  async updateReport(reportId, updates) {
    try {
      const report = await ReportModel.findByPk(reportId);
      if (!report) {
        return false;
      }

      await report.update(updates);
      logger.info('更新报告', { reportId, updates: Object.keys(updates) });
      return true;
    } catch (error) {
      logger.error('更新报告失败', error);
      return false;
    }
  }

  /**
   * 删除报告
   * @param {string} reportId - 报告ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteReport(reportId, userId) {
    try {
      const deleted = await ReportModel.destroy({
        where: {
          id: reportId,
          userId
        }
      });

      if (deleted > 0) {
        logger.info('删除报告', { reportId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('删除报告失败', error);
      return false;
    }
  }

  /**
   * 更新报告状态
   * @param {string} reportId - 报告ID
   * @param {string} status - 新状态
   * @returns {Promise<boolean>} 是否成功
   */
  async updateStatus(reportId, status) {
    try {
      const report = await ReportModel.findByPk(reportId);
      if (!report) {
        return false;
      }

      await report.update({ status });
      logger.info('更新报告状态', { reportId, status });
      return true;
    } catch (error) {
      logger.error('更新报告状态失败', error);
      return false;
    }
  }

  /**
   * 更新报告版本
   * @param {string} reportId - 报告ID
   * @returns {Promise<number>} 新版本号
   */
  async incrementVersion(reportId) {
    try {
      const report = await ReportModel.findByPk(reportId);
      if (!report) {
        throw new Error('报告不存在');
      }

      const newVersion = report.version + 1;
      await report.update({ version: newVersion });
      logger.info('更新报告版本', { reportId, version: newVersion });
      return newVersion;
    } catch (error) {
      logger.error('更新报告版本失败', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const total = await ReportModel.count();
      const draft = await ReportModel.count({ where: { status: 'draft' } });
      const final = await ReportModel.count({ where: { status: 'final' } });
      const archived = await ReportModel.count({ where: { status: 'archived' } });

      // 获取唯一用户数
      const users = await ReportModel.findAll({
        attributes: ['userId'],
        group: ['userId']
      });

      logger.debug('获取报告统计信息', {
        totalUsers: users.length,
        total
      });

      return {
        totalUsers: users.length,
        total,
        byStatus: {
          draft,
          final,
          archived
        }
      };
    } catch (error) {
      logger.error('获取统计信息失败', error);
      throw error;
    }
  }

  /**
   * 按用户统计报告数量
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户统计
   */
  async getUserStats(userId) {
    try {
      const total = await ReportModel.count({ where: { userId } });
      const draft = await ReportModel.count({
        where: { userId, status: 'draft' }
      });
      const final = await ReportModel.count({
        where: { userId, status: 'final' }
      });
      const archived = await ReportModel.count({
        where: { userId, status: 'archived' }
      });

      return {
        total,
        byStatus: {
          draft,
          final,
          archived
        }
      };
    } catch (error) {
      logger.error('获取用户统计失败', error);
      throw error;
    }
  }

  /**
   * 清空用户的所有报告（测试用）
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async clearUserReports(userId) {
    try {
      await ReportModel.destroy({
        where: { userId }
      });

      logger.warn('清空用户报告', { userId });
    } catch (error) {
      logger.error('清空用户报告失败', error);
      throw error;
    }
  }

  /**
   * 清空所有报告（测试用）
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await ReportModel.destroy({ where: {}, truncate: true });

      logger.warn('清空所有报告');
    } catch (error) {
      logger.error('清空所有报告失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const reportRepository = new ReportRepository();

export default ReportRepository;
