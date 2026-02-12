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
