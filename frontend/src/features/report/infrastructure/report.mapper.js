/**
 * 报告映射器
 * 负责领域对象与DTO之间的转换
 */
import { ReportId } from '../domain/value-objects/report-id.vo.js';
import { ReportType } from '../domain/value-objects/report-type.vo.js';
import { ReportStatus } from '../domain/value-objects/report-status.vo.js';
import { ReportSection } from '../domain/value-objects/report-section.vo.js';
import { Report } from '../domain/entities/report.aggregate.js';

export class ReportMapper {
  /**
   * 领域对象转DTO
   */
  toDto(report) {
    if (!report) {
      return null;
    }

    return {
      id: report.id.value,
      projectId: report.projectId,
      type: report.type.value,
      typeDisplayName: report.type.getDisplayName(),
      typeIcon: report.type.getIcon(),
      title: report.title,
      description: report.description,
      status: report.status.value,
      statusDisplayName: report.status.getDisplayName(),
      statusColor: report.status.getStatusColor(),
      statusIcon: report.status.getStatusIcon(),
      sectionCount: report.sections.length,
      sections: report.sections.map(section => this.sectionToDto(section)),
      metadata: report.metadata,
      generatedContent: report.generatedContent,
      generatedAt: report.generatedAt,
      generatedBy: report.generatedBy,
      templateId: report.templateId,
      tags: report.tags,
      permissions: report.permissions,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      canEdit: report.status.canEdit(),
      canGenerate: report.status.canGenerate(),
      canPublish: report.status.canPublish(),
      canArchive: report.status.canArchive(),
      isDraft: report.isDraft(),
      isGenerated: report.isGenerated(),
      isPublished: report.isPublished(),
      isArchived: report.isArchived(),
      isRevision: report.isRevision()
    };
  }

  /**
   * DTO转领域对象
   */
  toDomain(dto) {
    if (!dto) {
      return null;
    }

    // 创建领域对象
    const reportId = new ReportId(dto.id);
    const report = new Report(reportId);

    // 设置属性
    report._projectId = dto.projectId;
    report._type = ReportType.fromString(dto.type);
    report._title = dto.title;
    report._description = dto.description || '';
    report._status = ReportStatus.fromString(dto.status);
    report._sections = dto.sections ? dto.sections.map(s => ReportSection.fromJSON(s)) : [];
    report._metadata = dto.metadata || {};
    report._generatedContent = dto.generatedContent || '';
    report._generatedAt = dto.generatedAt ? new Date(dto.generatedAt) : null;
    report._generatedBy = dto.generatedBy;
    report._templateId = dto.templateId;
    report._tags = dto.tags || [];
    report._permissions = dto.permissions || {
      canView: [],
      canEdit: [],
      canDelete: []
    };
    report._createdAt = new Date(dto.createdAt);
    report._updatedAt = new Date(dto.updatedAt);

    return report;
  }

  /**
   * 章节转DTO
   */
  sectionToDto(section) {
    if (!section) {
      return null;
    }

    return {
      id: section.id,
      title: section.title,
      content: section.content,
      type: section.type,
      order: section.order,
      metadata: section.metadata,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
      contentPreview: section.getPreview()
    };
  }

  /**
   * 创建报告DTO
   */
  createReportDto(data) {
    return {
      projectId: data.projectId || '',
      type: data.type || 'CUSTOM_REPORT',
      title: data.title || '',
      description: data.description || '',
      metadata: data.metadata || {},
      tags: data.tags || []
    };
  }

  /**
   * 创建章节DTO
   */
  createSectionDto(data) {
    return {
      title: data.title || '',
      content: data.content || '',
      type: data.type || 'text',
      order: data.order || 1,
      metadata: data.metadata || {}
    };
  }

  /**
   * 更新报告信息DTO
   */
  updateReportInfoDto(data) {
    return {
      title: data.title,
      description: data.description,
      metadata: data.metadata,
      tags: data.tags
    };
  }

  /**
   * 报告列表DTO
   */
  reportListDto(reports, total, summary = {}) {
    return {
      items: reports.map(r => this.toDto(r)),
      total: total,
      summary: {
        draft: reports.filter(r => r.isDraft()).length,
        generated: reports.filter(r => r.isGenerated()).length,
        published: reports.filter(r => r.isPublished()).length,
        archived: reports.filter(r => r.isArchived()).length,
        revision: reports.filter(r => r.isRevision()).length,
        ...summary
      }
    };
  }

  /**
   * 报告统计DTO
   */
  reportStatsDto(stats) {
    return {
      total: stats.total,
      byStatus: {
        draft: stats.draft,
        generated: stats.generated,
        published: stats.published,
        archived: stats.archived,
        revision: stats.revision
      },
      byType: stats.byType,
      totalSections: stats.totalSections,
      averageSections: stats.averageSections,
      details: stats.details || {}
    };
  }

  /**
   * 导出数据DTO
   */
  exportDataDto(exportData) {
    return {
      exportUrl: exportData.exportUrl,
      format: exportData.format,
      fileSize: exportData.fileSize,
      pageCount: exportData.pageCount,
      exportTime: exportData.exportTime
    };
  }

  /**
   * 分享数据DTO
   */
  shareDataDto(shareData) {
    return {
      shareId: shareData.shareId,
      shareUrl: shareData.shareUrl,
      expiresAt: shareData.expiresAt,
      accessCode: shareData.accessCode,
      permissions: shareData.permissions
    };
  }

  /**
   * 错误DTO
   */
  errorDto(error, reportId = null) {
    return {
      success: false,
      error: {
        message: error.message || '未知错误',
        code: error.code || 'UNKNOWN_ERROR',
        reportId: reportId
      }
    };
  }

  /**
   * 成功DTO
   */
  successDto(data, message = '操作成功') {
    return {
      success: true,
      message: message,
      data: data
    };
  }

  /**
   * 模板DTO
   */
  templateDto(template) {
    return {
      id: template.id,
      name: template.name,
      type: template.type,
      description: template.description,
      sections: template.sections,
      preview: template.preview,
      tags: template.tags
    };
  }
}

export default ReportMapper;
