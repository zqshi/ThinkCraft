import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';
import { getCostStats } from '../../../config/deepseek.js';

export class BusinessPlanUseCases {
  constructor({ businessPlanGenerationService, eventBus }) {
    this.businessPlanGenerationService = businessPlanGenerationService;
    this.eventBus = eventBus;
  }

  async generateChapter({ chapterId, conversationHistory }) {
    const validation = this.businessPlanGenerationService.validateGenerationParams(
      chapterId,
      conversationHistory
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      };
    }

    const result = await this.businessPlanGenerationService.generateChapter(
      chapterId,
      conversationHistory
    );

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.BUSINESS_PLAN_GENERATED, {
      chapterId,
      tokens: result.tokens
    }));

    return {
      success: true,
      data: result
    };
  }

  async generateBatch({ chapterIds, conversationHistory }) {
    if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
      return {
        success: false,
        error: '缺少或无效的章节ID列表'
      };
    }

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return {
        success: false,
        error: '缺少或无效的对话历史'
      };
    }

    const result = await this.businessPlanGenerationService.generateBatchChapters(
      chapterIds,
      conversationHistory
    );

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.BUSINESS_PLAN_GENERATED, {
      chapterIds,
      totalTokens: result.totalTokens
    }));

    return {
      success: true,
      data: result
    };
  }

  getChapters() {
    return this.businessPlanGenerationService.getAvailableChapters();
  }

  getChapterInfo({ chapterId }) {
    return this.businessPlanGenerationService.getChapterInfo(chapterId);
  }

  estimateCost({ chapterIds }) {
    if (!chapterIds || !Array.isArray(chapterIds)) {
      return {
        success: false,
        error: '缺少或无效的章节ID列表'
      };
    }

    return {
      success: true,
      data: this.businessPlanGenerationService.estimateGenerationCost(chapterIds)
    };
  }

  getCostStats() {
    return getCostStats();
  }
}

export default BusinessPlanUseCases;
