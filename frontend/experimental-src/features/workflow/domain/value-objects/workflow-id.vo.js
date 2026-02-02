import { ValueObject } from '../../../../shared/domain/value-object.base.js';

/**
 * 工作流ID值对象
 */
export class WorkflowId extends ValueObject {
  constructor(value) {
    super(value);
    this._validate();
  }

  _validate() {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('工作流ID必须是字符串');
    }

    if (this.value.length < 1 || this.value.length > 100) {
      throw new Error('工作流ID长度必须在1-100之间');
    }
  }

  static create(value) {
    return new WorkflowId(value);
  }

  static generate() {
    return new WorkflowId(`workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  toString() {
    return this.value;
  }
}
