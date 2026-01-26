/**
 * 商业计划书状态值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class BusinessPlanStatus extends ValueObject {
  static DRAFT = new BusinessPlanStatus('DRAFT');
  static GENERATING = new BusinessPlanStatus('GENERATING');
  static COMPLETED = new BusinessPlanStatus('COMPLETED');
  static FAILED = new BusinessPlanStatus('FAILED');

  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建状态
   */
  static fromString(value) {
    const status = this[value.toUpperCase()];
    if (!status) {
      throw new Error(`无效的商业计划书状态: ${value}`);
    }
    return status;
  }

  /**
   * 验证状态值
   */
  validate() {
    const validStatuses = ['DRAFT', 'GENERATING', 'COMPLETED', 'FAILED'];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的商业计划书状态: ${this._value}`);
    }
  }

  /**
   * 获取值
   */
  get value() {
    return this._value;
  }

  /**
   * 是否是草稿状态
   */
  isDraft() {
    return this._value === 'DRAFT';
  }

  /**
   * 是否是生成中状态
   */
  isGenerating() {
    return this._value === 'GENERATING';
  }

  /**
   * 是否是已完成状态
   */
  isCompleted() {
    return this._value === 'COMPLETED';
  }

  /**
   * 是否是失败状态
   */
  isFailed() {
    return this._value === 'FAILED';
  }

  /**
   * 是否可以编辑
   */
  canEdit() {
    return this._value === 'DRAFT' || this._value === 'FAILED';
  }

  /**
   * 是否可以生成
   */
  canGenerate() {
    return this._value === 'DRAFT' || this._value === 'FAILED';
  }

  /**
   * 相等性比较
   */
  equals(other) {
    if (!(other instanceof BusinessPlanStatus)) {
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
