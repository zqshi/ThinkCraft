export class PdfExport extends AggregateRoot {
  constructor(
    id,
    title,
    projectId,
    format,
    status = ExportStatus.PENDING,
    content = null,
    options = null,
    requestedBy = null,
    fileUrl = null,
    fileSize = 0,
    pageCount = 0,
    metadata = {}
  ) {
    super(id);
    this._title = title;
    this._projectId = projectId;
    this._format = format;
    this._status = status;
    this._content = content;
    this._options = options;
    this._requestedBy = requestedBy;
    this._fileUrl = fileUrl;
    this._fileSize = fileSize;
    this._pageCount = pageCount;
    this._metadata = metadata;
  }

  /**
   * 创建导出任务
   */
  static create({ title, projectId, format, content, options, requestedBy }) {
    const exportId = ExportId.generate();
    const exportTitle = new ExportTitle(title);
    const exportFormat = format instanceof ExportFormat ? format : ExportFormat.fromString(format);
    const exportContent = content ? new ExportContent(content) : null;
    const exportOptions = options
      ? options instanceof ExportOptions
        ? options
        : new ExportOptions(options)
      : new ExportOptions({});
    const userId = requestedBy ? new UserId(requestedBy) : null;

    const pdfExport = new PdfExport(
      exportId,
      exportTitle,
      projectId,
      exportFormat,
      ExportStatus.PENDING,
      exportContent,
      exportOptions,
      userId
    );

    // 添加领域事件
    pdfExport.addDomainEvent(
      new ExportCreatedEvent({
        exportId: exportId.value,
        projectId: projectId,
        title: title,
        format: exportFormat.value,
        requestedBy: requestedBy,
        timestamp: new Date()
      })
    );

    return pdfExport;
  }

  /**
   * 开始处理导出
   */
  startProcessing() {
    if (!this._status.canProcess()) {
      throw new Error(`当前状态不能开始处理: ${this._status.value}`);
    }

    this._status = ExportStatus.PROCESSING;
    this.updateTimestamp();

    this.addDomainEvent(
      new ExportProcessingStartedEvent({
        exportId: this.id.value,
        projectId: this._projectId,
        format: this._format.value,
        timestamp: new Date()
      })
    );
  }

  /**
   * 完成导出
   */
  complete(fileUrl, fileSize, pageCount) {
    if (!this._status.isProcessing()) {
      throw new Error('当前状态不是处理中');
    }

    this._status = ExportStatus.COMPLETED;
    this._fileUrl = fileUrl;
    this._fileSize = fileSize;
    this._pageCount = pageCount;
    this.updateTimestamp();

    this.addDomainEvent(
      new ExportCompletedEvent({
        exportId: this.id.value,
        projectId: this._projectId,
        fileUrl: fileUrl,
        fileSize: fileSize,
        pageCount: pageCount,
        timestamp: new Date()
      })
    );
  }

  /**
   * 导出失败
   */
  fail(errorMessage) {
    this._status = ExportStatus.FAILED;
    this.updateMetadata('errorMessage', errorMessage);
    this.updateTimestamp();

    this.addDomainEvent(
      new ExportFailedEvent({
        exportId: this.id.value,
        projectId: this._projectId,
        errorMessage: errorMessage,
        timestamp: new Date()
      })
    );
  }

  /**
   * 更新内容
   */
  updateContent(content) {
    if (!this._status.canUpdate()) {
      throw new Error('当前状态不能更新内容');
    }

    this._content = new ExportContent(content);
    this.updateTimestamp();
  }

  /**
   * 更新选项
   */
  updateOptions(options) {
    if (!this._status.canUpdate()) {
      throw new Error('当前状态不能更新选项');
    }

    this._options = options instanceof ExportOptions ? options : new ExportOptions(options);
    this.updateTimestamp();
  }

  /**
   * 更新标题
   */
  updateTitle(title) {
    if (!this._status.canUpdate()) {
      throw new Error('当前状态不能更新标题');
    }

    this._title = new ExportTitle(title);
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
   * 验证导出任务
   */
  validate() {
    if (!this._title || !this._title.value) {
      throw new Error('导出标题不能为空');
    }

    if (!this._projectId) {
      throw new Error('项目ID不能为空');
    }

    if (!(this._format instanceof ExportFormat)) {
      throw new Error('格式必须是ExportFormat类型');
    }

    if (!(this._status instanceof ExportStatus)) {
      throw new Error('状态必须是ExportStatus类型');
    }

    if (this._content && !(this._content instanceof ExportContent)) {
      throw new Error('内容必须是ExportContent类型');
    }

    if (this._options && !(this._options instanceof ExportOptions)) {
      throw new Error('选项必须是ExportOptions类型');
    }

    if (this._fileSize < 0) {
      throw new Error('文件大小不能为负数');
    }

    if (this._pageCount < 0) {
      throw new Error('页数不能为负数');
    }
  }

  // Getters
  get title() {
    return this._title;
  }
  get projectId() {
    return this._projectId;
  }
  get format() {
    return this._format;
  }
  get status() {
    return this._status;
  }
  get content() {
    return this._content;
  }
  get options() {
    return this._options;
  }
  get requestedBy() {
    return this._requestedBy;
  }
  get fileUrl() {
    return this._fileUrl;
  }
  get fileSize() {
    return this._fileSize;
  }
  get pageCount() {
    return this._pageCount;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isPending() {
    return this._status.isPending();
  }
  get isProcessing() {
    return this._status.isProcessing();
  }
  get isCompleted() {
    return this._status.isCompleted();
  }
  get isFailed() {
    return this._status.isFailed();
  }

  /**
   * 获取文件大小显示
   */
  getFileSizeDisplay() {
    if (this._fileSize === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(this._fileSize) / Math.log(k));

    return parseFloat((this._fileSize / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  toJSON() {
    return {
      ...super.toJSON(),
      title: this._title.value,
      projectId: this._projectId,
      format: this._format.value,
      status: this._status.value,
      content: this._content?.value,
      options: this._options?.toJSON(),
      requestedBy: this._requestedBy?.value,
      fileUrl: this._fileUrl,
      fileSize: this._fileSize,
      fileSizeDisplay: this.getFileSizeDisplay(),
      pageCount: this._pageCount,
      metadata: this._metadata
    };
  }

  /**
   * 从JSON创建PDF导出任务
   */
  static fromJSON(json) {
    const pdfExport = new PdfExport(
      new ExportId(json.id),
      new ExportTitle(json.title),
      json.projectId,
      ExportFormat.fromString(json.format),
      ExportStatus.fromString(json.status),
      json.content ? new ExportContent(json.content) : null,
      json.options ? ExportOptions.fromJSON(json.options) : null,
      json.requestedBy ? new UserId(json.requestedBy) : null,
      json.fileUrl,
      json.fileSize || 0,
      json.pageCount || 0,
      json.metadata || {}
    );

    // 设置时间戳
    pdfExport._createdAt = new Date(json.createdAt);
    pdfExport._updatedAt = new Date(json.updatedAt);

    return pdfExport;
  }
}
