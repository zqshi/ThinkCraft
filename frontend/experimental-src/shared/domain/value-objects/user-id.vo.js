import { ValueObject } from '../value-object.base.js';

/**
 * 用户ID值对象
 */
export class UserId extends ValueObject {
  constructor(value) {
    super(value);
    this._validate();
  }

  /**
   * 验证用户ID格式
   */
  _validate() {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('用户ID必须是字符串');
    }

    if (this.value.length < 1 || this.value.length > 100) {
      throw new Error('用户ID长度必须在1-100之间');
    }
  }

  /**
   * 创建用户ID
   */
  static create(value) {
    return new UserId(value);
  }

  /**
   * 生成新的用户ID
   */
  static generate() {
    return new UserId(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  /**
   * 获取字符串表示
   */
  toString() {
    return this.value;
  }
}
