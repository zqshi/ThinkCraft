/**
 * 导出状态值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ExportStatus extends ValueObject {
  static PENDING = new ExportStatus('PENDING');
  static PROCESSING = new ExportStatus('PROCESSING');
  static COMPLETED = new ExportStatus('COMPLETED');
  static FAILED = new ExportStatus('FAILED');

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
      throw new Error(`无效的导出状态: ${value}`);
    }
    return status;
  }

  /**
   * 获取所有有效状态
   */
  static getValidStatuses() {
    return ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
  }

  /**
   * 验证状态值
   */
  validate() {
    const validStatuses = ExportStatus.getValidStatuses();
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的导出状态: ${this._value}`);
    }
  }

  /**
   * 是否待处理
   */
  isPending() {
    return this._value === 'PENDING';
  }

  /**
   * 是否处理中
   */
  isProcessing() {
    return this._value === 'PROCESSING';
  }

  /**
   * 是否已完成
   */
  isCompleted() {
    return this._value === 'COMPLETED';
  }

  /**
   * 是否失败
   */
  isFailed() {
    return this._value === 'FAILED';
  }

  /**
   * 是否可以处理
   */
  canProcess() {
    return this._value === 'PENDING' || this._value === 'FAILED';
  }

  /**
   * 是否可以更新
   */
  canUpdate() {
    return this._value === 'PENDING' || this._value === 'FAILED';
  }

  /**
   * 获取显示文本
   */
  getDisplayText() {
    const statusMap = {
      PENDING: '待处理',
      PROCESSING: '处理中',
      COMPLETED: '已完成',
      FAILED: '处理失败'
    };
    return statusMap[this._value] || this._value;
  }

  /**
   * 获取状态颜色
   */
  getStatusColor() {
    const colorMap = {
      PENDING: 'orange',
      PROCESSING: 'blue',
      COMPLETED: 'green',
      FAILED: 'red'
    };
    return colorMap[this._value] || 'gray';
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ExportStatus)) {
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
