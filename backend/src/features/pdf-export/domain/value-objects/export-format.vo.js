/**
 * Export格式 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ExportFormat extends ValueObject {
  static PDF = 'pdf';
  static DOCX = 'docx';
  static HTML = 'html';
  static MARKDOWN = 'markdown';

  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    const validFormats = [
      ExportFormat.PDF,
      ExportFormat.DOCX,
      ExportFormat.HTML,
      ExportFormat.MARKDOWN
    ];
    if (!validFormats.includes(this.props.value)) {
      throw new Error(
        `Invalid export format: ${this.props.value}. Must be one of: ${validFormats.join(', ')}`
      );
    }
  }

  isPdf() {
    return this.props.value === ExportFormat.PDF;
  }

  isDocx() {
    return this.props.value === ExportFormat.DOCX;
  }

  isHtml() {
    return this.props.value === ExportFormat.HTML;
  }

  isMarkdown() {
    return this.props.value === ExportFormat.MARKDOWN;
  }

  getFileExtension() {
    return this.props.value;
  }
}
