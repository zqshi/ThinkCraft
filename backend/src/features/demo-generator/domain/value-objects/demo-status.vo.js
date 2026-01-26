/**
 * Demo状态 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class DemoStatus extends ValueObject {
  static PENDING = 'pending';
  static GENERATING = 'generating';
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
      DemoStatus.PENDING,
      DemoStatus.GENERATING,
      DemoStatus.COMPLETED,
      DemoStatus.FAILED
    ];
    if (!validStatuses.includes(this.props.value)) {
      throw new Error(
        `Invalid demo status: ${this.props.value}. Must be one of: ${validStatuses.join(', ')}`
      );
    }
  }

  isPending() {
    return this.props.value === DemoStatus.PENDING;
  }

  isGenerating() {
    return this.props.value === DemoStatus.GENERATING;
  }

  isCompleted() {
    return this.props.value === DemoStatus.COMPLETED;
  }

  isFailed() {
    return this.props.value === DemoStatus.FAILED;
  }
}
