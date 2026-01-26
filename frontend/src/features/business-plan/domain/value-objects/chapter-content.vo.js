/**
 * 章节内容值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ChapterContent extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 验证内容
   */
  validate() {
    if (typeof this._value !== 'string') {
      throw new Error('章节内容必须是字符串');
    }

    if (this._value.length > 50000) {
      throw new Error('章节内容不能超过50000个字符');
    }
  }

  /**
   * 获取内容长度
   */
  get length() {
    return this._value.length;
  }

  /**
   * 是否为空
   */
  isEmpty() {
    return this._value.length === 0;
  }

  /**
   * 获取摘要（前200字符）
   */
  getSummary(maxLength = 200) {
    if (this._value.length <= maxLength) {
      return this._value;
    }
    return this._value.substring(0, maxLength) + '...';
  }

  /**
   * 获取字数统计
   */
  getWordCount() {
    return this._value
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ChapterContent)) {
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
