/**
 * PDF导出DTO映射器
 * 处理领域模型与DTO之间的转换
 */

export class PdfExportMapper {
  /**
   * 将领域模型转换为DTO
   */
  toDTO(pdfExport) {
    return {
      id: pdfExport.id.value,
      title: pdfExport.title.value,
      projectId: pdfExport.projectId,
      format: pdfExport.format.value,
      formatDisplay: pdfExport.format.getDisplayName(),
      fileExtension: pdfExport.format.getFileExtension(),
      supportsPagination: pdfExport.format.supportsPagination(),
      supportsStyling: pdfExport.format.supportsStyling(),
      status: pdfExport.status.value,
      statusDisplay: pdfExport.status.getDisplayText(),
      statusColor: pdfExport.status.getStatusColor(),
      content: pdfExport.content?.value,
      contentSummary: pdfExport.content?.getSummary(100),
      wordCount: pdfExport.content?.getWordCount() || 0,
      charCount: pdfExport.content?.getCharCount() || 0,
      paragraphCount: pdfExport.content?.getParagraphCount() || 0,
      options: pdfExport.options?.toJSON() || {},
      pageDimensions: pdfExport.options?.getPageDimensions() || {},
      contentArea: pdfExport.options
        ? {
          width: pdfExport.options.getContentWidth(),
          height: pdfExport.options.getContentHeight()
        }
        : {},
      isPasswordProtected: pdfExport.options?.isPasswordProtected() || false,
      requestedBy: pdfExport.requestedBy?.value,
      fileUrl: pdfExport.fileUrl,
      fileSize: pdfExport.fileSize,
      fileSizeDisplay: pdfExport.getFileSizeDisplay(),
      pageCount: pdfExport.pageCount,
      metadata: pdfExport.metadata,
      createdAt: pdfExport.createdAt,
      updatedAt: pdfExport.updatedAt,
      canProcess: pdfExport.status.canProcess(),
      canUpdate: pdfExport.status.canUpdate(),
      isPending: pdfExport.status.isPending(),
      isProcessing: pdfExport.status.isProcessing(),
      isCompleted: pdfExport.status.isCompleted(),
      isFailed: pdfExport.status.isFailed()
    };
  }

  /**
   * 将DTO转换为领域模型
   */
  toDomain(dto) {
    // 这个方法通常在从后端获取数据后使用
    // 实际实现会根据后端返回的数据结构进行调整
    return dto;
  }

  /**
   * 创建用例的DTO转换为领域模型参数
   */
  toCreateDomain(createDto) {
    return {
      title: createDto.title,
      projectId: createDto.projectId,
      format: createDto.format,
      content: createDto.content,
      options: createDto.options,
      requestedBy: createDto.requestedBy
    };
  }

  /**
   * 将列表转换为DTO
   */
  toDTOList(exports) {
    return exports.map(exp => this.toDTO(exp));
  }

  /**
   * 创建精简DTO（用于列表显示）
   */
  toMinimalDTO(pdfExport) {
    return {
      id: pdfExport.id.value,
      title: pdfExport.title.value,
      projectId: pdfExport.projectId,
      format: pdfExport.format.value,
      formatDisplay: pdfExport.format.getDisplayName(),
      status: pdfExport.status.value,
      statusDisplay: pdfExport.status.getDisplayText(),
      statusColor: pdfExport.status.getStatusColor(),
      wordCount: pdfExport.content?.getWordCount() || 0,
      pageCount: pdfExport.pageCount,
      fileSize: pdfExport.fileSize,
      fileSizeDisplay: pdfExport.getFileSizeDisplay(),
      requestedBy: pdfExport.requestedBy?.value,
      createdAt: pdfExport.createdAt,
      isCompleted: pdfExport.status.isCompleted()
    };
  }

  /**
   * 创建进度DTO
   */
  toProgressDTO(exportEntity) {
    const progress = this.calculateProgress(exportEntity);

    return {
      exportId: exportEntity.id.value,
      status: exportEntity.status.value,
      statusDisplay: exportEntity.status.getDisplayText(),
      progress: progress,
      currentStep: this.getCurrentStep(exportEntity),
      estimatedTime: this.estimateTimeRemaining(exportEntity),
      isProcessing: exportEntity.status.isProcessing()
    };
  }

  /**
   * 计算进度
   */
  calculateProgress(exportEntity) {
    if (exportEntity.status.isCompleted()) {
      return 100;
    } else if (exportEntity.status.isFailed()) {
      return 0;
    } else if (exportEntity.status.isProcessing()) {
      // 模拟处理进度
      const startTime = new Date(exportEntity.createdAt).getTime();
      const currentTime = new Date().getTime();
      const elapsed = currentTime - startTime;
      const estimatedDuration = 30000; // 估计30秒完成

      return Math.min(90, Math.round((elapsed / estimatedDuration) * 100));
    }
    return 0;
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep(exportEntity) {
    if (exportEntity.status.isPending()) {
      return '等待处理';
    } else if (exportEntity.status.isProcessing()) {
      // 可以基于实际处理阶段返回更详细的信息
      return '正在生成文档';
    } else if (exportEntity.status.isCompleted()) {
      return '导出完成';
    } else if (exportEntity.status.isFailed()) {
      return '导出失败';
    }
    return '未知状态';
  }

  /**
   * 估计剩余时间
   */
  estimateTimeRemaining(exportEntity) {
    if (exportEntity.status.isCompleted() || exportEntity.status.isFailed()) {
      return 0;
    }

    if (exportEntity.status.isProcessing()) {
      const progress = this.calculateProgress(exportEntity);
      if (progress > 0) {
        const elapsed = new Date() - new Date(exportEntity.createdAt);
        const totalEstimated = elapsed / (progress / 100);
        const remaining = totalEstimated - elapsed;
        return Math.max(0, Math.round(remaining / 1000)); // 返回秒数
      }
    }

    return null; // 未知
  }

  /**
   * 创建选项DTO
   */
  toOptionsDTO(options) {
    if (!options) {
      return null;
    }

    return {
      ...options.toJSON(),
      pageDimensions: options.getPageDimensions(),
      contentWidth: options.getContentWidth(),
      contentHeight: options.getContentHeight(),
      totalHorizontalMargin: options.getTotalHorizontalMargin(),
      totalVerticalMargin: options.getTotalVerticalMargin(),
      isPasswordProtected: options.isPasswordProtected()
    };
  }

  /**
   * 创建统计DTO
   */
  toStatsDTO(stats) {
    return {
      totalExports: stats.totalExports || 0,
      completedExports: stats.completedExports || 0,
      failedExports: stats.failedExports || 0,
      processingExports: stats.processingExports || 0,
      pendingExports: stats.pendingExports || 0,
      totalFileSize: stats.totalFileSize || 0,
      totalPageCount: stats.totalPageCount || 0,
      averageFileSize: stats.averageFileSize || 0,
      averagePageCount: stats.averagePageCount || 0,
      formatStats: stats.formatStats || {},
      monthlyStats: stats.monthlyStats || []
    };
  }

  /**
   * 创建模板DTO
   */
  toTemplateDTO(template) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      format: template.format,
      options: template.options,
      previewImage: template.previewImage,
      isDefault: template.isDefault || false
    };
  }

  /**
   * 创建预览DTO
   */
  toPreviewDTO(preview) {
    return {
      html: preview.html,
      css: preview.css,
      totalPages: preview.totalPages || 1,
      warnings: preview.warnings || [],
      errors: preview.errors || []
    };
  }
}

export default PdfExportMapper;
