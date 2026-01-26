/**
 * Demo ID 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class DemoId extends ValueObject {
  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    if (!this.props.value || typeof this.props.value !== 'string') {
      throw new Error('Demo ID must be a non-empty string');
    }

    if (!/^demo_[a-zA-Z0-9_]+$/.test(this.props.value)) {
      throw new Error(
        'Demo ID must start with "demo_" and contain only alphanumeric characters and underscores'
      );
    }
  }
}
