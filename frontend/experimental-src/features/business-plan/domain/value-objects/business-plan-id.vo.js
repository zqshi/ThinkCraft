/**
 * 商业计划书ID值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class BusinessPlanId extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 生成新的商业计划书ID
   */
  static generate() {
    return new BusinessPlanId(`bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  /**
   * 从字符串创建
   */
  static fromString(value) {
    return new BusinessPlanId(value);
  }

  /**
   * 验证ID格式
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('商业计划书ID必须是字符串');
    }

    if (this._value.length < 1 || this._value.length > 100) {
      throw new Error('商业计划书ID长度必须在1-100之间');
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
    if (!(other instanceof BusinessPlanId)) {
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
