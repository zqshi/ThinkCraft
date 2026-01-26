/**
 * Export状态 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ExportStatus extends ValueObject {
  static PENDING = 'pending';
  static PROCESSING = 'processing';
  static COMPLETED = 'completed';
  static FAILED = 'failed';

  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    const validStatuses = [
      ExportStatus.PENDING,
      ExportStatus.PROCESSING,
      ExportStatus.COMPLETED,
      ExportStatus.FAILED
    ];
    if (!validStatuses.includes(this.props.value)) {
      throw new Error(
        `Invalid export status: ${this.props.value}. Must be one of: ${validStatuses.join(', ')}`
      );
    }
  }

  isPending() {
    return this.props.value === ExportStatus.PENDING;
  }

  isProcessing() {
    return this.props.value === ExportStatus.PROCESSING;
  }

  isCompleted() {
    return this.props.value === ExportStatus.COMPLETED;
  }

  isFailed() {
    return this.props.value === ExportStatus.FAILED;
  }
}
