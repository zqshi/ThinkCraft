/**
 * 商业计划书标题值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class BusinessPlanTitle extends ValueObject {
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
      throw new Error('商业计划书标题不能为空且必须是字符串');
    }

    const trimmedValue = this._value.trim();
    if (trimmedValue.length === 0) {
      throw new Error('商业计划书标题不能为空');
    }

    if (trimmedValue.length > 200) {
      throw new Error('商业计划书标题不能超过200个字符');
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
    if (!(other instanceof BusinessPlanTitle)) {
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
