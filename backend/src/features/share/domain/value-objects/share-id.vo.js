/**
 * Share ID 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ShareId extends ValueObject {
  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    if (!this.props.value || typeof this.props.value !== 'string') {
      throw new Error('Share ID must be a non-empty string');
    }

    if (!/^share_[a-zA-Z0-9_]+$/.test(this.props.value)) {
      throw new Error(
        'Share ID must start with "share_" and contain only alphanumeric characters and underscores'
      );
    }
  }
}
