/**
 * 导出ID值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ExportId extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 生成新的导出ID
   */
  static generate() {
    return new ExportId(`export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  /**
   * 从字符串创建
   */
  static fromString(value) {
    return new ExportId(value);
  }

  /**
   * 验证ID格式
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('导出ID必须是字符串');
    }

    if (!/^export_[a-zA-Z0-9_]+$/.test(this._value)) {
      throw new Error('导出ID必须以"export_"开头，且只能包含字母数字和下划线');
    }
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
    if (!(other instanceof ExportId)) {
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
