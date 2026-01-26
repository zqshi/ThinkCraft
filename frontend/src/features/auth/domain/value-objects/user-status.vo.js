/**
 * 用户状态值对象
 */
export class UserStatus {
  static ACTIVE = new UserStatus('ACTIVE', '活跃');
  static INACTIVE = new UserStatus('INACTIVE', '禁用');
  static PENDING = new UserStatus('PENDING', '待激活');
  static SUSPENDED = new UserStatus('SUSPENDED', '暂停');

  constructor(value, label) {
    this._value = value;
    this._label = label;
  }

  get value() {
    return this._value;
  }

  get label() {
    return this._label;
  }

  /**
   * 检查是否为活跃状态
   */
  isActive() {
    return this === UserStatus.ACTIVE;
  }

  /**
   * 检查是否为禁用状态
   */
  isInactive() {
    return this === UserStatus.INACTIVE;
  }

  /**
   * 检查是否可以登录
   */
  canLogin() {
    return this.isActive();
  }

  equals(other) {
    if (!other || !(other instanceof UserStatus)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }

  /**
   * 从字符串值获取状态实例
   */
  static fromValue(value) {
    const statuses = [
      UserStatus.ACTIVE,
      UserStatus.INACTIVE,
      UserStatus.PENDING,
      UserStatus.SUSPENDED
    ];
    const status = statuses.find(s => s.value === value);
    if (!status) {
      throw new Error(`无效的用户状态: ${value}`);
    }
    return status;
  }

  /**
   * 获取所有可用状态
   */
  static getAll() {
    return [UserStatus.ACTIVE, UserStatus.INACTIVE, UserStatus.PENDING, UserStatus.SUSPENDED];
  }
}
