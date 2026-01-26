/**
 * 商业计划书DTO（数据传输对象）
 * 定义与外部通信的数据结构
 */

/**
 * 创建商业计划书请求DTO
 */
export class CreateBusinessPlanDto {
  constructor({ title, projectId, generatedBy }) {
    this.title = title;
    this.projectId = projectId;
    this.generatedBy = generatedBy;
  }

  validate() {
    if (!this.title || this.title.trim().length === 0) {
      throw new Error('商业计划书标题不能为空');
    }
    if (!this.projectId) {
      throw new Error('项目ID不能为空');
    }
    if (!this.generatedBy) {
      throw new Error('生成者信息不能为空');
    }
    return true;
  }
}

/**
 * 生成章节请求DTO
 */
export class GenerateChapterDto {
  constructor({ chapterId, conversationHistory }) {
    this.chapterId = chapterId;
    this.conversationHistory = conversationHistory;
  }

  validate() {
    if (!this.chapterId) {
      throw new Error('章节ID不能为空');
    }
    if (!this.conversationHistory || !Array.isArray(this.conversationHistory)) {
      throw new Error('对话历史不能为空且必须是数组');
    }
    return true;
  }
}

/**
 * 批量生成章节请求DTO
 */
export class GenerateBatchChaptersDto {
  constructor({ chapterIds, conversationHistory }) {
    this.chapterIds = chapterIds;
    this.conversationHistory = conversationHistory;
  }

  validate() {
    if (!this.chapterIds || !Array.isArray(this.chapterIds) || this.chapterIds.length === 0) {
      throw new Error('章节ID列表不能为空');
    }
    if (!this.conversationHistory || !Array.isArray(this.conversationHistory)) {
      throw new Error('对话历史不能为空且必须是数组');
    }
    return true;
  }
}

/**
 * 商业计划书响应DTO
 */
export class BusinessPlanResponseDto {
  static fromAggregate(businessPlan) {
    return {
      id: businessPlan.id.value,
      title: businessPlan.title,
      status: businessPlan.status.value,
      projectId: businessPlan.projectId,
      chapters: businessPlan.getAllChapters().map(chapter => ({
        id: chapter.id.value,
        content: chapter.content,
        tokens: chapter.tokens,
        cost: chapter.cost,
        generatedAt: chapter.generatedAt
      })),
      generatedBy: businessPlan.generatedBy,
      totalTokens: businessPlan.totalTokens,
      cost: businessPlan.cost,
      createdAt: businessPlan.createdAt,
      updatedAt: businessPlan.updatedAt,
      completedAt: businessPlan.completedAt
    };
  }
}

/**
 * 章节响应DTO
 */
export class ChapterResponseDto {
  static fromGeneratedChapter(chapter) {
    return {
      chapterId: chapter.chapterId,
      content: chapter.content,
      agent: chapter.agent,
      emoji: chapter.emoji,
      tokens: chapter.tokens,
      timestamp: chapter.timestamp
    };
  }
}
