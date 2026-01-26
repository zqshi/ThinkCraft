import {
  WorkflowRecommendation,
  WorkflowRecommendationFactory
} from '../domain/recommendation.aggregate.js';
import { RecommendationType } from '../domain/value-objects/recommendation-type.vo.js';

/**
 * 工作流推荐用例服务
 */
export class RecommendationUseCase {
  constructor(recommendationRepository, recommendationApiService, eventBus) {
    this.recommendationRepository = recommendationRepository;
    this.recommendationApiService = recommendationApiService;
    this.eventBus = eventBus;
  }

  /**
   * 生成工作流推荐
   */
  async generateRecommendation({ projectId, type, analysis, generatedBy }) {
    try {
      // 基于分析结果创建推荐
      const recommendation = WorkflowRecommendationFactory.createFromAnalysis(
        projectId,
        analysis,
        generatedBy
      );

      // 保存到仓库
      await this.recommendationRepository.save(recommendation);

      // 发布领域事件
      this.eventBus.publishAll(recommendation.getDomainEvents());

      return {
        success: true,
        data: recommendation.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取推荐详情
   */
  async getRecommendation(recommendationId) {
    try {
      const recommendation = await this.recommendationRepository.findById(recommendationId);
      if (!recommendation) {
        throw new Error('推荐不存在');
      }

      return {
        success: true,
        data: recommendation.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取项目的推荐列表
   */
  async getProjectRecommendations(projectId, filters = {}) {
    try {
      const result = await this.recommendationRepository.findByProjectId(projectId, filters);

      return {
        success: true,
        data: {
          recommendations: result.items.map(item => item.toJSON()),
          total: result.total,
          stats: this.calculateStats(result.items)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 接受推荐
   */
  async acceptRecommendation(recommendationId) {
    try {
      const recommendation = await this.recommendationRepository.findById(recommendationId);
      if (!recommendation) {
        throw new Error('推荐不存在');
      }

      recommendation.accept();

      await this.recommendationRepository.save(recommendation);

      return {
        success: true,
        data: recommendation.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 拒绝推荐
   */
  async rejectRecommendation(recommendationId, reason) {
    try {
      const recommendation = await this.recommendationRepository.findById(recommendationId);
      if (!recommendation) {
        throw new Error('推荐不存在');
      }

      recommendation.reject(reason);

      await this.recommendationRepository.save(recommendation);

      return {
        success: true,
        data: recommendation.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 实施推荐项
   */
  async implementRecommendationItem(recommendationId, itemId) {
    try {
      const recommendation = await this.recommendationRepository.findById(recommendationId);
      if (!recommendation) {
        throw new Error('推荐不存在');
      }

      recommendation.implementItem(itemId);

      await this.recommendationRepository.save(recommendation);

      return {
        success: true,
        data: recommendation.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 添加推荐项反馈
   */
  async addRecommendationFeedback(recommendationId, itemId, feedback) {
    try {
      const recommendation = await this.recommendationRepository.findById(recommendationId);
      if (!recommendation) {
        throw new Error('推荐不存在');
      }

      recommendation.addItemFeedback(itemId, feedback);

      await this.recommendationRepository.save(recommendation);

      return {
        success: true,
        data: recommendation.toJSON()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 批量分析并生成推荐
   */
  async batchGenerateRecommendations(projectIds, analysisType, generatedBy) {
    try {
      const results = [];

      for (const projectId of projectIds) {
        // 获取项目分析数据
        const analysis = await this.recommendationApiService.analyzeProject(
          projectId,
          analysisType
        );

        // 生成推荐
        const result = await this.generateRecommendation({
          projectId,
          type: analysis.recommendationType,
          analysis,
          generatedBy
        });

        results.push({
          projectId,
          success: result.success,
          data: result.data,
          error: result.error
        });
      }

      return {
        success: true,
        data: {
          results,
          total: results.length,
          successful: results.filter(r => r.success).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取推荐统计
   */
  async getRecommendationStats(projectId) {
    try {
      const stats = await this.recommendationRepository.getStats(projectId);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 清理过期推荐
   */
  async cleanupExpiredRecommendations() {
    try {
      const expiredRecommendations = await this.recommendationRepository.findExpired();
      const deletedCount = expiredRecommendations.length;

      for (const recommendation of expiredRecommendations) {
        await this.recommendationRepository.delete(recommendation.id.value);
      }

      return {
        success: true,
        data: {
          deletedCount,
          message: `已清理 ${deletedCount} 个过期推荐`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 计算推荐统计
   */
  calculateStats(recommendations) {
    const total = recommendations.length;
    const accepted = recommendations.filter(r => r.status === 'accepted').length;
    const rejected = recommendations.filter(r => r.status === 'rejected').length;
    const implemented = recommendations.filter(r => r.implementationProgress === 100).length;

    const avgConfidence =
      recommendations.reduce((sum, r) => {
        return sum + (r.confidence?.value || r.confidence || 0);
      }, 0) / total;

    return {
      total,
      accepted,
      rejected,
      pending: total - accepted - rejected,
      implemented,
      implementationRate: total > 0 ? Math.round((implemented / total) * 100) : 0,
      acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      averageConfidence: Math.round(avgConfidence * 100)
    };
  }

  /**
   * 获取AI分析建议
   */
  async getAIAnalysisSuggestions(projectId) {
    try {
      // 获取项目数据
      const projectData = await this.recommendationApiService.getProjectData(projectId);

      // 调用AI服务进行分析
      const suggestions = await this.recommendationApiService.getAISuggestions(projectData);

      return {
        success: true,
        data: suggestions
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
