/**
 * PDF导出映射器
 * 负责领域对象与DTO之间的转换
 */
import { ExportId } from '../domain/value-objects/export-id.vo.js';
import { ExportFormat } from '../domain/value-objects/export-format.vo.js';
import { ExportStatus } from '../domain/value-objects/export-status.vo.js';
import { ExportOptions } from '../domain/value-objects/export-options.vo.js';
import { PdfExport } from '../domain/entities/pdf-export.aggregate.js';

export class ExportMapper {
  /**
   * 领域对象转DTO
   */
  toDto(pdfExport) {
    if (!pdfExport) {
      return null;
    }

    return {
      id: pdfExport.id.value,
      projectId: pdfExport.projectId,
      title: pdfExport.title,
      format: pdfExport.format.value,
      formatDisplayName: pdfExport.format.getDisplayName(),
      status: pdfExport.status.value,
      statusDisplayText: pdfExport.status.getDisplayText(),
      statusColor: pdfExport.status.getStatusColor(),
      content: pdfExport.content,
      options: pdfExport.options.toJSON(),
      fileUrl: pdfExport.fileUrl,
      fileSize: pdfExport.fileSize,
      pageCount: pdfExport.pageCount,
      createdAt: pdfExport.createdAt,
      startedAt: pdfExport.startedAt,
      completedAt: pdfExport.completedAt,
      error: pdfExport.error,
      canProcess: pdfExport.status.canProcess(),
      canUpdate: pdfExport.status.canUpdate(),
      isCompleted: pdfExport.status.isCompleted(),
      isFailed: pdfExport.status.isFailed(),
      isProcessing: pdfExport.status.isProcessing(),
      isPending: pdfExport.status.isPending()
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
    const exportId = new ExportId(dto.id);
    const pdfExport = new PdfExport(exportId);

    // 设置属性
    pdfExport._projectId = dto.projectId;
    pdfExport._format = ExportFormat.fromString(dto.format);
    pdfExport._title = dto.title;
    pdfExport._content = dto.content;
    pdfExport._options = ExportOptions.fromJSON(dto.options);
    pdfExport._status = ExportStatus.fromString(dto.status);
    pdfExport._fileUrl = dto.fileUrl;
    pdfExport._fileSize = dto.fileSize;
    pdfExport._pageCount = dto.pageCount;
    pdfExport._createdAt = new Date(dto.createdAt);
    pdfExport._startedAt = dto.startedAt ? new Date(dto.startedAt) : null;
    pdfExport._completedAt = dto.completedAt ? new Date(dto.completedAt) : null;
    pdfExport._error = dto.error;

    return pdfExport;
  }

  /**
   * 创建导出DTO
   */
  createExportDto(data) {
    return {
      title: data.title || '',
      projectId: data.projectId || '',
      format: data.format || 'PDF',
      content: data.content || '',
      options: data.options || {},
      requestedBy: data.requestedBy || ''
    };
  }

  /**
   * 更新选项DTO
   */
  updateOptionsDto(data) {
    return {
      pageSize: data.pageSize,
      orientation: data.orientation,
      margin: data.margin,
      header: data.header,
      footer: data.footer,
      watermark: data.watermark,
      password: data.password,
      includeTableOfContents: data.includeTableOfContents,
      includePageNumbers: data.includePageNumbers,
      fontSize: data.fontSize,
      fontFamily: data.fontFamily,
      lineSpacing: data.lineSpacing,
      headerSpacing: data.headerSpacing,
      footerSpacing: data.footerSpacing,
      colorMode: data.colorMode,
      quality: data.quality
    };
  }

  /**
   * 批量导出DTO
   */
  batchExportDto(requests) {
    return requests.map(request => this.createExportDto(request));
  }

  /**
   * 导出列表DTO
   */
  exportListDto(exports, total) {
    return {
      items: exports.map(exp => this.toDto(exp)),
      total: total,
      summary: {
        completed: exports.filter(exp => exp.status.isCompleted()).length,
        processing: exports.filter(exp => exp.status.isProcessing()).length,
        pending: exports.filter(exp => exp.status.isPending()).length,
        failed: exports.filter(exp => exp.status.isFailed()).length
      }
    };
  }

  /**
   * 导出统计DTO
   */
  exportStatsDto(stats) {
    return {
      total: stats.total,
      byStatus: {
        pending: stats.pending,
        processing: stats.processing,
        completed: stats.completed,
        failed: stats.failed
      },
      byFormat: stats.byFormat,
      totalSize: stats.totalSize,
      averageSize: stats.total > 0 ? Math.round(stats.totalSize / stats.total) : 0
    };
  }

  /**
   * 下载信息DTO
   */
  downloadInfoDto(url, filename, fileSize) {
    return {
      url: url,
      filename: filename,
      fileSize: fileSize,
      contentType: this.getContentType(filename)
    };
  }

  /**
   * 获取内容类型
   */
  getContentType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    const contentTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      html: 'text/html',
      md: 'text/markdown'
    };
    return contentTypes[extension] || 'application/octet-stream';
  }

  /**
   * 错误DTO
   */
  errorDto(error, exportId = null) {
    return {
      success: false,
      error: {
        message: error.message || '未知错误',
        code: error.code || 'UNKNOWN_ERROR',
        exportId: exportId
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
}

export default ExportMapper;
