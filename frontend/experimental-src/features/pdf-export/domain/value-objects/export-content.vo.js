/**
 * 导出内容值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ExportContent extends ValueObject {
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
      throw new Error('导出内容必须是字符串');
    }

    if (this._value.length > 1000000) {
      // 1MB限制
      throw new Error('导出内容不能超过1MB');
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

  /**
   * 获取字符数统计
   */
  getCharCount() {
    return this._value.length;
  }

  /**
   * 获取段落数
   */
  getParagraphCount() {
    return this._value.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ExportContent)) {
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
