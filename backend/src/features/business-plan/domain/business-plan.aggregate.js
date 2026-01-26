/**
 * 商业计划书聚合根
 * 维护商业计划书的完整性和业务规则
 */
import { Entity } from '../../../shared/domain/entity.base.js';
import { BusinessPlanStatus } from './value-objects/business-plan-status.vo.js';
import { BusinessPlanId } from './value-objects/business-plan-id.vo.js';
import { ChapterId } from './value-objects/chapter-id.vo.js';
import { BusinessPlanCreatedEvent } from './events/business-plan-created.event.js';
import { ChapterGeneratedEvent } from './events/chapter-generated.event.js';
import { BusinessPlanCompletedEvent } from './events/business-plan-completed.event.js';

export class BusinessPlan extends Entity {
  constructor(id, props) {
    super(id);
    this._title = props.title;
    this._status = props.status || BusinessPlanStatus.DRAFT;
    this._projectId = props.projectId;
    this._chapters = props.chapters || new Map();
    this._generatedBy = props.generatedBy;
    this._totalTokens = props.totalTokens || 0;
    this._cost = props.cost || 0;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._completedAt = props.completedAt;
  }

  /**
   * 创建商业计划书
   */
  static create(props) {
    const businessPlanId = new BusinessPlanId();
    const businessPlan = new BusinessPlan(businessPlanId, {
      ...props,
      status: BusinessPlanStatus.DRAFT
    });

    // 发布领域事件
    businessPlan.addDomainEvent(
      new BusinessPlanCreatedEvent({
        businessPlanId: businessPlanId.value,
        projectId: props.projectId,
        title: props.title,
        generatedBy: props.generatedBy
      })
    );

    return businessPlan;
  }

  /**
   * 生成章节
   */
  generateChapter(chapterId, content, tokens, cost) {
    if (!this.canGenerateChapter()) {
      throw new Error('当前状态不允许生成章节');
    }

    const chapter = {
      id: new ChapterId(chapterId),
      content,
      tokens,
      cost,
      generatedAt: new Date()
    };

    this._chapters.set(chapterId, chapter);
    this._totalTokens += tokens;
    this._cost += cost;
    this._updatedAt = new Date();

    // 发布章节生成事件
    this.addDomainEvent(
      new ChapterGeneratedEvent({
        businessPlanId: this._id.value,
        chapterId,
        tokens,
        cost
      })
    );
  }

  /**
   * 完成商业计划书
   */
  complete() {
    if (this._status !== BusinessPlanStatus.DRAFT) {
      throw new Error('只有草稿状态的商业计划书才能标记为完成');
    }

    if (this._chapters.size === 0) {
      throw new Error('至少需要生成一个章节才能完成');
    }

    this._status = BusinessPlanStatus.COMPLETED;
    this._completedAt = new Date();
    this._updatedAt = new Date();

    // 发布完成事件
    this.addDomainEvent(
      new BusinessPlanCompletedEvent({
        businessPlanId: this._id.value,
        totalChapters: this._chapters.size,
        totalTokens: this._totalTokens,
        totalCost: this._cost
      })
    );
  }

  /**
   * 获取章节内容
   */
  getChapter(chapterId) {
    return this._chapters.get(chapterId);
  }

  /**
   * 获取所有章节
   */
  getAllChapters() {
    return Array.from(this._chapters.values());
  }

  /**
   * 是否可以生成章节
   */
  canGenerateChapter() {
    return this._status === BusinessPlanStatus.DRAFT;
  }

  /**
   * 验证实体有效性
   */
  validate() {
    if (!this._title || this._title.trim().length === 0) {
      throw new Error('商业计划书标题不能为空');
    }

    if (!this._projectId) {
      throw new Error('项目ID不能为空');
    }

    if (!this._generatedBy) {
      throw new Error('生成者信息不能为空');
    }

    return true;
  }

  // Getters
  get title() {
    return this._title;
  }
  get status() {
    return this._status;
  }
  get projectId() {
    return this._projectId;
  }
  get chapters() {
    return this._chapters;
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

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      ...super.toJSON(),
      title: this._title,
      status: this._status.value,
      projectId: this._projectId,
      chapters: Array.from(this._chapters.entries()).map(([id, chapter]) => ({
        id,
        ...chapter,
        id: chapter.id.value
      })),
      generatedBy: this._generatedBy,
      totalTokens: this._totalTokens,
      cost: this._cost,
      completedAt: this._completedAt
    };
  }
}
