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
