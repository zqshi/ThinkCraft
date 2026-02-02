/**
 * 章节标题值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ChapterTitle extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 验证标题
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('章节标题不能为空且必须是字符串');
    }

    const trimmedValue = this._value.trim();
    if (trimmedValue.length === 0) {
      throw new Error('章节标题不能为空');
    }

    if (trimmedValue.length > 100) {
      throw new Error('章节标题不能超过100个字符');
    }

    // 确保保存的是修剪后的值
    this._value = trimmedValue;
  }

  /**
   * 获取值
   */
  get value() {
    return this._value;
  }

  /**
   * 相等性比较
   */
  equals(other) {
    if (!(other instanceof ChapterTitle)) {
      return false;
    }
    return this._value === other._value;
  }

  /**
   * 转换为字符串
   */
  toString() {
    return this._value;
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return this._value;
  }
}
