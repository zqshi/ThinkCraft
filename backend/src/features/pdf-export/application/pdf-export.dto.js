/**
 * PDF Export DTOs
 */

/**
 * 创建导出请求DTO
 */
export class CreateExportRequestDto {
  constructor({ projectId, format, title, content, options }) {
    this.projectId = projectId;
    this.format = format;
    this.title = title;
    this.content = content;
    this.options = options || {};
  }

  validate() {
    if (!this.projectId) {
      throw new Error('Project ID is required');
    }

    if (!this.format) {
      throw new Error('Export format is required');
    }

    if (!this.title) {
      throw new Error('Title is required');
    }

    if (!this.content) {
      throw new Error('Content is required');
    }
  }
}

/**
 * 导出响应DTO
 */
export class ExportResponseDto {
  constructor({
    id,
    projectId,
    format,
    status,
    title,
    filePath,
    fileSize,
    createdAt,
    completedAt,
    downloadUrl
  }) {
    this.id = id;
    this.projectId = projectId;
    this.format = format;
    this.status = status;
    this.title = title;
    this.filePath = filePath;
    this.fileSize = fileSize;
    this.createdAt = createdAt;
    this.completedAt = completedAt;
    this.downloadUrl = downloadUrl;
  }

  static fromAggregate(exportEntity) {
    return new ExportResponseDto({
      id: exportEntity.id.value,
      projectId: exportEntity.projectId,
      format: exportEntity.format.value,
      status: exportEntity.status.value,
      title: exportEntity.title,
      filePath: exportEntity.filePath,
      fileSize: exportEntity.fileSize,
      createdAt: exportEntity.createdAt,
      completedAt: exportEntity.completedAt,
      downloadUrl: exportEntity.getDownloadUrl()
    });
  }
}

/**
 * 导出内容DTO
 */
export class ExportContentDto {
  constructor({ sections, metadata }) {
    this.sections = sections || [];
    this.metadata = metadata || {};
  }

  validate() {
    if (!Array.isArray(this.sections)) {
      throw new Error('Sections must be an array');
    }

    this.sections.forEach((section, index) => {
      if (!section.title || !section.content) {
        throw new Error(`Section at index ${index} must have title and content`);
      }
    });
  }

  toHtml() {
    let html = '<html><head><meta charset="UTF-8"><title>Export</title></head><body>';

    this.sections.forEach(section => {
      html += `<h1>${section.title}</h1>`;
      html += `<div>${section.content}</div>`;
    });

    html += '</body></html>';
    return html;
  }

  toMarkdown() {
    return this.sections
      .map(section => {
        return `# ${section.title}\n\n${section.content}\n\n`;
      })
      .join('\n');
  }
}
