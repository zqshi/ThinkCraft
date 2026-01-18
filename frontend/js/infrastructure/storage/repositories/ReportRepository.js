import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Report Repository
 * 管理报告数据的持久化
 */
export class ReportRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'reports');
  }

  /**
   * 保存报告
   * @param {Object} report - 报告对象
   * @returns {Promise<any>}
   */
  async saveReport(report) {
    return this.save(report);
  }

  /**
   * 获取报告
   * @param {string} id - 报告ID
   * @returns {Promise<Object|null>}
   */
  async getReport(id) {
    return this.getById(id);
  }

  /**
   * 获取所有报告（按时间倒序）
   * @returns {Promise<Array>}
   */
  async getAllReports() {
    const reports = await this.getAll();
    return reports.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 根据类型获取报告
   * @param {string} type - 报告类型
   * @returns {Promise<Array>}
   */
  async getReportsByType(type) {
    return this.getByIndex('type', type);
  }

  /**
   * 删除报告
   * @param {string} id - 报告ID
   * @returns {Promise<void>}
   */
  async deleteReport(id) {
    return this.delete(id);
  }

  /**
   * 清空所有报告
   * @returns {Promise<void>}
   */
  async clearAllReports() {
    return this.clear();
  }

  /**
   * 统计报告数量
   * @returns {Promise<number>}
   */
  async countReports() {
    return this.count();
  }

  /**
   * 按类型统计报告
   * @returns {Promise<Object>}
   */
  async countByType() {
    const reports = await this.getAll();
    const stats = {};

    reports.forEach(report => {
      const type = report.type || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * 获取最近的N个报告
   * @param {number} limit - 数量限制
   * @returns {Promise<Array>}
   */
  async getRecentReports(limit = 10) {
    const allReports = await this.getAllReports();
    return allReports.slice(0, limit);
  }

  /**
   * 按时间范围获取报告
   * @param {number} startTime - 开始时间戳
   * @param {number} endTime - 结束时间戳
   * @returns {Promise<Array>}
   */
  async getReportsByTimeRange(startTime, endTime) {
    const allReports = await this.getAllReports();
    return allReports.filter(report =>
      report.timestamp >= startTime && report.timestamp <= endTime
    );
  }
}
