/**
 * Export选项 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ExportOptions extends ValueObject {
  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    if (!this.props.value || typeof this.props.value !== 'object') {
      throw new Error('Export options must be an object');
    }

    // 验证常见选项
    const options = this.props.value;

    if (
      options.includeTableOfContents !== undefined &&
      typeof options.includeTableOfContents !== 'boolean'
    ) {
      throw new Error('includeTableOfContents must be a boolean');
    }

    if (options.pageSize !== undefined && !['A4', 'Letter', 'Legal'].includes(options.pageSize)) {
      throw new Error('pageSize must be one of: A4, Letter, Legal');
    }

    if (
      options.orientation !== undefined &&
      !['portrait', 'landscape'].includes(options.orientation)
    ) {
      throw new Error('orientation must be one of: portrait, landscape');
    }

    if (options.margins !== undefined) {
      const validMargins = ['top', 'bottom', 'left', 'right'];
      for (const margin of validMargins) {
        if (
          options.margins[margin] !== undefined &&
          (typeof options.margins[margin] !== 'number' || options.margins[margin] < 0)
        ) {
          throw new Error(`margin.${margin} must be a non-negative number`);
        }
      }
    }
  }

  getPageSize() {
    return this.props.value.pageSize || 'A4';
  }

  getOrientation() {
    return this.props.value.orientation || 'portrait';
  }

  getMargins() {
    return {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
      ...this.props.value.margins
    };
  }

  includeTableOfContents() {
    return this.props.value.includeTableOfContents !== false;
  }
}
