import { ValueObject } from '../value-object.base.js';

/**
 * 项目ID值对象
 */
export class ProjectId extends ValueObject {
  constructor(value) {
    super(value);
    this._validate();
  }

  /**
   * 验证项目ID格式
   */
  _validate() {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('项目ID必须是字符串');
    }

    if (this.value.length < 1 || this.value.length > 100) {
      throw new Error('项目ID长度必须在1-100之间');
    }
  }

  /**
   * 创建项目ID
   */
  static create(value) {
    return new ProjectId(value);
  }

  /**
   * 生成新的项目ID
   */
  static generate() {
    return new ProjectId(`project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  /**
   * 获取字符串表示
   */
  toString() {
    return this.value;
  }
}
