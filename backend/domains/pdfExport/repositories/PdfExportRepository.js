/**
 * PdfExportRepository - PDF导出记录 PostgreSQL数据持久化仓储
 *
 * 用于记录PDF导出历史和审计
 * 注意：实际PDF文件不存储在数据库中，而是存储在文件系统或对象存储中
 */

import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';

const logger = domainLoggers.PdfExport;

/**
 * PDF导出记录Model（简化版）
 * 注意：由于PdfExport主要是即时服务，这里提供一个轻量级的记录功能
 * 如果需要完整的持久化，可以在infrastructure/database/models中添加PdfExportLog Model
 */
export class PdfExportRepository {
  constructor() {
    // 内存存储导出记录（可选）
    this.exportLogs = new Map();
  }

  /**
   * 记录PDF导出
   * @param {Object} exportData - 导出数据
   * @returns {Promise<boolean>} 是否成功
   */
  async logExport(exportData) {
    try {
      const log = {
        id: exportData.id || `export_${Date.now()}`,
        userId: exportData.userId,
        resourceType: exportData.resourceType, // 'report' | 'business_plan' | 'demo'
        resourceId: exportData.resourceId,
        fileName: exportData.fileName,
        fileSize: exportData.fileSize,
        exportedAt: new Date(),
        ...exportData
      };

      // 存储到内存（如果需要持久化，可以写入数据库）
      this.exportLogs.set(log.id, log);

      logger.info('记录PDF导出', {
        exportId: log.id,
        userId: log.userId,
        resourceType: log.resourceType,
        fileName: log.fileName
      });

      return true;
    } catch (error) {
      logger.error('记录PDF导出失败', error);
      return false;
    }
  }

  /**
   * 获取用户的导出历史
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 导出记录列表
   */
  async getUserExports(userId, options = {}) {
    try {
      const { limit = 50 } = options;

      // 从内存中筛选
      const userExports = Array.from(this.exportLogs.values())
        .filter(log => log.userId === userId)
        .sort((a, b) => b.exportedAt - a.exportedAt)
        .slice(0, limit);

      logger.debug('获取用户PDF导出历史', { userId, count: userExports.length });
      return userExports;
    } catch (error) {
      logger.error('获取用户导出历史失败', error);
      throw error;
    }
  }

  /**
   * 获取导出统计
   * @param {string} userId - 用户ID（可选）
   * @returns {Promise<Object>} 统计信息
   */
  async getStats(userId = null) {
    try {
      let logs = Array.from(this.exportLogs.values());

      if (userId) {
        logs = logs.filter(log => log.userId === userId);
      }

      const byType = logs.reduce((acc, log) => {
        acc[log.resourceType] = (acc[log.resourceType] || 0) + 1;
        return acc;
      }, {});

      const totalSize = logs.reduce((sum, log) => sum + (log.fileSize || 0), 0);

      logger.debug('获取PDF导出统计', {
        userId: userId || 'all',
        total: logs.length,
        byType,
        totalSize
      });

      return {
        total: logs.length,
        byType,
        totalSize,
        avgSize: logs.length > 0 ? Math.round(totalSize / logs.length) : 0
      };
    } catch (error) {
      logger.error('获取导出统计失败', error);
      throw error;
    }
  }

  /**
   * 清空导出记录（测试用）
   * @param {string} userId - 用户ID（可选）
   * @returns {Promise<void>}
   */
  async clearExports(userId = null) {
    try {
      if (userId) {
        // 清空指定用户的记录
        for (const [id, log] of this.exportLogs.entries()) {
          if (log.userId === userId) {
            this.exportLogs.delete(id);
          }
        }
        logger.warn('清空用户PDF导出记录', { userId });
      } else {
        // 清空所有记录
        this.exportLogs.clear();
        logger.warn('清空所有PDF导出记录');
      }
    } catch (error) {
      logger.error('清空导出记录失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const pdfExportRepository = new PdfExportRepository();

export default PdfExportRepository;
