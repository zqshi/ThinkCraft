/**
 * 用户状态值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class UserStatus extends ValueObject {
  static ACTIVE = new UserStatus({ value: 'active' });
  static INACTIVE = new UserStatus({ value: 'inactive' });
  static LOCKED = new UserStatus({ value: 'locked' });
  static DELETED = new UserStatus({ value: 'deleted' });

  constructor(props) {
    super(props);
  }

  /**
   * 从字符串创建用户状态
   */
  static fromString(value) {
    // 检查是否是预定义状态
    const predefinedStatuses = [
      UserStatus.ACTIVE,
      UserStatus.INACTIVE,
      UserStatus.LOCKED,
      UserStatus.DELETED
    ];
    const found = predefinedStatuses.find(s => s.value === value);

    if (!found) {
      throw new Error(`无效的用户状态: ${value}`);
    }

    return found;
  }

  /**
   * 验证状态值
   */
  validate() {
    if (!this._props.value || typeof this._props.value !== 'string') {
      throw new Error('用户状态不能为空');
    }

    const validStatuses = ['active', 'inactive', 'locked', 'deleted'];
    if (!validStatuses.includes(this._props.value)) {
      throw new Error(`无效的用户状态: ${this._props.value}`);
    }
  }

  /**
   * 检查是否是活动状态
   */
  isActive() {
    return this._props.value === 'active';
  }

  /**
   * 检查是否被锁定
   */
  isLocked() {
    return this._props.value === 'locked';
  }

  /**
   * 检查是否已删除
   */
  isDeleted() {
    return this._props.value === 'deleted';
  }

  get value() {
    return this._props.value;
  }

  equals(other) {
    if (!(other instanceof UserStatus)) {
      return false;
    }
    return this._props.value === other._props.value;
  }

  toString() {
    return this._props.value;
  }

  toJSON() {
    return this._props.value;
  }
}
