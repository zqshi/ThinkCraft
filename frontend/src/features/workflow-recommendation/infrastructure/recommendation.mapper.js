/**
 * 工作流推荐DTO映射器
 * 处理领域模型与DTO之间的转换
 */
export class RecommendationMapper {
  /**
   * 将领域模型转换为DTO
   */
  toDTO(recommendation) {
    return {
      id: recommendation.id.value,
      projectId: recommendation.projectId,
      type: recommendation.type.value,
      typeDisplay: recommendation.type.getDisplayName(),
      title: recommendation.title,
      description: recommendation.description,
      confidence: recommendation.confidence.value,
      confidenceLevel: recommendation.confidence.getLevel(),
      confidenceDisplay: recommendation.confidence.toString(),
      confidenceLevelDisplay: this.getConfidenceLevelDisplay(recommendation.confidence.getLevel()),
      reason: recommendation.reason,
      items: recommendation.items.map(item => this.toItemDTO(item)),
      prioritizedItems: recommendation.getPrioritizedItems().map(item => this.toItemDTO(item)),
      context: recommendation.context,
      status: recommendation.status,
      statusDisplay: this.getStatusDisplay(recommendation.status),
      generatedBy: recommendation.generatedBy,
      generatedAt: recommendation.generatedAt,
      expiresAt: recommendation.expiresAt,
      isExpired: recommendation.isExpired(),
      implementationProgress: recommendation.implementationProgress,
      implementationProgressDisplay: `${recommendation.implementationProgress}%`,
      implementationStats: recommendation.getImplementationStats(),
      metadata: recommendation.metadata,
      isPending: recommendation.status === 'pending',
      isAccepted: recommendation.status === 'accepted',
      isRejected: recommendation.status === 'rejected',
      isPartiallyImplemented: recommendation.status === 'partially-implemented',
      isImplemented: recommendation.status === 'implemented'
    };
  }

  /**
   * 将推荐项转换为DTO
   */
  toItemDTO(item) {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      priority: item.priority,
      priorityDisplay: this.getPriorityDisplay(item.priority),
      estimatedImpact: item.estimatedImpact,
      implementationEffort: item.implementationEffort,
      implementationEffortDisplay: this.getEffortDisplay(item.implementationEffort),
      isImplemented: item.isImplemented,
      implementedAt: item.implementedAt,
      feedback: item.feedback
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
      projectId: createDto.projectId,
      type: createDto.type,
      title: createDto.title,
      description: createDto.description,
      confidence: createDto.confidence,
      reason: createDto.reason,
      items: createDto.items,
      context: createDto.context,
      generatedBy: createDto.generatedBy
    };
  }

  /**
   * 获取置信度级别显示文本
   */
  getConfidenceLevelDisplay(level) {
    const levelMap = {
      HIGH: '高',
      MEDIUM: '中',
      LOW: '低'
    };
    return levelMap[level] || level;
  }

  /**
   * 获取状态显示文本
   */
  getStatusDisplay(status) {
    const statusMap = {
      pending: '待处理',
      accepted: '已接受',
      rejected: '已拒绝',
      'partially-implemented': '部分实施',
      implemented: '已实施'
    };
    return statusMap[status] || status;
  }

  /**
   * 获取优先级显示文本
   */
  getPriorityDisplay(priority) {
    const priorityMap = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return priorityMap[priority] || priority;
  }

  /**
   * 获取工作量显示文本
   */
  getEffortDisplay(effort) {
    const effortMap = {
      低: '低',
      中等: '中',
      高: '高'
    };
    return effortMap[effort] || effort;
  }

  /**
   * 将列表转换为DTO
   */
  toDTOList(recommendations) {
    return recommendations.map(recommendation => this.toDTO(recommendation));
  }

  /**
   * 创建精简DTO（用于列表显示）
   */
  toMinimalDTO(recommendation) {
    return {
      id: recommendation.id.value,
      projectId: recommendation.projectId,
      type: recommendation.type.value,
      typeDisplay: recommendation.type.getDisplayName(),
      title: recommendation.title,
      description: recommendation.description,
      confidence: recommendation.confidence.value,
      confidenceLevel: recommendation.confidence.getLevel(),
      confidenceLevelDisplay: this.getConfidenceLevelDisplay(recommendation.confidence.getLevel()),
      status: recommendation.status,
      statusDisplay: this.getStatusDisplay(recommendation.status),
      itemsCount: recommendation.items.length,
      implementedItemsCount: recommendation.items.filter(item => item.isImplemented).length,
      implementationProgress: recommendation.implementationProgress,
      implementationProgressDisplay: `${recommendation.implementationProgress}%`,
      generatedAt: recommendation.generatedAt,
      expiresAt: recommendation.expiresAt,
      isExpired: recommendation.isExpired(),
      isPending: recommendation.status === 'pending'
    };
  }

  /**
   * 创建统计DTO
   */
  toStatsDTO(recommendation) {
    const stats = recommendation.getImplementationStats();
    return {
      recommendationId: recommendation.id.value,
      totalItems: stats.total,
      implementedItems: stats.implemented,
      pendingItems: stats.pending,
      implementationRate: stats.implementationRate,
      implementationRateDisplay: `${stats.implementationRate}%`,
      highPriorityTotal: stats.highPriorityTotal,
      highPriorityImplemented: stats.highPriorityImplemented,
      highPriorityRate: stats.highPriorityRate,
      highPriorityRateDisplay: `${stats.highPriorityRate}%`,
      status: recommendation.status,
      statusDisplay: this.getStatusDisplay(recommendation.status)
    };
  }

  /**
   * 创建优先级分组DTO
   */
  toPriorityGroupedDTO(recommendation) {
    const items = recommendation.items;
    return {
      recommendationId: recommendation.id.value,
      high: items.filter(item => item.priority === 'high').map(item => this.toItemDTO(item)),
      medium: items.filter(item => item.priority === 'medium').map(item => this.toItemDTO(item)),
      low: items.filter(item => item.priority === 'low').map(item => this.toItemDTO(item)),
      highCount: items.filter(item => item.priority === 'high').length,
      mediumCount: items.filter(item => item.priority === 'medium').length,
      lowCount: items.filter(item => item.priority === 'low').length
    };
  }

  /**
   * 创建实施进度DTO
   */
  toProgressDTO(recommendation) {
    return {
      recommendationId: recommendation.id.value,
      progress: recommendation.implementationProgress,
      progressDisplay: `${recommendation.implementationProgress}%`,
      status: recommendation.status,
      statusDisplay: this.getStatusDisplay(recommendation.status),
      totalItems: recommendation.items.length,
      implementedItems: recommendation.items.filter(item => item.isImplemented).length,
      pendingItems: recommendation.items.filter(item => !item.isImplemented).length,
      items: recommendation.items.map(item => ({
        id: item.id,
        title: item.title,
        priority: item.priority,
        isImplemented: item.isImplemented,
        implementedAt: item.implementedAt
      }))
    };
  }
}

export default RecommendationMapper;
