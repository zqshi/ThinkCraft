/**
 * 报告章节值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ReportSection extends ValueObject {
  constructor(props) {
    super();
    this._id = `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this._title = props.title || '';
    this._content = props.content || '';
    this._type = props.type || 'text';
    this._order = props.order || 1;
    this._metadata = props.metadata || {};
    this._createdAt = new Date();
    this._updatedAt = new Date();
    this.validate();
  }

  /**
   * 验证章节数据
   */
  validate() {
    if (!this._title || typeof this._title !== 'string') {
      throw new Error('章节标题必须是字符串');
    }

    if (!this._content || typeof this._content !== 'string') {
      throw new Error('章节内容必须是字符串');
    }

    const validTypes = ['text', 'chart', 'table', 'image', 'markdown', 'html'];
    if (!validTypes.includes(this._type)) {
      throw new Error(`无效的章节类型: ${this._type}`);
    }

    if (typeof this._order !== 'number' || this._order < 1) {
      throw new Error('章节顺序必须是大于0的数字');
    }
  }

  /**
   * 更新章节
   */
  update(updates) {
    if (updates.title !== undefined) {
      if (!updates.title || typeof updates.title !== 'string') {
        throw new Error('章节标题必须是字符串');
      }
      this._title = updates.title;
    }

    if (updates.content !== undefined) {
      if (!updates.content || typeof updates.content !== 'string') {
        throw new Error('章节内容必须是字符串');
      }
      this._content = updates.content;
    }

    if (updates.type !== undefined) {
      const validTypes = ['text', 'chart', 'table', 'image', 'markdown', 'html'];
      if (!validTypes.includes(updates.type)) {
        throw new Error(`无效的章节类型: ${updates.type}`);
      }
      this._type = updates.type;
    }

    if (updates.order !== undefined) {
      if (typeof updates.order !== 'number' || updates.order < 1) {
        throw new Error('章节顺序必须是大于0的数字');
      }
      this._order = updates.order;
    }

    if (updates.metadata !== undefined) {
      this._metadata = { ...this._metadata, ...updates.metadata };
    }

    this._updatedAt = new Date();
  }

  /**
   * 获取章节摘要
   */
  getSummary() {
    return {
      id: this._id,
      title: this._title,
      type: this._type,
      order: this._order,
      contentLength: this._content.length,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      id: this._id,
      title: this._title,
      content: this._content,
      type: this._type,
      order: this._order,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  /**
   * 从JSON创建
   */
  static fromJSON(json) {
    const section = new ReportSection({
      title: json.title,
      content: json.content,
      type: json.type,
      order: json.order,
      metadata: json.metadata
    });
    section._id = json.id;
    section._createdAt = new Date(json.createdAt);
    section._updatedAt = new Date(json.updatedAt);
    return section;
  }

  /**
   * 克隆章节
   */
  clone() {
    return ReportSection.fromJSON(this.toJSON());
  }

  /**
   * 获取内容预览（前100个字符）
   */
  getPreview(maxLength = 100) {
    if (this._content.length <= maxLength) {
      return this._content;
    }
    return this._content.substring(0, maxLength) + '...';
  }

  /**
   * 是否包含图表
   */
  hasChart() {
    return (
      this._type === 'chart' || this._content.includes('chart') || this._content.includes('graph')
    );
  }

  /**
   * 是否包含表格
   */
  hasTable() {
    return this._type === 'table' || this._content.includes('table') || this._content.includes('|');
  }

  /**
   * 是否包含图片
   */
  hasImage() {
    return (
      this._type === 'image' || this._content.includes('![image]') || this._content.includes('<img')
    );
  }

  // Getters
  get id() {
    return this._id;
  }
  get title() {
    return this._title;
  }
  get content() {
    return this._content;
  }
  get type() {
    return this._type;
  }
  get order() {
    return this._order;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }

  equals(other) {
    if (!(other instanceof ReportSection)) {
      return false;
    }
    return this._id === other._id;
  }

  toString() {
    return `${this._title} (${this._type})`;
  }
}

/**
 * 章节内容处理器
 */
export class SectionContentProcessor {
  /**
   * 处理文本内容
   */
  static processText(content) {
    return content
      .replace(/\n\s*\n/g, '\n\n') // 规范化换行
      .trim();
  }

  /**
   * 处理Markdown内容
   */
  static processMarkdown(content) {
    // 这里可以集成Markdown解析器
    return this.processText(content);
  }

  /**
   * 处理HTML内容
   */
  static processHtml(content) {
    // 清理HTML标签
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除script
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // 移除style
      .trim();
  }

  /**
   * 验证内容类型
   */
  static validateContentType(content, type) {
    switch (type) {
    case 'text':
      return typeof content === 'string';
    case 'markdown':
      return typeof content === 'string';
    case 'html':
      return typeof content === 'string' && content.includes('<');
    case 'chart':
      return typeof content === 'object' || content.includes('chart');
    case 'table':
      return content.includes('|') || content.includes('table');
    case 'image':
      return content.includes('![') || content.includes('<img');
    default:
      return true;
    }
  }
}
