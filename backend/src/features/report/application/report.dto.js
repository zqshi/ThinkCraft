/**
 * Report DTOs
 */

/**
 * 创建报告请求DTO
 */
export class CreateReportRequestDto {
  constructor({ projectId, type, title, description, metadata }) {
    this.projectId = projectId;
    this.type = type;
    this.title = title;
    this.description = description;
    this.metadata = metadata || {};
  }

  validate() {
    if (!this.projectId) {
      throw new Error('Project ID is required');
    }

    if (!this.type) {
      throw new Error('Report type is required');
    }

    if (!this.title) {
      throw new Error('Title is required');
    }

    if (this.description && typeof this.description !== 'string') {
      throw new Error('Description must be a string');
    }

    if (this.metadata && typeof this.metadata !== 'object') {
      throw new Error('Metadata must be an object');
    }
  }
}

/**
 * 添加报告章节请求DTO
 */
export class AddReportSectionRequestDto {
  constructor({ title, content, type, order, metadata }) {
    this.title = title;
    this.content = content;
    this.type = type || 'text';
    this.order = order || 0;
    this.metadata = metadata || {};
  }

  validate() {
    if (!this.title) {
      throw new Error('Section title is required');
    }

    if (!this.content) {
      throw new Error('Section content is required');
    }

    if (typeof this.order !== 'number' || this.order < 0) {
      throw new Error('Section order must be a non-negative number');
    }

    if (this.metadata && typeof this.metadata !== 'object') {
      throw new Error('Metadata must be an object');
    }
  }
}

/**
 * 报告响应DTO
 */
export class ReportResponseDto {
  constructor({
    id,
    projectId,
    type,
    status,
    title,
    description,
    sections,
    metadata,
    createdAt,
    updatedAt,
    completedAt
  }) {
    this.id = id;
    this.projectId = projectId;
    this.type = type;
    this.status = status;
    this.title = title;
    this.description = description;
    this.sections = sections || [];
    this.metadata = metadata;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.completedAt = completedAt;
  }

  static fromAggregate(report) {
    return new ReportResponseDto({
      id: report.id.value,
      projectId: report.projectId,
      type: report.type.value,
      status: report.status.value,
      title: report.title,
      description: report.description,
      sections: report.sections.map(section => ({
        id: section.id,
        title: section.title,
        content: section.content,
        type: section.type,
        order: section.order,
        metadata: section.metadata
      })),
      metadata: report.metadata,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      completedAt: report.completedAt
    });
  }
}

/**
 * 报告列表项DTO
 */
export class ReportListItemDto {
  constructor({ id, projectId, type, status, title, createdAt, updatedAt, completedAt }) {
    this.id = id;
    this.projectId = projectId;
    this.type = type;
    this.status = status;
    this.title = title;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.completedAt = completedAt;
  }

  static fromAggregate(report) {
    return new ReportListItemDto({
      id: report.id.value,
      projectId: report.projectId,
      type: report.type.value,
      status: report.status.value,
      title: report.title,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      completedAt: report.completedAt
    });
  }
}

/**
 * 生成报告请求DTO
 */
export class GenerateReportRequestDto {
  constructor({ reportId, template, dataSource, options }) {
    this.reportId = reportId;
    this.template = template;
    this.dataSource = dataSource;
    this.options = options || {};
  }

  validate() {
    if (!this.reportId) {
      throw new Error('Report ID is required');
    }

    if (!this.dataSource) {
      throw new Error('Data source is required');
    }

    if (this.options && typeof this.options !== 'object') {
      throw new Error('Options must be an object');
    }
  }
}
