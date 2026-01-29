/**
 * 项目模式值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ProjectMode extends ValueObject {
  static DEVELOPMENT = new ProjectMode('development');

  constructor(value) {
    super();
    this._value = value;
  }

  /**
   * 从字符串创建项目模式
   */
  static fromString(value) {
    const normalized = value || 'development';
    const mode = new ProjectMode(normalized);

    // 检查是否是预定义模式
    const predefinedModes = [ProjectMode.DEVELOPMENT];
    const found = predefinedModes.find(m => m.value === normalized);

    if (!found) {
      throw new Error(`无效的项目模式: ${value}`);
    }

    return found;
  }

  /**
   * 验证模式值
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('项目模式不能为空');
    }

    const validModes = ['development'];
    if (!validModes.includes(this._value)) {
      throw new Error(`无效的项目模式: ${this._value}`);
    }
  }

  /**
   * 检查是否是Development模式
   */
  isDevelopment() {
    return this._value === 'development';
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ProjectMode)) {
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
