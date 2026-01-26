/**
 * Export ID 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ExportId extends ValueObject {
  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    if (!this.props.value || typeof this.props.value !== 'string') {
      throw new Error('Export ID must be a non-empty string');
    }

    if (!/^export_[a-zA-Z0-9_]+$/.test(this.props.value)) {
      throw new Error(
        'Export ID must start with "export_" and contain only alphanumeric characters and underscores'
      );
    }
  }
}
