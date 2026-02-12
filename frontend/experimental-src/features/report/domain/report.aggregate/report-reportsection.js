export class ReportSection {
  constructor(
    id,
    reportId,
    title,
    content,
    orderIndex,
    sectionType = 'content',
    wordCount = 0,
    metadata = {}
  ) {
    this.id = id;
    this._reportId = reportId;
    this._title = title;
    this._content = content;
    this._orderIndex = orderIndex;
    this._sectionType = sectionType;
    this._wordCount = wordCount;
    this._metadata = metadata;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 更新标题
   */
  updateTitle(title) {
    this._title = new ReportSectionTitle(title);
    this.updateTimestamp();
  }

  /**
   * 更新内容
   */
  updateContent(content) {
    this._content = new ReportSectionContent(content);
    this._wordCount = this.calculateWordCount();
    this.updateTimestamp();
  }

  /**
   * 更新排序索引
   */
  updateOrderIndex(orderIndex) {
    this._orderIndex = orderIndex;
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
   * 计算字数
   */
  calculateWordCount() {
    return this._content.value
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  /**
   * 获取摘要
   */
  getSummary(maxLength = 200) {
    const content = this._content.value;
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  updateTimestamp() {
    this._updatedAt = new Date();
  }

  // Getters
  get reportId() {
    return this._reportId;
  }
  get title() {
    return this._title;
  }
  get content() {
    return this._content;
  }
  get orderIndex() {
    return this._orderIndex;
  }
  get sectionType() {
    return this._sectionType;
  }
  get wordCount() {
    return this._wordCount;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isContentType() {
    return this._sectionType === 'content';
  }

  toJSON() {
    return {
      id: this.id.value,
      reportId: this._reportId,
      title: this._title.value,
      content: this._content.value,
      orderIndex: this._orderIndex,
      sectionType: this._sectionType,
      wordCount: this._wordCount,
      summary: this.getSummary(100),
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  /**
   * 从JSON创建章节
   */
  static fromJSON(json) {
    const section = new ReportSection(
      new ReportSectionId(json.id),
      json.reportId,
      new ReportSectionTitle(json.title),
      new ReportSectionContent(json.content),
      json.orderIndex,
      json.sectionType || 'content',
      json.wordCount || 0,
      json.metadata || {}
    );

    section._createdAt = new Date(json.createdAt);
    section._updatedAt = new Date(json.updatedAt);

    return section;
  }
}
