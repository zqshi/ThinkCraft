/**
 * 导出格式值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ExportFormat extends ValueObject {
  static PDF = new ExportFormat('PDF');
  static WORD = new ExportFormat('WORD');
  static EXCEL = new ExportFormat('EXCEL');
  static POWERPOINT = new ExportFormat('POWERPOINT');
  static HTML = new ExportFormat('HTML');
  static MARKDOWN = new ExportFormat('MARKDOWN');

  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建格式
   */
  static fromString(value) {
    const format = this[value.toUpperCase()];
    if (!format) {
      throw new Error(`无效的导出格式: ${value}`);
    }
    return format;
  }

  /**
   * 获取所有有效格式
   */
  static getValidFormats() {
    return ['PDF', 'WORD', 'EXCEL', 'POWERPOINT', 'HTML', 'MARKDOWN'];
  }

  /**
   * 验证格式
   */
  validate() {
    const validFormats = ExportFormat.getValidFormats();
    if (!validFormats.includes(this._value)) {
      throw new Error(`无效的导出格式: ${this._value}`);
    }
  }

  /**
   * 获取显示名称
   */
  getDisplayName() {
    const displayNames = {
      PDF: 'PDF文档',
      WORD: 'Word文档',
      EXCEL: 'Excel表格',
      POWERPOINT: 'PPT演示文稿',
      HTML: 'HTML网页',
      MARKDOWN: 'Markdown文档'
    };
    return displayNames[this._value] || this._value;
  }

  /**
   * 获取文件扩展名
   */
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

  /**
   * 是否支持分页
   */
  supportsPagination() {
    return ['PDF', 'WORD'].includes(this._value);
  }

  /**
   * 是否支持样式
   */
  supportsStyling() {
    return ['PDF', 'WORD', 'HTML'].includes(this._value);
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ExportFormat)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}
