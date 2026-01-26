/**
 * 章节实体
 * 商业计划书的组成部分
 */
import { Entity } from '../../../../shared/domain/entity.base.js';
import { ChapterId } from '../value-objects/chapter-id.vo.js';
import { ChapterTitle } from '../value-objects/chapter-title.vo.js';
import { ChapterContent } from '../value-objects/chapter-content.vo.js';
import { ChapterType } from '../value-objects/chapter-type.vo.js';

export class Chapter extends Entity {
  constructor(
    id,
    businessPlanId,
    type,
    title,
    content,
    tokens = 0,
    generatedAt = new Date(),
    metadata = {}
  ) {
    super(id);
    this._businessPlanId = businessPlanId;
    this._type = type;
    this._title = title;
    this._content = content;
    this._tokens = tokens;
    this._generatedAt = generatedAt;
    this._metadata = metadata;

    this.validate();
  }

  /**
   * 更新内容
   */
  updateContent(newContent, newTokens = 0) {
    this._content = new ChapterContent(newContent);
    this._tokens = newTokens;
    this.updateTimestamp();
  }

  /**
   * 更新标题
   */
  updateTitle(newTitle) {
    this._title = new ChapterTitle(newTitle);
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
   * 验证章节
   */
  validate() {
    if (!this._businessPlanId) {
      throw new Error('商业计划书ID不能为空');
    }

    if (!(this._type instanceof ChapterType)) {
      throw new Error('章节类型必须是ChapterType类型');
    }

    if (!(this._title instanceof ChapterTitle)) {
      throw new Error('章节标题必须是ChapterTitle类型');
    }

    if (!(this._content instanceof ChapterContent)) {
      throw new Error('章节内容必须是ChapterContent类型');
    }

    if (this._tokens < 0) {
      throw new Error('Token使用量不能为负数');
    }
  }

  // Getters
  get businessPlanId() {
    return this._businessPlanId;
  }
  get type() {
    return this._type;
  }
  get title() {
    return this._title;
  }
  get content() {
    return this._content;
  }
  get tokens() {
    return this._tokens;
  }
  get generatedAt() {
    return this._generatedAt;
  }
  get metadata() {
    return { ...this._metadata };
  }

  toJSON() {
    return {
      ...super.toJSON(),
      businessPlanId: this._businessPlanId,
      type: this._type.value,
      title: this._title.value,
      content: this._content.value,
      tokens: this._tokens,
      generatedAt: this._generatedAt,
      metadata: this._metadata
    };
  }

  /**
   * 从JSON创建章节
   */
  static fromJSON(json) {
    return new Chapter(
      new ChapterId(json.id),
      json.businessPlanId,
      ChapterType.fromString(json.type),
      new ChapterTitle(json.title),
      new ChapterContent(json.content),
      json.tokens || 0,
      new Date(json.generatedAt),
      json.metadata || {}
    );
  }
}
