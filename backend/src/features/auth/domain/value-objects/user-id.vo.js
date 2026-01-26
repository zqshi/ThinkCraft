/**
 * 用户ID值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class UserId extends ValueObject {
  constructor(props) {
    super(props);
  }

  /**
   * 生成新的用户ID
   */
  static generate() {
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    return new UserId({ value: id });
  }

  /**
   * 从字符串创建用户ID
   */
  static fromString(value) {
    return new UserId({ value });
  }

  /**
   * 验证用户ID格式
   */
  validate() {
    if (!this._props.value || typeof this._props.value !== 'string') {
      throw new Error('用户ID必须是字符串');
    }

    if (this._props.value.length < 3 || this._props.value.length > 50) {
      throw new Error('用户ID长度必须在3-50个字符之间');
    }

    // 只允许字母、数字、下划线和连字符
    if (!/^[a-zA-Z0-9_-]+$/.test(this._props.value)) {
      throw new Error('用户ID只能包含字母、数字、下划线和连字符');
    }
  }

  get value() {
    return this._props.value;
  }

  equals(other) {
    if (!(other instanceof UserId)) {
      return false;
    }
    return this._props.value === other._props.value;
  }

  toString() {
    return this._props.value;
  }

  toJSON() {
    return this._props.value;
  }
}
