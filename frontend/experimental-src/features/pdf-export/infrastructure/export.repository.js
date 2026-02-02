/**
 * PDF导出仓库
 */
import { storageService } from '../../../shared/infrastructure/storage.service.js';
import { eventBus } from '../../../shared/infrastructure/event-bus.js';

export class ExportRepository {
  constructor() {
    this.storageKey = 'pdf_exports';
    this.storage = storageService;
    this.eventBus = eventBus;
  }

  /**
   * 保存导出任务
   */
  async save(pdfExport) {
    try {
      // 获取现有数据
      const exports = await this.getAllExports();

      // 查找索引
      const index = exports.findIndex(exp => exp.id === pdfExport.id.value);

      // 准备数据
      const exportData = {
        id: pdfExport.id.value,
        projectId: pdfExport.projectId,
        title: pdfExport.title,
        format: pdfExport.format.value,
        status: pdfExport.status.value,
        content: pdfExport.content,
        options: pdfExport.options.toJSON(),
        fileUrl: pdfExport.fileUrl,
        fileSize: pdfExport.fileSize,
        createdAt: pdfExport.createdAt,
        startedAt: pdfExport.startedAt,
        completedAt: pdfExport.completedAt,
        error: pdfExport.error
      };

      if (index >= 0) {
        // 更新现有记录
        exports[index] = exportData;
      } else {
        // 添加新记录
        exports.push(exportData);
      }

      // 保存到存储
      await this.storage.setItem(this.storageKey, exports);

      // 发布领域事件
      const domainEvents = pdfExport.getDomainEvents();
      for (const event of domainEvents) {
        await this.eventBus.publish(event);
      }

      // 清空领域事件
      pdfExport.clearDomainEvents();

      return true;
    } catch (error) {
      console.error('保存导出任务失败:', error);
      throw new Error('保存导出任务失败');
    }
  }

  /**
   * 根据ID查找
   */
  async findById(id) {
    try {
      const exports = await this.getAllExports();
      const exportData = exports.find(exp => exp.id === id);

      if (!exportData) {
        return null;
      }

      return this.mapToDomain(exportData);
    } catch (error) {
      console.error('查找导出任务失败:', error);
      throw new Error('查找导出任务失败');
    }
  }

  /**
   * 根据项目ID查找
   */
  async findByProjectId(projectId, filters = {}) {
    try {
      const exports = await this.getAllExports();
      let filteredExports = exports.filter(exp => exp.projectId === projectId);

      // 应用过滤器
      if (filters.status) {
        filteredExports = filteredExports.filter(exp => exp.status === filters.status);
      }

      if (filters.format) {
        filteredExports = filteredExports.filter(exp => exp.format === filters.format);
      }

      if (filters.startDate) {
        filteredExports = filteredExports.filter(
          exp => new Date(exp.createdAt) >= new Date(filters.startDate)
        );
      }

      if (filters.endDate) {
        filteredExports = filteredExports.filter(
          exp => new Date(exp.createdAt) <= new Date(filters.endDate)
        );
      }

      // 排序（默认按创建时间倒序）
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      filteredExports.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      return filteredExports.map(exp => this.mapToDomain(exp));
    } catch (error) {
      console.error('按项目查找导出任务失败:', error);
      throw new Error('按项目查找导出任务失败');
    }
  }

  /**
   * 查找所有
   */
  async findAll(filters = {}) {
    try {
      const exports = await this.getAllExports();
      let filteredExports = exports;

      // 应用过滤器
      if (filters.status) {
        filteredExports = filteredExports.filter(exp => exp.status === filters.status);
      }

      if (filters.format) {
        filteredExports = filteredExports.filter(exp => exp.format === filters.format);
      }

      // 排序
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      filteredExports.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      return filteredExports.map(exp => this.mapToDomain(exp));
    } catch (error) {
      console.error('查找所有导出任务失败:', error);
      throw new Error('查找所有导出任务失败');
    }
  }

  /**
   * 删除
   */
  async delete(id) {
    try {
      const exports = await this.getAllExports();
      const filteredExports = exports.filter(exp => exp.id !== id);

      if (exports.length === filteredExports.length) {
        return false; // 没有找到要删除的记录
      }

      await this.storage.setItem(this.storageKey, filteredExports);
      return true;
    } catch (error) {
      console.error('删除导出任务失败:', error);
      throw new Error('删除导出任务失败');
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(projectId) {
    try {
      const exports = await this.findByProjectId(projectId);

      const stats = {
        total: exports.length,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        byFormat: {},
        totalSize: 0
      };

      exports.forEach(exp => {
        // 状态统计
        switch (exp.status.value) {
        case 'PENDING':
          stats.pending++;
          break;
        case 'PROCESSING':
          stats.processing++;
          break;
        case 'COMPLETED':
          stats.completed++;
          stats.totalSize += exp.fileSize || 0;
          break;
        case 'FAILED':
          stats.failed++;
          break;
        }

        // 格式统计
        const format = exp.format.value;
        stats.byFormat[format] = (stats.byFormat[format] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('获取导出统计失败:', error);
      throw new Error('获取导出统计失败');
    }
  }

  /**
   * 获取所有导出数据（私有方法）
   */
  async getAllExports() {
    try {
      const data = await this.storage.getItem(this.storageKey);
      return data || [];
    } catch (error) {
      console.error('获取所有导出数据失败:', error);
      return [];
    }
  }

  /**
   * 映射到领域对象
   */
  mapToDomain(exportData) {
    const { PdfExport } = require('../domain/entities/pdf-export.aggregate.js');
    const { ExportId } = require('../domain/value-objects/export-id.vo.js');
    const { ExportFormat } = require('../domain/value-objects/export-format.vo.js');
    const { ExportStatus } = require('../domain/value-objects/export-status.vo.js');
    const { ExportOptions } = require('../domain/value-objects/export-options.vo.js');

    // 重建聚合根
    const exportId = new ExportId(exportData.id);
    const pdfExport = new PdfExport(exportId);

    // 设置属性
    pdfExport._projectId = exportData.projectId;
    pdfExport._format = ExportFormat.fromString(exportData.format);
    pdfExport._title = exportData.title;
    pdfExport._content = exportData.content;
    pdfExport._options = ExportOptions.fromJSON(exportData.options);
    pdfExport._status = ExportStatus.fromString(exportData.status);
    pdfExport._fileUrl = exportData.fileUrl;
    pdfExport._fileSize = exportData.fileSize;
    pdfExport._createdAt = new Date(exportData.createdAt);
    pdfExport._startedAt = exportData.startedAt ? new Date(exportData.startedAt) : null;
    pdfExport._completedAt = exportData.completedAt ? new Date(exportData.completedAt) : null;
    pdfExport._error = exportData.error;

    return pdfExport;
  }

  /**
   * 清空所有数据
   */
  async clear() {
    try {
      await this.storage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('清空导出数据失败:', error);
      throw new Error('清空导出数据失败');
    }
  }
}
