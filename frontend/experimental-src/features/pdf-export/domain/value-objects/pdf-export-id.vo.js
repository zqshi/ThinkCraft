import { ValueObject } from '../../../../shared/domain/value-object.base.js';

/**
 * PDF导出ID值对象
 */
export class PdfExportId extends ValueObject {
  constructor(value) {
    super(value);
    this._validate();
  }

  _validate() {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('PDF导出ID必须是字符串');
    }

    if (this.value.length < 1 || this.value.length > 100) {
      throw new Error('PDF导出ID长度必须在1-100之间');
    }
  }

  static create(value) {
    return new PdfExportId(value);
  }

  static generate() {
    return new PdfExportId(`pdf_export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  toString() {
    return this.value;
  }
}
