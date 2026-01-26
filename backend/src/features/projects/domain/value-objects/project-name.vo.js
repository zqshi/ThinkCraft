/**
 * 项目名称值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ProjectName extends ValueObject {
  constructor(value) {
    super();
    this._value = value.trim();
    this.validate();
  }

  /**
   * 验证项目名称格式
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('项目名称不能为空');
    }

    if (this._value.length < 1 || this._value.length > 100) {
      throw new Error('项目名称长度必须在1-100个字符之间');
    }

    // 不允许包含特殊字符
    if (/[<>"'&]/.test(this._value)) {
      throw new Error('项目名称不能包含特殊字符: <>"\'&');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ProjectName)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}
