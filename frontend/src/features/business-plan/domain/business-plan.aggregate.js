/**
 * 商业计划书聚合根
 * 维护商业计划书的完整性和业务规则
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { BusinessPlanId } from './value-objects/business-plan-id.vo.js';
import { BusinessPlanStatus } from './value-objects/business-plan-status.vo.js';
import { BusinessPlanTitle } from './value-objects/business-plan-title.vo.js';
import { Chapter } from './entities/chapter.entity.js';
import { ChapterId } from './value-objects/chapter-id.vo.js';
import { ChapterTitle } from './value-objects/chapter-title.vo.js';
import { ChapterContent } from './value-objects/chapter-content.vo.js';
import { UserId } from '../value-objects/user-id.vo.js';
import { BusinessPlanCreatedEvent } from './events/business-plan-created.event.js';
import { ChapterGeneratedEvent } from './events/chapter-generated.event.js';
import { BusinessPlanCompletedEvent } from './events/business-plan-completed.event.js';

export class BusinessPlan extends AggregateRoot {
  constructor(
    id,
    title,
    projectId,
    status = BusinessPlanStatus.DRAFT,
    chapters = new Map(),
    generatedBy = null,
    totalTokens = 0,
    cost = 0,
    completedAt = null,
    metadata = {}
  ) {
    super(id);
    this._title = title;
    this._projectId = projectId;
    this._status = status;
    this._chapters = chapters;
    this._generatedBy = generatedBy;
    this._totalTokens = totalTokens;
    this._cost = cost;
    this._completedAt = completedAt;
    this._metadata = metadata;
  }

  /**
   * 创建商业计划书
   */
  static create(title, projectId, generatedBy) {
    const businessPlanId = BusinessPlanId.generate();
    const businessPlanTitle = new BusinessPlanTitle(title);
    const userId = new UserId(generatedBy);

    const businessPlan = new BusinessPlan(
      businessPlanId,
      businessPlanTitle,
      projectId,
      BusinessPlanStatus.DRAFT,
      new Map(),
      userId
    );

    // 添加领域事件
    businessPlan.addDomainEvent(
      new BusinessPlanCreatedEvent({
        businessPlanId: businessPlanId.value,
        projectId: projectId,
        title: title,
        generatedBy: generatedBy,
        timestamp: new Date()
      })
    );

    return businessPlan;
  }

  /**
   * 生成章节
   */
  generateChapter(chapterType, title, content, tokens = 0) {
    if (this._status.isCompleted()) {
      throw new Error('已完成的商业计划书不能生成新章节');
    }

    const chapterId = ChapterId.generate();
    const chapterTitle = new ChapterTitle(title);
    const chapterContent = new ChapterContent(content);

    const chapter = new Chapter(
      chapterId,
      this.id,
      chapterType,
      chapterTitle,
      chapterContent,
      tokens
    );

    this._chapters.set(chapterType, chapter);
    this._totalTokens += tokens;
    this.updateTimestamp();

    // 添加章节生成事件
    this.addDomainEvent(
      new ChapterGeneratedEvent({
        businessPlanId: this.id.value,
        chapterId: chapterId.value,
        chapterType: chapterType,
        title: title,
        tokens: tokens,
        timestamp: new Date()
      })
    );

    return chapter;
  }

  /**
   * 完成商业计划书
   */
  complete() {
    if (this._status.isCompleted()) {
      throw new Error('商业计划书已完成');
    }

    if (this._chapters.size === 0) {
      throw new Error('没有章节内容，无法完成商业计划书');
    }

    const oldStatus = this._status;
    this._status = BusinessPlanStatus.COMPLETED;
    this._completedAt = new Date();
    this.updateTimestamp();

    // 计算成本（假设每1000 tokens成本为0.002元）
    this._cost = (this._totalTokens / 1000) * 0.002;

    // 添加完成事件
    this.addDomainEvent(
      new BusinessPlanCompletedEvent({
        businessPlanId: this.id.value,
        projectId: this._projectId,
        oldStatus: oldStatus.value,
        newStatus: BusinessPlanStatus.COMPLETED.value,
        totalTokens: this._totalTokens,
        cost: this._cost,
        timestamp: new Date()
      })
    );
  }

  /**
   * 更新章节内容
   */
  updateChapter(chapterType, newContent, newTokens = 0) {
    const chapter = this._chapters.get(chapterType);
    if (!chapter) {
      throw new Error(`章节不存在: ${chapterType}`);
    }

    if (this._status.isCompleted()) {
      throw new Error('已完成的商业计划书不能更新章节');
    }

    const oldTokens = chapter.tokens;
    chapter.updateContent(newContent, newTokens);

    // 更新总tokens数
    this._totalTokens = this._totalTokens - oldTokens + newTokens;
    this.updateTimestamp();
  }

  /**
   * 删除章节
   */
  deleteChapter(chapterType) {
    const chapter = this._chapters.get(chapterType);
    if (!chapter) {
      throw new Error(`章节不存在: ${chapterType}`);
    }

    if (this._status.isCompleted()) {
      throw new Error('已完成的商业计划书不能删除章节');
    }

    // 从总tokens中减去该章节的tokens
    this._totalTokens -= chapter.tokens;
    this._chapters.delete(chapterType);
    this.updateTimestamp();
  }

  /**
   * 获取章节
   */
  getChapter(chapterType) {
    return this._chapters.get(chapterType);
  }

  /**
   * 获取所有章节
   */
  getAllChapters() {
    return new Map(this._chapters);
  }

  /**
   * 更新标题
   */
  updateTitle(newTitle) {
    if (this._status.isCompleted()) {
      throw new Error('已完成的商业计划书不能更新标题');
    }

    this._title = new BusinessPlanTitle(newTitle);
    this.updateTimestamp();
  }

  /**
   * 更新元数据
   */
  updateMetadata(key, value) {
    this._metadata[key] = value;
    this.updateTimestamp();
  }

  /**
   * 验证商业计划书
   */
  validate() {
    if (!this._title || !this._title.value) {
      throw new Error('商业计划书标题不能为空');
    }

    if (!this._projectId) {
      throw new Error('项目ID不能为空');
    }

    if (!(this._status instanceof BusinessPlanStatus)) {
      throw new Error('状态必须是BusinessPlanStatus类型');
    }

    if (this._totalTokens < 0) {
      throw new Error('Token使用量不能为负数');
    }

    if (this._cost < 0) {
      throw new Error('成本不能为负数');
    }
  }

  // Getters
  get title() {
    return this._title;
  }
  get projectId() {
    return this._projectId;
  }
  get status() {
    return this._status;
  }
  get chapters() {
    return new Map(this._chapters);
  }
  get generatedBy() {
    return this._generatedBy;
  }
  get totalTokens() {
    return this._totalTokens;
  }
  get cost() {
    return this._cost;
  }
  get completedAt() {
    return this._completedAt;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isDraft() {
    return this._status.isDraft();
  }
  get isCompleted() {
    return this._status.isCompleted();
  }
  get chapterCount() {
    return this._chapters.size;
  }

  toJSON() {
    const chaptersObj = {};
    this._chapters.forEach((chapter, type) => {
      chaptersObj[type] = chapter.toJSON();
    });

    return {
      ...super.toJSON(),
      title: this._title.value,
      projectId: this._projectId,
      status: this._status.value,
      chapters: chaptersObj,
      generatedBy: this._generatedBy?.value,
      totalTokens: this._totalTokens,
      cost: this._cost,
      completedAt: this._completedAt,
      metadata: this._metadata,
      chapterCount: this.chapterCount
    };
  }

  /**
   * 从JSON创建商业计划书
   */
  static fromJSON(json) {
    const chapters = new Map();
    if (json.chapters) {
      Object.entries(json.chapters).forEach(([type, chapterData]) => {
        chapters.set(type, Chapter.fromJSON(chapterData));
      });
    }

    const businessPlan = new BusinessPlan(
      new BusinessPlanId(json.id),
      new BusinessPlanTitle(json.title),
      json.projectId,
      BusinessPlanStatus.fromString(json.status),
      chapters,
      json.generatedBy ? new UserId(json.generatedBy) : null,
      json.totalTokens || 0,
      json.cost || 0,
      json.completedAt ? new Date(json.completedAt) : null,
      json.metadata || {}
    );

    // 设置时间戳
    businessPlan._createdAt = new Date(json.createdAt);
    businessPlan._updatedAt = new Date(json.updatedAt);

    return businessPlan;
  }
}
