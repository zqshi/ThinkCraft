import { ValueObject } from '../../../../shared/domain/value-object.base.js';

/**
 * PDF导出状态枚举
 */
export class PdfExportStatus extends ValueObject {
  static PENDING = 'pending';
  static PROCESSING = 'processing';
  static COMPLETED = 'completed';
  static FAILED = 'failed';

  constructor(value) {
    super(value);
    this._validate();
  }

  _validate() {
    const validStatuses = [
      PdfExportStatus.PENDING,
      PdfExportStatus.PROCESSING,
      PdfExportStatus.COMPLETED,
      PdfExportStatus.FAILED
    ];

    if (!validStatuses.includes(this.value)) {
      throw new Error(`无效的PDF导出状态: ${this.value}`);
    }
  }

  static create(value) {
    return new PdfExportStatus(value);
  }

  /**
   * 检查是否已完成
   */
  isCompleted() {
    return this.value === PdfExportStatus.COMPLETED;
  }

  /**
   * 检查是否失败
   */
  isFailed() {
    return this.value === PdfExportStatus.FAILED;
  }

  /**
   * 检查是否进行中
   */
  isProcessing() {
    return this.value === PdfExportStatus.PROCESSING;
  }

  toString() {
    return this.value;
  }
}
