/**
 * 报告仓库
 */
import { storageService } from '../../../shared/infrastructure/storage.service.js';
import { eventBus } from '../../../shared/infrastructure/event-bus.js';

export class ReportRepository {
  constructor() {
    this.storageKey = 'reports';
    this.storage = storageService;
    this.eventBus = eventBus;
  }

  /**
   * 保存报告
   */
  async save(report) {
    try {
      // 获取现有数据
      const reports = await this.getAllReports();

      // 查找索引
      const index = reports.findIndex(r => r.id === report.id.value);

      // 准备数据
      const reportData = {
        id: report.id.value,
        projectId: report.projectId,
        type: report.type.value,
        title: report.title,
        description: report.description,
        status: report.status.value,
        sections: report.sections.map(section => section.toJSON()),
        metadata: report.metadata,
        generatedContent: report.generatedContent,
        generatedAt: report.generatedAt,
        generatedBy: report.generatedBy,
        templateId: report.templateId,
        tags: report.tags,
        permissions: report.permissions,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt
      };

      if (index >= 0) {
        // 更新现有记录
        reports[index] = reportData;
      } else {
        // 添加新记录
        reports.push(reportData);
      }

      // 保存到存储
      await this.storage.setItem(this.storageKey, reports);

      // 发布领域事件
      const domainEvents = report.getDomainEvents();
      for (const event of domainEvents) {
        await this.eventBus.publish(event);
      }

      // 清空领域事件
      report.clearDomainEvents();

      return true;
    } catch (error) {
      console.error('保存报告失败:', error);
      throw new Error('保存报告失败');
    }
  }

  /**
   * 根据ID查找
   */
  async findById(id) {
    try {
      const reports = await this.getAllReports();
      const reportData = reports.find(r => r.id === id);

      if (!reportData) {
        return null;
      }

      return this.mapToDomain(reportData);
    } catch (error) {
      console.error('查找报告失败:', error);
      throw new Error('查找报告失败');
    }
  }

  /**
   * 根据项目ID查找
   */
  async findByProjectId(projectId, filters = {}) {
    try {
      const reports = await this.getAllReports();
      let filteredReports = reports.filter(r => r.projectId === projectId);

      // 应用过滤器
      if (filters.type) {
        filteredReports = filteredReports.filter(r => r.type === filters.type);
      }

      if (filters.status) {
        filteredReports = filteredReports.filter(r => r.status === filters.status);
      }

      if (filters.createdBy) {
        filteredReports = filteredReports.filter(r => r.generatedBy === filters.createdBy);
      }

      if (filters.tags && filters.tags.length > 0) {
        filteredReports = filteredReports.filter(r =>
          filters.tags.some(tag => r.tags.includes(tag))
        );
      }

      if (filters.startDate) {
        filteredReports = filteredReports.filter(
          r => new Date(r.createdAt) >= new Date(filters.startDate)
        );
      }

      if (filters.endDate) {
        filteredReports = filteredReports.filter(
          r => new Date(r.createdAt) <= new Date(filters.endDate)
        );
      }

      // 排序（默认按创建时间倒序）
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      filteredReports.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      // 分页
      if (filters.limit) {
        const offset = filters.offset || 0;
        filteredReports = filteredReports.slice(offset, offset + filters.limit);
      }

      return filteredReports.map(r => this.mapToDomain(r));
    } catch (error) {
      console.error('按项目查找报告失败:', error);
      throw new Error('按项目查找报告失败');
    }
  }

  /**
   * 查找所有
   */
  async findAll(filters = {}) {
    try {
      const reports = await this.getAllReports();
      let filteredReports = reports;

      // 应用过滤器
      if (filters.type) {
        filteredReports = filteredReports.filter(r => r.type === filters.type);
      }

      if (filters.status) {
        filteredReports = filteredReports.filter(r => r.status === filters.status);
      }

      // 排序
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'desc';
      filteredReports.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });

      return filteredReports.map(r => this.mapToDomain(r));
    } catch (error) {
      console.error('查找所有报告失败:', error);
      throw new Error('查找所有报告失败');
    }
  }

  /**
   * 删除
   */
  async delete(id) {
    try {
      const reports = await this.getAllReports();
      const filteredReports = reports.filter(r => r.id !== id);

      if (reports.length === filteredReports.length) {
        return false; // 没有找到要删除的记录
      }

      await this.storage.setItem(this.storageKey, filteredReports);
      return true;
    } catch (error) {
      console.error('删除报告失败:', error);
      throw new Error('删除报告失败');
    }
  }

  /**
   * 获取统计信息
   */
  async getStats(projectId) {
    try {
      const reports = await this.findByProjectId(projectId);

      const stats = {
        total: reports.length,
        draft: 0,
        generated: 0,
        published: 0,
        archived: 0,
        revision: 0,
        byType: {},
        totalSections: 0,
        averageSections: 0
      };

      let totalSections = 0;

      reports.forEach(report => {
        // 状态统计
        switch (report.status.value) {
        case 'DRAFT':
          stats.draft++;
          break;
        case 'GENERATED':
          stats.generated++;
          break;
        case 'PUBLISHED':
          stats.published++;
          break;
        case 'ARCHIVED':
          stats.archived++;
          break;
        case 'REVISION':
          stats.revision++;
          break;
        }

        // 类型统计
        const type = report.type.value;
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        // 章节统计
        totalSections += report.sections.length;
      });

      stats.totalSections = totalSections;
      stats.averageSections =
        reports.length > 0 ? Math.round((totalSections / reports.length) * 10) / 10 : 0;

      return stats;
    } catch (error) {
      console.error('获取报告统计失败:', error);
      throw new Error('获取报告统计失败');
    }
  }

  /**
   * 获取所有报告数据（私有方法）
   */
  async getAllReports() {
    try {
      const data = await this.storage.getItem(this.storageKey);
      return data || [];
    } catch (error) {
      console.error('获取所有报告数据失败:', error);
      return [];
    }
  }

  /**
   * 映射到领域对象
   */
  mapToDomain(reportData) {
    const { Report } = require('../domain/entities/report.aggregate.js');
    const { ReportId } = require('../domain/value-objects/report-id.vo.js');
    const { ReportType } = require('../domain/value-objects/report-type.vo.js');
    const { ReportStatus } = require('../domain/value-objects/report-status.vo.js');
    const { ReportSection } = require('../domain/value-objects/report-section.vo.js');

    // 重建聚合根
    const reportId = new ReportId(reportData.id);
    const report = new Report(reportId);

    // 设置属性
    report._projectId = reportData.projectId;
    report._type = ReportType.fromString(reportData.type);
    report._title = reportData.title;
    report._description = reportData.description;
    report._status = ReportStatus.fromString(reportData.status);
    report._sections = reportData.sections.map(section => ReportSection.fromJSON(section));
    report._metadata = reportData.metadata || {};
    report._generatedContent = reportData.generatedContent || '';
    report._generatedAt = reportData.generatedAt ? new Date(reportData.generatedAt) : null;
    report._generatedBy = reportData.generatedBy;
    report._templateId = reportData.templateId;
    report._tags = reportData.tags || [];
    report._permissions = reportData.permissions || {
      canView: [],
      canEdit: [],
      canDelete: []
    };
    report._createdAt = new Date(reportData.createdAt);
    report._updatedAt = new Date(reportData.updatedAt);

    return report;
  }

  /**
   * 清空所有数据
   */
  async clear() {
    try {
      await this.storage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('清空报告数据失败:', error);
      throw new Error('清空报告数据失败');
    }
  }
}

export default ReportRepository;
