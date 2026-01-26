/**
 * 创意ID值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class IdeaId extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建创意ID
   */
  static fromString(value) {
    return new IdeaId(value);
  }

  /**
   * 验证创意ID格式
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('创意ID必须是字符串');
    }

    if (this._value.length < 1 || this._value.length > 50) {
      throw new Error('创意ID长度必须在1-50个字符之间');
    }

    // 只允许字母、数字、下划线和连字符
    if (!/^[a-zA-Z0-9_-]+$/.test(this._value)) {
      throw new Error('创意ID只能包含字母、数字、下划线和连字符');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof IdeaId)) {
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
