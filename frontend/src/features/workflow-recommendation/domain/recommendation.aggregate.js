import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base.js';
import { RecommendationId } from './value-objects/recommendation-id.vo.js';
import { RecommendationType } from './value-objects/recommendation-type.vo.js';
import { RecommendationConfidence } from './value-objects/recommendation-confidence.vo.js';
import { RecommendationGeneratedEvent } from './events/recommendation-generated.event.js';

/**
 * 推荐项实体
 */
export class RecommendationItem {
  constructor(id, title, description, priority, estimatedImpact, implementationEffort) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.priority = priority; // 'high', 'medium', 'low'
    this.estimatedImpact = estimatedImpact; // 预期影响
    this.implementationEffort = implementationEffort; // 实施工作量
    this.isImplemented = false;
    this.implementedAt = null;
    this.feedback = null;
  }

  implement() {
    this.isImplemented = true;
    this.implementedAt = new Date();
  }

  addFeedback(feedback) {
    this.feedback = {
      text: feedback,
      timestamp: new Date()
    };
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      priority: this.priority,
      estimatedImpact: this.estimatedImpact,
      implementationEffort: this.implementationEffort,
      isImplemented: this.isImplemented,
      implementedAt: this.implementedAt,
      feedback: this.feedback
    };
  }

  static fromJSON(json) {
    const item = new RecommendationItem(
      json.id,
      json.title,
      json.description,
      json.priority,
      json.estimatedImpact,
      json.implementationEffort
    );
    item.isImplemented = json.isImplemented;
    item.implementedAt = json.implementedAt ? new Date(json.implementedAt) : null;
    item.feedback = json.feedback;
    return item;
  }
}

/**
 * 工作流推荐聚合根
 */
export class WorkflowRecommendation extends AggregateRoot {
  constructor(id) {
    super();
    this.id = id || RecommendationId.generate();
    this.projectId = null;
    this.type = null;
    this.title = '';
    this.description = '';
    this.confidence = null;
    this.reason = '';
    this.items = [];
    this.context = {}; // 推荐上下文信息
    this.status = 'pending'; // 'pending', 'accepted', 'rejected', 'partially-implemented'
    this.generatedBy = null;
    this.generatedAt = new Date();
    this.expiresAt = null;
    this.implementationProgress = 0;
    this.metadata = {};
  }

  /**
   * 生成推荐
   */
  static generate(params) {
    const recommendation = new WorkflowRecommendation(params.id);
    recommendation.projectId = params.projectId;
    recommendation.type = RecommendationType.create(params.type);
    recommendation.title = params.title;
    recommendation.description = params.description;
    recommendation.confidence = RecommendationConfidence.create(params.confidence);
    recommendation.reason = params.reason;
    recommendation.generatedBy = params.generatedBy;
    recommendation.context = params.context || {};
    recommendation.items = params.items.map(
      item =>
        new RecommendationItem(
          item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          item.title,
          item.description,
          item.priority,
          item.estimatedImpact,
          item.implementationEffort
        )
    );

    // 设置过期时间（默认30天）
    recommendation.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // 添加生成事件
    recommendation.addEvent(
      new RecommendationGeneratedEvent({
        recommendationId: recommendation.id.value,
        projectId: recommendation.projectId,
        type: recommendation.type.value,
        confidence: recommendation.confidence.value,
        reason: recommendation.reason,
        generatedBy: recommendation.generatedBy
      })
    );

    return recommendation;
  }

  /**
   * 接受推荐
   */
  accept() {
    if (this.status !== 'pending') {
      throw new Error('推荐已被处理');
    }
    this.status = 'accepted';
    this.updatedAt = new Date();
  }

  /**
   * 拒绝推荐
   */
  reject(reason) {
    if (this.status !== 'pending') {
      throw new Error('推荐已被处理');
    }
    this.status = 'rejected';
    this.metadata.rejectionReason = reason;
    this.updatedAt = new Date();
  }

  /**
   * 实施推荐项
   */
  implementItem(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error('推荐项不存在');
    }

    item.implement();
    this.updateImplementationProgress();
    this.updatedAt = new Date();

    // 如果所有项都已实施，更新状态
    if (this.implementationProgress === 100) {
      this.status = 'implemented';
    } else if (this.implementationProgress > 0) {
      this.status = 'partially-implemented';
    }
  }

  /**
   * 添加推荐项反馈
   */
  addItemFeedback(itemId, feedback) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) {
      throw new Error('推荐项不存在');
    }

    item.addFeedback(feedback);
    this.updatedAt = new Date();
  }

  /**
   * 更新实施进度
   */
  updateImplementationProgress() {
    if (this.items.length === 0) {
      this.implementationProgress = 0;
      return;
    }

    const implementedCount = this.items.filter(item => item.isImplemented).length;
    this.implementationProgress = Math.round((implementedCount / this.items.length) * 100);
  }

  /**
   * 检查是否过期
   */
  isExpired() {
    return this.expiresAt && new Date() > this.expiresAt;
  }

  /**
   * 获取优先级排序的推荐项
   */
  getPrioritizedItems() {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return [...this.items].sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  /**
   * 获取实施统计
   */
  getImplementationStats() {
    const total = this.items.length;
    const implemented = this.items.filter(item => item.isImplemented).length;
    const highPriority = this.items.filter(item => item.priority === 'high').length;
    const highPriorityImplemented = this.items.filter(
      item => item.priority === 'high' && item.isImplemented
    ).length;

    return {
      total,
      implemented,
      pending: total - implemented,
      implementationRate: total > 0 ? Math.round((implemented / total) * 100) : 0,
      highPriorityTotal: highPriority,
      highPriorityImplemented,
      highPriorityRate:
        highPriority > 0 ? Math.round((highPriorityImplemented / highPriority) * 100) : 0
    };
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      id: this.id.value,
      projectId: this.projectId,
      type: this.type.value,
      title: this.title,
      description: this.description,
      confidence: this.confidence.value,
      confidenceLevel: this.confidence.getLevel(),
      confidenceDisplay: this.confidence.toString(),
      reason: this.reason,
      items: this.items.map(item => item.toJSON()),
      context: this.context,
      status: this.status,
      generatedBy: this.generatedBy,
      generatedAt: this.generatedAt,
      expiresAt: this.expiresAt,
      isExpired: this.isExpired(),
      implementationProgress: this.implementationProgress,
      implementationStats: this.getImplementationStats(),
      metadata: this.metadata
    };
  }

  /**
   * 从JSON恢复
   */
  static fromJSON(json) {
    const recommendation = new WorkflowRecommendation(RecommendationId.create(json.id));
    recommendation.projectId = json.projectId;
    recommendation.type = RecommendationType.create(json.type);
    recommendation.title = json.title;
    recommendation.description = json.description;
    recommendation.confidence = RecommendationConfidence.create(json.confidence);
    recommendation.reason = json.reason;
    recommendation.items = json.items.map(item => RecommendationItem.fromJSON(item));
    recommendation.context = json.context || {};
    recommendation.status = json.status;
    recommendation.generatedBy = json.generatedBy;
    recommendation.generatedAt = new Date(json.generatedAt);
    recommendation.expiresAt = json.expiresAt ? new Date(json.expiresAt) : null;
    recommendation.implementationProgress = json.implementationProgress || 0;
    recommendation.metadata = json.metadata || {};

    return recommendation;
  }
}

/**
 * 工作流推荐工厂
 */
export class WorkflowRecommendationFactory {
  static createFromAnalysis(projectId, analysis, generatedBy) {
    const type = this.determineRecommendationType(analysis);
    const items = this.generateRecommendationItems(analysis);
    const confidence = this.calculateConfidence(analysis);

    return WorkflowRecommendation.generate({
      projectId: projectId,
      type: type,
      title: this.generateTitle(type, analysis),
      description: this.generateDescription(type, analysis),
      confidence: confidence,
      reason: this.generateReason(analysis),
      items: items,
      context: {
        analysisType: analysis.type,
        projectPhase: analysis.projectPhase,
        keyMetrics: analysis.keyMetrics
      },
      generatedBy: generatedBy
    });
  }

  static determineRecommendationType(analysis) {
    // 根据分析结果确定推荐类型
    if (analysis.type === 'workflow_optimization') {
      return RecommendationType.WORKFLOW;
    } else if (analysis.type === 'efficiency_analysis') {
      return RecommendationType.PROCESS;
    } else if (analysis.type === 'tool_evaluation') {
      return RecommendationType.TOOL;
    } else if (analysis.type === 'strategy_planning') {
      return RecommendationType.STRATEGY;
    } else {
      return RecommendationType.CUSTOM;
    }
  }

  static generateRecommendationItems(analysis) {
    // 根据分析结果生成具体的推荐项
    // 这里简化实现，实际应该基于复杂的业务逻辑
    return [
      {
        title: '优化建议1',
        description: '基于分析结果的具体优化建议',
        priority: 'high',
        estimatedImpact: '可提升30%效率',
        implementationEffort: '中等'
      },
      {
        title: '优化建议2',
        description: '另一个重要的优化建议',
        priority: 'medium',
        estimatedImpact: '可提升20%效率',
        implementationEffort: '低'
      }
    ];
  }

  static calculateConfidence(analysis) {
    // 基于分析质量计算置信度
    // 简化实现，实际应该考虑更多因素
    const dataQuality = analysis.dataQuality || 0.8;
    const modelAccuracy = analysis.modelAccuracy || 0.85;
    return Math.min(0.95, (dataQuality + modelAccuracy) / 2);
  }

  static generateTitle(type, analysis) {
    const titles = {
      [RecommendationType.WORKFLOW]: '工作流优化建议',
      [RecommendationType.PROCESS]: '流程改进方案',
      [RecommendationType.TOOL]: '工具推荐方案',
      [RecommendationType.STRATEGY]: '策略优化建议'
    };
    return titles[type] || '优化建议';
  }

  static generateDescription(type, analysis) {
    return `基于${analysis.type}分析结果，为您提供个性化的${type.getDisplayName()}`;
  }

  static generateReason(analysis) {
    return `通过分析${analysis.dataPoints}个数据点，发现${analysis.issues}个优化机会`;
  }

  static fromJSON(json) {
    return WorkflowRecommendation.fromJSON(json);
  }
}
