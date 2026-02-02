/**
 * PDF导出聚合根
 * 管理PDF导出任务的业务逻辑
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { ExportId } from './value-objects/export-id.vo.js';
import { ExportFormat } from './value-objects/export-format.vo.js';
import { ExportStatus } from './value-objects/export-status.vo.js';
import { ExportOptions } from './value-objects/export-options.vo.js';
import { ExportTitle } from './value-objects/export-title.vo.js';
import { ExportContent } from './value-objects/export-content.vo.js';
import { UserId } from '../../shared/value-objects/user-id.vo.js';
import { ExportCreatedEvent } from './events/export-created.event.js';
import { ExportProcessingStartedEvent } from './events/export-processing-started.event.js';
import { ExportCompletedEvent } from './events/export-completed.event.js';
import { ExportFailedEvent } from './events/export-failed.event.js';

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

/**
 * PDF导出工厂
 */
export class PdfExportFactory {
  static createFromProject(title, projectId, format, content, options, requestedBy) {
    return PdfExport.create({
      title,
      projectId,
      format,
      content,
      options,
      requestedBy
    });
  }

  static createFromJSON(json) {
    return PdfExport.fromJSON(json);
  }
}

/**
 * 导出ID值对象
 */
export class ExportId extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  static generate() {
    return new ExportId(`export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('导出ID必须是字符串');
    }

    if (!/^export_[a-zA-Z0-9_]+$/.test(this._value)) {
      throw new Error('导出ID必须以"export_"开头，且只能包含字母数字和下划线');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ExportId && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 导出格式值对象
 */
export class ExportFormat {
  static PDF = new ExportFormat('PDF');
  static WORD = new ExportFormat('WORD');
  static EXCEL = new ExportFormat('EXCEL');
  static POWERPOINT = new ExportFormat('POWERPOINT');
  static HTML = new ExportFormat('HTML');
  static MARKDOWN = new ExportFormat('MARKDOWN');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const format = this[value.toUpperCase()];
    if (!format) {
      throw new Error(`无效的导出格式: ${value}`);
    }
    return format;
  }

  validate() {
    const validFormats = ['PDF', 'WORD', 'EXCEL', 'POWERPOINT', 'HTML', 'MARKDOWN'];
    if (!validFormats.includes(this._value)) {
      throw new Error(`无效的导出格式: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  getDisplayName() {
    const names = {
      PDF: 'PDF文档',
      WORD: 'Word文档',
      EXCEL: 'Excel表格',
      POWERPOINT: 'PPT演示文稿',
      HTML: 'HTML网页',
      MARKDOWN: 'Markdown文档'
    };
    return names[this._value] || this._value;
  }

  getFileExtension() {
    const extensions = {
      PDF: '.pdf',
      WORD: '.docx',
      EXCEL: '.xlsx',
      POWERPOINT: '.pptx',
      HTML: '.html',
      MARKDOWN: '.md'
    };
    return extensions[this._value];
  }

  equals(other) {
    return other instanceof ExportFormat && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 导出状态值对象
 */
export class ExportStatus {
  static PENDING = new ExportStatus('PENDING');
  static PROCESSING = new ExportStatus('PROCESSING');
  static COMPLETED = new ExportStatus('COMPLETED');
  static FAILED = new ExportStatus('FAILED');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const status = this[value.toUpperCase()];
    if (!status) {
      throw new Error(`无效的导出状态: ${value}`);
    }
    return status;
  }

  validate() {
    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的导出状态: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  isPending() {
    return this._value === 'PENDING';
  }
  isProcessing() {
    return this._value === 'PROCESSING';
  }
  isCompleted() {
    return this._value === 'COMPLETED';
  }
  isFailed() {
    return this._value === 'FAILED';
  }

  canProcess() {
    return this._value === 'PENDING' || this._value === 'FAILED';
  }

  canUpdate() {
    return this._value === 'PENDING' || this._value === 'FAILED';
  }

  equals(other) {
    return other instanceof ExportStatus && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 导出选项值对象
 */
export class ExportOptions {
  constructor(options = {}) {
    this._pageSize = options.pageSize || 'A4';
    this._orientation = options.orientation || 'portrait';
    this._margin = options.margin || { top: 20, right: 20, bottom: 20, left: 20 };
    this._header = options.header || null;
    this._footer = options.footer || null;
    this._watermark = options.watermark || null;
    this._password = options.password || null;
    this._includeTableOfContents = options.includeTableOfContents || false;
    this._includePageNumbers = options.includePageNumbers || true;
    this._fontSize = options.fontSize || 12;
    this._fontFamily = options.fontFamily || 'Arial';
    this._lineSpacing = options.lineSpacing || 1.5;
    this.validate();
  }

  validate() {
    const validPageSizes = ['A4', 'A3', 'Letter', 'Legal'];
    if (!validPageSizes.includes(this._pageSize)) {
      throw new Error(`无效的页面大小: ${this._pageSize}`);
    }

    const validOrientations = ['portrait', 'landscape'];
    if (!validOrientations.includes(this._orientation)) {
      throw new Error(`无效的页面方向: ${this._orientation}`);
    }

    if (this._fontSize < 8 || this._fontSize > 24) {
      throw new Error('字体大小必须在8-24之间');
    }

    if (this._lineSpacing < 1 || this._lineSpacing > 3) {
      throw new Error('行间距必须在1-3之间');
    }
  }

  get pageSize() {
    return this._pageSize;
  }
  get orientation() {
    return this._orientation;
  }
  get margin() {
    return this._margin;
  }
  get header() {
    return this._header;
  }
  get footer() {
    return this._footer;
  }
  get watermark() {
    return this._watermark;
  }
  get password() {
    return this._password;
  }
  get includeTableOfContents() {
    return this._includeTableOfContents;
  }
  get includePageNumbers() {
    return this._includePageNumbers;
  }
  get fontSize() {
    return this._fontSize;
  }
  get fontFamily() {
    return this._fontFamily;
  }
  get lineSpacing() {
    return this._lineSpacing;
  }

  toJSON() {
    return {
      pageSize: this._pageSize,
      orientation: this._orientation,
      margin: this._margin,
      header: this._header,
      footer: this._footer,
      watermark: this._watermark,
      password: this._password,
      includeTableOfContents: this._includeTableOfContents,
      includePageNumbers: this._includePageNumbers,
      fontSize: this._fontSize,
      fontFamily: this._fontFamily,
      lineSpacing: this._lineSpacing
    };
  }

  static fromJSON(json) {
    return new ExportOptions(json);
  }
}

/**
 * 导出标题值对象
 */
export class ExportTitle {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('导出标题不能为空且必须是字符串');
    }

    const trimmed = this._value.trim();
    if (trimmed.length === 0) {
      throw new Error('导出标题不能为空');
    }

    if (trimmed.length > 200) {
      throw new Error('导出标题不能超过200个字符');
    }

    this._value = trimmed;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ExportTitle && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 导出内容值对象
 */
export class ExportContent {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (typeof this._value !== 'string') {
      throw new Error('导出内容必须是字符串');
    }

    if (this._value.length > 1000000) {
      // 1MB限制
      throw new Error('导出内容不能超过1MB');
    }
  }

  get value() {
    return this._value;
  }
  get length() {
    return this._value.length;
  }

  equals(other) {
    return other instanceof ExportContent && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
