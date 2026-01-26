/**
 * 项目状态值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ProjectStatus extends ValueObject {
  static PLANNING = new ProjectStatus('planning');
  static IN_PROGRESS = new ProjectStatus('in_progress');
  static TESTING = new ProjectStatus('testing');
  static COMPLETED = new ProjectStatus('completed');
  static ON_HOLD = new ProjectStatus('on_hold');
  static CANCELLED = new ProjectStatus('cancelled');
  static DELETED = new ProjectStatus('deleted');

  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建项目状态
   */
  static fromString(value) {
    const status = new ProjectStatus(value);

    // 检查是否是预定义状态
    const predefinedStatuses = [
      ProjectStatus.PLANNING,
      ProjectStatus.IN_PROGRESS,
      ProjectStatus.TESTING,
      ProjectStatus.COMPLETED,
      ProjectStatus.ON_HOLD,
      ProjectStatus.CANCELLED,
      ProjectStatus.DELETED
    ];
    const found = predefinedStatuses.find(s => s.value === value);

    if (!found) {
      throw new Error(`无效的项目状态: ${value}`);
    }

    return found;
  }

  /**
   * 验证状态值
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('项目状态不能为空');
    }

    const validStatuses = [
      'planning',
      'in_progress',
      'testing',
      'completed',
      'on_hold',
      'cancelled',
      'deleted'
    ];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的项目状态: ${this._value}`);
    }
  }

  /**
   * 检查是否是规划状态
   */
  isPlanning() {
    return this._value === 'planning';
  }

  /**
   * 检查是否是进行中状态
   */
  isInProgress() {
    return this._value === 'in_progress';
  }

  /**
   * 检查是否是测试状态
   */
  isTesting() {
    return this._value === 'testing';
  }

  /**
   * 检查是否是已完成状态
   */
  isCompleted() {
    return this._value === 'completed';
  }

  /**
   * 检查是否是暂停状态
   */
  isOnHold() {
    return this._value === 'on_hold';
  }

  /**
   * 检查是否是已取消状态
   */
  isCancelled() {
    return this._value === 'cancelled';
  }

  /**
   * 检查是否是已删除状态
   */
  isDeleted() {
    return this._value === 'deleted';
  }

  /**
   * 检查是否是活跃状态
   */
  isActive() {
    return ['planning', 'in_progress', 'testing'].includes(this._value);
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ProjectStatus)) {
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
