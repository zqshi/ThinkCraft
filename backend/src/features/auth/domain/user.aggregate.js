/**
 * 用户聚合根
 * 管理用户实体的业务逻辑和状态
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { UserId } from './value-objects/user-id.vo.js';
import { Phone } from './value-objects/phone.vo.js';
import { UserStatus } from './value-objects/user-status.vo.js';
import { UserLoggedInEvent } from './events/user-logged-in.event.js';
import { UserLoggedOutEvent } from './events/user-logged-out.event.js';
import { UserCreatedEvent } from './events/user-created.event.js';

export class User extends AggregateRoot {
  constructor(id, status = UserStatus.ACTIVE, phone = null) {
    super(id);
    this._status = status;
    this._phone = phone;
    this._phoneVerified = false;
    this._lastLoginAt = null;
    this._loginAttempts = 0;
    this._lockedUntil = null;
  }

  /**
   * 创建新用户（手机号）
   */
  static createWithPhone(phone) {
    const userId = UserId.generate();
    const user = new User(
      userId,
      UserStatus.ACTIVE,
      new Phone(phone)
    );

    user.addDomainEvent(new UserCreatedEvent(userId.value, phone));

    return user;
  }

  /**
   * 用户登录（手机号）
   */
  loginWithPhone() {
    if (this.isLocked()) {
      throw new Error('账户已被锁定，请稍后再试');
    }

    this._loginAttempts = 0;
    this._lastLoginAt = new Date();
    this.addDomainEvent(new UserLoggedInEvent(this.id.value, this._phone?.value || this.id.value));
  }

  /**
   * 用户登出
   */
  logout() {
    this.addDomainEvent(new UserLoggedOutEvent(this.id.value, this._phone?.value || this.id.value));
  }

  /**
   * 锁定账户
   */
  lockAccount(minutes) {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + minutes);
    this._lockedUntil = lockedUntil;
  }

  /**
   * 解锁账户
   */
  unlockAccount() {
    this._lockedUntil = null;
    this._loginAttempts = 0;
  }

  /**
   * 检查账户是否被锁定
   */
  isLocked() {
    if (!this._lockedUntil) {
      return false;
    }

    const now = new Date();
    if (now > this._lockedUntil) {
      this.unlockAccount();
      return false;
    }

    return true;
  }

  /**
   * 绑定手机号
   */
  bindPhone(phone) {
    if (this._phone) {
      throw new Error('手机号已绑定');
    }

    this._phone = new Phone(phone);
    this._phoneVerified = false;
  }

  /**
   * 验证手机号
   */
  verifyPhone() {
    if (!this._phone) {
      throw new Error('未绑定手机号');
    }

    this._phoneVerified = true;
  }

  /**
   * 更换手机号
   */
  changePhone(newPhone) {
    this._phone = new Phone(newPhone);
    this._phoneVerified = false;
  }

  /**
   * 验证用户状态
   */
  validate() {
    if (!this._phone) {
      throw new Error('手机号不能为空');
    }

    if (this._status !== UserStatus.ACTIVE) {
      throw new Error('用户状态异常');
    }
  }

  // Getters
  get phone() {
    return this._phone;
  }
  get phoneVerified() {
    return this._phoneVerified;
  }
  get status() {
    return this._status;
  }
  get lastLoginAt() {
    return this._lastLoginAt;
  }
  get loginAttempts() {
    return this._loginAttempts;
  }
  get lockedUntil() {
    return this._lockedUntil;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      phone: this._phone ? this._phone.value : null,
      phoneVerified: this._phoneVerified,
      status: this._status.value,
      lastLoginAt: this._lastLoginAt,
      loginAttempts: this._loginAttempts,
      lockedUntil: this._lockedUntil
    };
  }
}
