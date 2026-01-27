/**
 * 视觉任务DTO映射器
 * 处理领域模型与DTO之间的转换
 */
export class VisionMapper {
  /**
   * 将领域模型转换为DTO
   */
  toDTO(visionTask) {
    return {
      id: visionTask.id.value,
      taskType: visionTask.taskType.value,
      taskTypeDisplay: visionTask.taskType.getDisplayName(),
      image: {
        url: visionTask.image.url,
        size: visionTask.image.size,
        format: visionTask.image.format,
        width: visionTask.image.width,
        height: visionTask.image.height
      },
      prompt: visionTask.prompt?.value,
      status: visionTask.status.value,
      statusDisplay: this.getStatusDisplay(visionTask.status.value),
      result: visionTask.result?.toJSON(),
      confidence: visionTask.confidence,
      confidenceDisplay: visionTask.getConfidenceDisplay(),
      processingTime: visionTask.processingTime,
      processingTimeDisplay: visionTask.getProcessingTimeDisplay(),
      createdBy: visionTask.createdBy?.value,
      startedAt: visionTask.startedAt,
      completedAt: visionTask.completedAt,
      createdAt: visionTask.createdAt,
      updatedAt: visionTask.updatedAt,
      metadata: visionTask.metadata,
      isPending: visionTask.isPending,
      isProcessing: visionTask.isProcessing,
      isCompleted: visionTask.isCompleted,
      isFailed: visionTask.isFailed
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
      taskType: createDto.taskType,
      imageData: createDto.imageData,
      prompt: createDto.prompt,
      createdBy: createDto.createdBy
    };
  }

  /**
   * 获取状态显示文本
   */
  getStatusDisplay(status) {
    const statusMap = {
      PENDING: '待处理',
      PROCESSING: '处理中',
      COMPLETED: '已完成',
      FAILED: '失败'
    };
    return statusMap[status] || status;
  }

  /**
   * 将列表转换为DTO
   */
  toDTOList(visionTasks) {
    return visionTasks.map(task => this.toDTO(task));
  }

  /**
   * 创建精简DTO（用于列表显示）
   */
  toMinimalDTO(visionTask) {
    return {
      id: visionTask.id.value,
      taskType: visionTask.taskType.value,
      taskTypeDisplay: visionTask.taskType.getDisplayName(),
      imageUrl: visionTask.image.url,
      imageFormat: visionTask.image.format,
      status: visionTask.status.value,
      statusDisplay: this.getStatusDisplay(visionTask.status.value),
      confidence: visionTask.confidence,
      confidenceDisplay: visionTask.getConfidenceDisplay(),
      processingTime: visionTask.processingTime,
      processingTimeDisplay: visionTask.getProcessingTimeDisplay(),
      createdAt: visionTask.createdAt,
      completedAt: visionTask.completedAt,
      isCompleted: visionTask.isCompleted,
      isFailed: visionTask.isFailed
    };
  }

  /**
   * 创建结果DTO
   */
  toResultDTO(visionTask) {
    if (!visionTask.result) {
      return null;
    }

    return {
      taskId: visionTask.id.value,
      taskType: visionTask.taskType.value,
      result: visionTask.result.toJSON(),
      confidence: visionTask.confidence,
      confidenceDisplay: visionTask.getConfidenceDisplay(),
      processingTime: visionTask.processingTime,
      processingTimeDisplay: visionTask.getProcessingTimeDisplay(),
      completedAt: visionTask.completedAt
    };
  }

  /**
   * 创建进度DTO
   */
  toProgressDTO(visionTask) {
    return {
      taskId: visionTask.id.value,
      status: visionTask.status.value,
      statusDisplay: this.getStatusDisplay(visionTask.status.value),
      isPending: visionTask.isPending,
      isProcessing: visionTask.isProcessing,
      isCompleted: visionTask.isCompleted,
      isFailed: visionTask.isFailed,
      startedAt: visionTask.startedAt,
      completedAt: visionTask.completedAt,
      processingTime: visionTask.processingTime,
      processingTimeDisplay: visionTask.getProcessingTimeDisplay()
    };
  }

  /**
   * 创建图片信息DTO
   */
  toImageDTO(visionImage) {
    return {
      url: visionImage.url,
      size: visionImage.size,
      format: visionImage.format,
      width: visionImage.width,
      height: visionImage.height,
      sizeDisplay: this.formatFileSize(visionImage.size),
      dimensionsDisplay: `${visionImage.width}x${visionImage.height}`
    };
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

export default VisionMapper;
