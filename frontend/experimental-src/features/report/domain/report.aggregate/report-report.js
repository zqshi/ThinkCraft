export class Report extends AggregateRoot {
  constructor(
    id,
    projectId,
    type,
    title,
    description = null,
    status = ReportStatus.DRAFT,
    sections = [],
    generatedBy = null,
    generatedAt = null,
    totalPages = 0,
    wordCount = 0,
    metadata = {}
  ) {
    super(id);
    this._projectId = projectId;
    this._type = type;
    this._title = title;
    this._description = description;
    this._status = status;
    this._sections = sections;
    this._generatedBy = generatedBy;
    this._generatedAt = generatedAt;
    this._totalPages = totalPages;
    this._wordCount = wordCount;
    this._metadata = metadata;
  }

  /**
   * 创建报告
   */
  static create({ projectId, type, title, description, generatedBy }) {
    const reportId = ReportId.generate();
    const reportType = type instanceof ReportType ? type : ReportType.fromString(type);
    const reportTitle = new ReportTitle(title);
    const reportDescription = description ? new ReportDescription(description) : null;
    const userId = generatedBy ? new UserId(generatedBy) : null;

    const report = new Report(
      reportId,
      projectId,
      reportType,
      reportTitle,
      reportDescription,
      ReportStatus.DRAFT,
      [],
      userId
    );

    // 添加领域事件
    report.addDomainEvent(
      new ReportCreatedEvent({
        reportId: reportId.value,
        projectId: projectId,
        type: reportType.value,
        title: title,
        generatedBy: generatedBy,
        timestamp: new Date()
      })
    );

    return report;
  }

  /**
   * 添加章节
   */
  addSection({ title, content, orderIndex, sectionType = 'content' }) {
    if (this._status.isGenerated()) {
      throw new Error('已生成的报告不能添加章节');
    }

    const sectionId = ReportSectionId.generate();
    const sectionTitle = new ReportSectionTitle(title);
    const sectionContent = new ReportSectionContent(content);

    const section = new ReportSection(
      sectionId,
      this.id,
      sectionTitle,
      sectionContent,
      orderIndex !== undefined ? orderIndex : this._sections.length,
      sectionType
    );

    // 插入到指定位置
    if (orderIndex !== undefined) {
      this._sections.splice(orderIndex, 0, section);
      // 更新后续章节的索引
      for (let i = orderIndex + 1; i < this._sections.length; i++) {
        this._sections[i].updateOrderIndex(i);
      }
    } else {
      this._sections.push(section);
    }

    this.updateWordCount();
    this.updateTimestamp();

    this.addDomainEvent(
      new ReportSectionAddedEvent({
        reportId: this.id.value,
        sectionId: sectionId.value,
        title: title,
        orderIndex: section.orderIndex,
        sectionType: sectionType,
        timestamp: new Date()
      })
    );

    return section;
  }

  /**
   * 更新章节
   */
  updateSection(sectionId, { title, content, orderIndex }) {
    const section = this._sections.find(s => s.id.value === sectionId);

    if (!section) {
      throw new Error(`章节不存在: ${sectionId}`);
    }

    if (this._status.isGenerated()) {
      throw new Error('已生成的报告不能更新章节');
    }

    const oldOrderIndex = section.orderIndex;

    if (title !== undefined) {
      section.updateTitle(title);
    }

    if (content !== undefined) {
      section.updateContent(content);
    }

    if (orderIndex !== undefined && orderIndex !== oldOrderIndex) {
      this.reorderSection(section, orderIndex);
    }

    this.updateWordCount();
    this.updateTimestamp();

    this.addDomainEvent(
      new ReportSectionUpdatedEvent({
        reportId: this.id.value,
        sectionId: sectionId,
        title: title,
        content: content,
        orderIndex: orderIndex,
        timestamp: new Date()
      })
    );

    return section;
  }

  /**
   * 删除章节
   */
  removeSection(sectionId) {
    const sectionIndex = this._sections.findIndex(s => s.id.value === sectionId);

    if (sectionIndex === -1) {
      throw new Error(`章节不存在: ${sectionId}`);
    }

    if (this._status.isGenerated()) {
      throw new Error('已生成的报告不能删除章节');
    }

    const section = this._sections[sectionIndex];
    this._sections.splice(sectionIndex, 1);

    // 更新后续章节的索引
    for (let i = sectionIndex; i < this._sections.length; i++) {
      this._sections[i].updateOrderIndex(i);
    }

    this.updateWordCount();
    this.updateTimestamp();

    this.addDomainEvent(
      new ReportSectionRemovedEvent({
        reportId: this.id.value,
        sectionId: sectionId,
        sectionTitle: section.title.value,
        timestamp: new Date()
      })
    );
  }

  /**
   * 重新排序章节
   */
  reorderSection(section, newOrderIndex) {
    const currentIndex = this._sections.findIndex(s => s.id.value === section.id.value);

    if (currentIndex === -1) {
      throw new Error('章节不在报告中');
    }

    // 从当前位置移除
    this._sections.splice(currentIndex, 1);

    // 插入到新位置
    this._sections.splice(newOrderIndex, 0, section);

    // 更新所有章节的索引
    this._sections.forEach((s, index) => {
      s.updateOrderIndex(index);
    });
  }

  /**
   * 生成报告
   */
  generate(generatedBy) {
    if (this._sections.length === 0) {
      throw new Error('报告没有内容，不能生成');
    }

    if (this._status.isGenerated()) {
      throw new Error('报告已经生成');
    }

    const oldStatus = this._status;
    this._status = ReportStatus.GENERATED;
    this._generatedBy = new UserId(generatedBy);
    this._generatedAt = new Date();
    this.updateTimestamp();

    // 计算总页数（简化计算，实际需要更复杂的分页逻辑）
    const wordsPerPage = 250; // 假设每页250词
    this._totalPages = Math.ceil(this._wordCount / wordsPerPage);

    this.addDomainEvent(
      new ReportGeneratedEvent({
        reportId: this.id.value,
        projectId: this._projectId,
        oldStatus: oldStatus.value,
        newStatus: ReportStatus.GENERATED.value,
        totalPages: this._totalPages,
        wordCount: this._wordCount,
        generatedBy: generatedBy,
        timestamp: new Date()
      })
    );
  }

  /**
   * 更新状态
   */
  updateStatus(newStatus) {
    const oldStatus = this._status;
    this._status =
      newStatus instanceof ReportStatus ? newStatus : ReportStatus.fromString(newStatus);
    this.updateTimestamp();

    this.addDomainEvent(
      new ReportStatusChangedEvent({
        reportId: this.id.value,
        projectId: this._projectId,
        oldStatus: oldStatus.value,
        newStatus: this._status.value,
        timestamp: new Date()
      })
    );
  }

  /**
   * 添加元数据
   */
  addMetadata(key, value) {
    this._metadata[key] = value;
    this.updateTimestamp();
  }

  /**
   * 移除元数据
   */
  removeMetadata(key) {
    delete this._metadata[key];
    this.updateTimestamp();
  }

  /**
   * 更新字数统计
   */
  updateWordCount() {
    this._wordCount = this._sections.reduce((total, section) => {
      return total + section.wordCount;
    }, 0);
  }

  /**
   * 获取章节
   */
  getSection(sectionId) {
    return this._sections.find(s => s.id.value === sectionId);
  }

  /**
   * 获取所有章节（按顺序）
   */
  getAllSections() {
    return [...this._sections].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  /**
   * 获取章节数量
   */
  get sectionCount() {
    return this._sections.length;
  }

  /**
   * 验证报告
   */
  validate() {
    if (!this._title || !this._title.value) {
      throw new Error('报告标题不能为空');
    }

    if (!this._projectId) {
      throw new Error('项目ID不能为空');
    }

    if (!(this._type instanceof ReportType)) {
      throw new Error('报告类型必须是ReportType类型');
    }

    if (!(this._status instanceof ReportStatus)) {
      throw new Error('报告状态必须是ReportStatus类型');
    }

    if (this._description && !(this._description instanceof ReportDescription)) {
      throw new Error('报告描述必须是ReportDescription类型');
    }

    if (!Array.isArray(this._sections)) {
      throw new Error('章节列表必须是数组');
    }

    this._sections.forEach(section => {
      if (!(section instanceof ReportSection)) {
        throw new Error('所有章节必须是ReportSection类型');
      }
    });

    if (this._wordCount < 0) {
      throw new Error('字数不能为负数');
    }

    if (this._totalPages < 0) {
      throw new Error('页数不能为负数');
    }
  }

  // Getters
  get projectId() {
    return this._projectId;
  }
  get type() {
    return this._type;
  }
  get title() {
    return this._title;
  }
  get description() {
    return this._description;
  }
  get status() {
    return this._status;
  }
  get sections() {
    return this.getAllSections();
  }
  get generatedBy() {
    return this._generatedBy;
  }
  get generatedAt() {
    return this._generatedAt;
  }
  get totalPages() {
    return this._totalPages;
  }
  get wordCount() {
    return this._wordCount;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isDraft() {
    return this._status.isDraft();
  }
  get isGenerated() {
    return this._status.isGenerated();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      projectId: this._projectId,
      type: this._type.value,
      title: this._title.value,
      description: this._description?.value,
      status: this._status.value,
      sections: this._sections.map(section => section.toJSON()),
      generatedBy: this._generatedBy?.value,
      generatedAt: this._generatedAt,
      totalPages: this._totalPages,
      wordCount: this._wordCount,
      metadata: this._metadata,
      sectionCount: this.sectionCount
    };
  }

  /**
   * 从JSON创建报告
   */
  static fromJSON(json) {
    const sections = json.sections ? json.sections.map(s => ReportSection.fromJSON(s)) : [];

    const report = new Report(
      new ReportId(json.id),
      json.projectId,
      ReportType.fromString(json.type),
      new ReportTitle(json.title),
      json.description ? new ReportDescription(json.description) : null,
      ReportStatus.fromString(json.status),
      sections,
      json.generatedBy ? new UserId(json.generatedBy) : null,
      json.generatedAt ? new Date(json.generatedAt) : null,
      json.totalPages || 0,
      json.wordCount || 0,
      json.metadata || {}
    );

    // 设置时间戳
    report._createdAt = new Date(json.createdAt);
    report._updatedAt = new Date(json.updatedAt);

    return report;
  }
}
