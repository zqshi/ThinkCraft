/**
 * 章节ID值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ChapterId extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 生成新的章节ID
   */
  static generate() {
    return new ChapterId(`ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  /**
   * 验证ID格式
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('章节ID必须是字符串');
    }

    if (this._value.length < 1 || this._value.length > 100) {
      throw new Error('章节ID长度必须在1-100之间');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ChapterId)) {
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
