/**
 * 导出选项值对象
 * 包含页面设置、样式、安全等导出配置
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ExportOptions extends ValueObject {
  constructor(options = {}) {
    super();
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
    this._headerSpacing = options.headerSpacing || 10;
    this._footerSpacing = options.footerSpacing || 10;
    this._colorMode = options.colorMode || 'color';
    this._quality = options.quality || 'high';
    this.validate();
  }

  /**
   * 验证选项
   */
  validate() {
    const validPageSizes = ['A4', 'A3', 'Letter', 'Legal', 'A5', 'B5'];
    if (!validPageSizes.includes(this._pageSize)) {
      throw new Error(`无效的页面大小: ${this._pageSize}`);
    }

    const validOrientations = ['portrait', 'landscape'];
    if (!validOrientations.includes(this._orientation)) {
      throw new Error(`无效的页面方向: ${this._orientation}`);
    }

    const validColorModes = ['color', 'grayscale', 'blackwhite'];
    if (!validColorModes.includes(this._colorMode)) {
      throw new Error(`无效的颜色模式: ${this._colorMode}`);
    }

    const validQualities = ['low', 'medium', 'high'];
    if (!validQualities.includes(this._quality)) {
      throw new Error(`无效的质量设置: ${this._quality}`);
    }

    if (this._fontSize < 8 || this._fontSize > 24) {
      throw new Error('字体大小必须在8-24之间');
    }

    if (this._lineSpacing < 1 || this._lineSpacing > 3) {
      throw new Error('行间距必须在1-3之间');
    }

    // 验证边距
    if (typeof this._margin !== 'object') {
      throw new Error('边距必须是对象');
    }

    ['top', 'right', 'bottom', 'left'].forEach(side => {
      if (typeof this._margin[side] !== 'number' || this._margin[side] < 0) {
        throw new Error(`边距${side}必须是大于等于0的数字`);
      }
    });
  }

  /**
   * 获取页面尺寸（毫米）
   */
  getPageDimensions() {
    const dimensions = {
      A4: { width: 210, height: 297 },
      A3: { width: 297, height: 420 },
      A5: { width: 148, height: 210 },
      B5: { width: 176, height: 250 },
      Letter: { width: 215.9, height: 279.4 },
      Legal: { width: 215.9, height: 355.6 }
    };

    const size = dimensions[this._pageSize];
    if (!size) {
      throw new Error(`未知的页面大小: ${this._pageSize}`);
    }

    // 根据方向调整
    if (this._orientation === 'landscape') {
      return { width: size.height, height: size.width };
    }

    return size;
  }

  /**
   * 获取总边距宽度
   */
  getTotalHorizontalMargin() {
    return this._margin.left + this._margin.right;
  }

  /**
   * 获取总边距高度
   */
  getTotalVerticalMargin() {
    return this._margin.top + this._margin.bottom;
  }

  /**
   * 获取内容区域宽度
   */
  getContentWidth() {
    const pageWidth = this.getPageDimensions().width;
    return pageWidth - this.getTotalHorizontalMargin();
  }

  /**
   * 获取内容区域高度
   */
  getContentHeight() {
    const pageHeight = this.getPageDimensions().height;
    let height = pageHeight - this.getTotalVerticalMargin();

    // 减去页眉页脚空间
    if (this._header) {
      height -= 20 + this._headerSpacing;
    }
    if (this._footer) {
      height -= 20 + this._footerSpacing;
    }

    return height;
  }

  /**
   * 是否受密码保护
   */
  isPasswordProtected() {
    return !!this._password;
  }

  /**
   * 克隆选项（创建副本）
   */
  clone() {
    return new ExportOptions(this.toJSON());
  }

  // Getters
  get pageSize() {
    return this._pageSize;
  }
  get orientation() {
    return this._orientation;
  }
  get margin() {
    return { ...this._margin };
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
  get headerSpacing() {
    return this._headerSpacing;
  }
  get footerSpacing() {
    return this._footerSpacing;
  }
  get colorMode() {
    return this._colorMode;
  }
  get quality() {
    return this._quality;
  }

  /**
   * 转换为JSON
   */
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
      lineSpacing: this._lineSpacing,
      headerSpacing: this._headerSpacing,
      footerSpacing: this._footerSpacing,
      colorMode: this._colorMode,
      quality: this._quality
    };
  }

  /**
   * 从JSON创建
   */
  static fromJSON(json) {
    return new ExportOptions(json);
  }

  /**
   * 相等性比较
   */
  equals(other) {
    if (!(other instanceof ExportOptions)) {
      return false;
    }
    return JSON.stringify(this.toJSON()) === JSON.stringify(other.toJSON());
  }

  toString() {
    return JSON.stringify(this.toJSON());
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
      lineSpacing: this._lineSpacing,
      headerSpacing: this._headerSpacing,
      footerSpacing: this._footerSpacing,
      colorMode: this._colorMode,
      quality: this._quality
    };
  }
}

/**
 * 水印配置
 */
export class WatermarkConfig {
  constructor(text, options = {}) {
    this.text = text;
    this.opacity = options.opacity || 0.3;
    this.fontSize = options.fontSize || 50;
    this.color = options.color || '#CCCCCC';
    this.rotation = options.rotation || -45;
    this.position = options.position || 'center';
    this.repeat = options.repeat !== false;
  }

  toJSON() {
    return {
      text: this.text,
      opacity: this.opacity,
      fontSize: this.fontSize,
      color: this.color,
      rotation: this.rotation,
      position: this.position,
      repeat: this.repeat
    };
  }

  static fromJSON(json) {
    return new WatermarkConfig(json.text, json);
  }
}

/**
 * 页眉页脚配置
 */
export class HeaderFooterConfig {
  constructor(content, options = {}) {
    this.content = content;
    this.align = options.align || 'center';
    this.fontSize = options.fontSize || 10;
    this.color = options.color || '#666666';
    this.includeDate = options.includeDate !== false;
    this.includePageNumbers = options.includePageNumbers !== false;
    this.includeTitle = options.includeTitle || false;
  }

  toJSON() {
    return {
      content: this.content,
      align: this.align,
      fontSize: this.fontSize,
      color: this.color,
      includeDate: this.includeDate,
      includePageNumbers: this.includePageNumbers,
      includeTitle: this.includeTitle
    };
  }

  static fromJSON(json) {
    return new HeaderFooterConfig(json.content, json);
  }
}

/**
 * 边距配置
 */
export class MarginConfig {
  constructor(top = 20, right = 20, bottom = 20, left = 20) {
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.left = left;
    this.validate();
  }

  validate() {
    [this.top, this.right, this.bottom, this.left].forEach(value => {
      if (typeof value !== 'number' || value < 0) {
        throw new Error('边距值必须是大于等于0的数字');
      }
    });
  }

  toJSON() {
    return {
      top: this.top,
      right: this.right,
      bottom: this.bottom,
      left: this.left
    };
  }

  static fromJSON(json) {
    return new MarginConfig(json.top, json.right, json.bottom, json.left);
  }

  clone() {
    return new MarginConfig(this.top, this.right, this.bottom, this.left);
  }
}

/**
 * 值对象基类
 */
export class ValueObject {
  equals(other) {
    if (!other || !(other instanceof this.constructor)) {
      return false;
    }
    return JSON.stringify(this) === JSON.stringify(other);
  }
}

/**
 * 用户ID值对象
 */
export class UserId {
  constructor(value) {
    this._value = value;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof UserId && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}

/**
 * 聚合根基类
 */
export class AggregateRoot {
  constructor(id) {
    this.id = id;
    this._domainEvents = [];
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  addDomainEvent(event) {
    this._domainEvents.push(event);
  }

  getDomainEvents() {
    return [...this._domainEvents];
  }

  clearDomainEvents() {
    this._domainEvents = [];
  }

  updateTimestamp() {
    this._updatedAt = new Date();
  }

  toJSON() {
    return {
      id: this.id.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}

/**
 * 领域事件基类
 */
export class DomainEvent {
  constructor({ eventName, aggregateId, payload }) {
    this.eventName = eventName;
    this.aggregateId = aggregateId;
    this.payload = payload;
    this.timestamp = new Date();
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 结果对象
 */
export class Result {
  constructor(isSuccess, value, error) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this.value = value;
    this.error = error;
  }

  static ok(value) {
    return new Result(true, value, null);
  }

  static fail(error) {
    return new Result(false, null, error);
  }
}

/**
 * 导出创建事件
 */
export class ExportCreatedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ExportCreated',
      aggregateId: payload.exportId,
      payload
    });
  }

  get exportId() {
    return this.payload.exportId;
  }
  get projectId() {
    return this.payload.projectId;
  }
  get title() {
    return this.payload.title;
  }
  get format() {
    return this.payload.format;
  }
  get requestedBy() {
    return this.payload.requestedBy;
  }
}

/**
 * 导出处理开始事件
 */
export class ExportProcessingStartedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ExportProcessingStarted',
      aggregateId: payload.exportId,
      payload
    });
  }

  get exportId() {
    return this.payload.exportId;
  }
  get projectId() {
    return this.payload.projectId;
  }
  get format() {
    return this.payload.format;
  }
}

/**
 * 导出完成事件
 */
export class ExportCompletedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ExportCompleted',
      aggregateId: payload.exportId,
      payload
    });
  }

  get exportId() {
    return this.payload.exportId;
  }
  get projectId() {
    return this.payload.projectId;
  }
  get fileUrl() {
    return this.payload.fileUrl;
  }
  get fileSize() {
    return this.payload.fileSize;
  }
  get pageCount() {
    return this.payload.pageCount;
  }
}

/**
 * 导出失败事件
 */
export class ExportFailedEvent extends DomainEvent {
  constructor(payload) {
    super({
      eventName: 'ExportFailed',
      aggregateId: payload.exportId,
      payload
    });
  }

  get exportId() {
    return this.payload.exportId;
  }
  get projectId() {
    return this.payload.projectId;
  }
  get errorMessage() {
    return this.payload.errorMessage;
  }
}
