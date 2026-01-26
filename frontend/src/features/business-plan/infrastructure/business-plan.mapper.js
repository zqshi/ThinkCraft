/**
 * 商业计划书DTO映射器
 * 处理领域模型与DTO之间的转换
 */
import { ChapterType } from '../domain/value-objects/chapter-type.vo.js';

export class BusinessPlanMapper {
  /**
   * 将领域模型转换为DTO
   */
  toDTO(businessPlan) {
    const chapters = {};
    businessPlan.chapters.forEach((chapter, type) => {
      chapters[type] = {
        id: chapter.id.value,
        type: chapter.type.value,
        title: chapter.title.value,
        content: chapter.content.value,
        tokens: chapter.tokens,
        generatedAt: chapter.generatedAt,
        summary: chapter.content.getSummary(500),
        wordCount: chapter.content.getWordCount()
      };
    });

    return {
      id: businessPlan.id.value,
      title: businessPlan.title.value,
      projectId: businessPlan.projectId,
      status: businessPlan.status.value,
      statusDisplay: this.getStatusDisplay(businessPlan.status.value),
      chapters: chapters,
      chapterCount: businessPlan.chapterCount,
      generatedBy: businessPlan.generatedBy?.value,
      totalTokens: businessPlan.totalTokens,
      cost: businessPlan.cost,
      costDisplay: `¥${businessPlan.cost.toFixed(2)}`,
      completedAt: businessPlan.completedAt,
      createdAt: businessPlan.createdAt,
      updatedAt: businessPlan.updatedAt,
      metadata: businessPlan.metadata,
      canEdit: businessPlan.status.canEdit(),
      canGenerate: businessPlan.status.canGenerate(),
      isCompleted: businessPlan.status.isCompleted()
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
      generatedBy: createDto.generatedBy
    };
  }

  /**
   * 获取状态显示文本
   */
  getStatusDisplay(status) {
    const statusMap = {
      DRAFT: '草稿',
      GENERATING: '生成中',
      COMPLETED: '已完成',
      FAILED: '生成失败'
    };
    return statusMap[status] || status;
  }

  /**
   * 将列表转换为DTO
   */
  toDTOList(businessPlans) {
    return businessPlans.map(bp => this.toDTO(bp));
  }

  /**
   * 创建章节DTO
   */
  toChapterDTO(chapter) {
    return {
      id: chapter.id.value,
      type: chapter.type.value,
      typeDisplay: chapter.type.getDisplayName(),
      title: chapter.title.value,
      content: chapter.content.value,
      summary: chapter.content.getSummary(),
      wordCount: chapter.content.getWordCount(),
      tokens: chapter.tokens,
      generatedAt: chapter.generatedAt
    };
  }

  /**
   * 创建精简DTO（用于列表显示）
   */
  toMinimalDTO(businessPlan) {
    const firstChapter =
      businessPlan.chapters.size > 0 ? businessPlan.chapters.values().next().value : null;

    return {
      id: businessPlan.id.value,
      title: businessPlan.title.value,
      projectId: businessPlan.projectId,
      status: businessPlan.status.value,
      statusDisplay: this.getStatusDisplay(businessPlan.status.value),
      chapterCount: businessPlan.chapterCount,
      totalTokens: businessPlan.totalTokens,
      cost: businessPlan.cost,
      costDisplay: `¥${businessPlan.cost.toFixed(2)}`,
      preview: firstChapter ? firstChapter.content.getSummary(200) : '',
      createdAt: businessPlan.createdAt,
      updatedAt: businessPlan.updatedAt,
      isCompleted: businessPlan.status.isCompleted()
    };
  }
}
