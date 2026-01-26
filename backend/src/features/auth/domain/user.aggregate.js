/**
 * 用户聚合根
 * 管理用户实体的业务逻辑和状态
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { UserId } from './value-objects/user-id.vo.js';
import { Username } from './value-objects/username.vo.js';
import { Email } from './value-objects/email.vo.js';
import { Phone } from './value-objects/phone.vo.js';
import { Password } from './value-objects/password.vo.js';
import { UserStatus } from './value-objects/user-status.vo.js';
import { UserLoggedInEvent } from './events/user-logged-in.event.js';
import { UserLoggedOutEvent } from './events/user-logged-out.event.js';
import { UserCreatedEvent } from './events/user-created.event.js';

export class User extends AggregateRoot {
  constructor(id, username, email, password, status = UserStatus.ACTIVE, phone = null) {
    super(id);
    this._username = username;
    this._email = email;
    this._password = password;
    this._status = status;
    this._phone = phone;
    this._phoneVerified = false;
    this._lastLoginAt = null;
    this._loginAttempts = 0;
    this._lockedUntil = null;
  }

  /**
   * 创建新用户
   */
  static create(username, email, password) {
    const userId = UserId.generate();
    const user = new User(
      userId,
      new Username(username),
      new Email(email),
      Password.create(password)
    );

    // 添加用户创建事件
    user.addDomainEvent(new UserCreatedEvent(userId.value, username, email));

    return user;
  }

  /**
   * 用户登录
   */
  login(password) {
    // 检查账户是否被锁定
    if (this.isLocked()) {
      throw new Error('账户已被锁定，请稍后再试');
    }

    // 验证密码
    if (!this._password.verify(password)) {
      this._loginAttempts++;

      // 连续失败5次锁定账户
      if (this._loginAttempts >= 5) {
        this.lockAccount(30); // 锁定30分钟
        throw new Error('密码错误次数过多，账户已锁定30分钟');
      }

      throw new Error('密码错误');
    }

    // 登录成功
    this._loginAttempts = 0;
    this._lastLoginAt = new Date();
    this.addDomainEvent(new UserLoggedInEvent(this.id.value, this._username.value));
  }

  /**
   * 用户登出
   */
  logout() {
    this.addDomainEvent(new UserLoggedOutEvent(this.id.value, this._username.value));
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
   * 修改密码
   */
  changePassword(oldPassword, newPassword) {
    if (!this._password.verify(oldPassword)) {
      throw new Error('原密码错误');
    }

    this._password = Password.create(newPassword);
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
    if (!this._username || !this._email || !this._password) {
      throw new Error('用户信息不完整');
    }

    if (this._status !== UserStatus.ACTIVE) {
      throw new Error('用户状态异常');
    }
  }

  // Getters
  get username() {
    return this._username;
  }
  get email() {
    return this._email;
  }
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
      username: this._username.value,
      email: this._email.value,
      phone: this._phone ? this._phone.value : null,
      phoneVerified: this._phoneVerified,
      status: this._status.value,
      lastLoginAt: this._lastLoginAt,
      loginAttempts: this._loginAttempts,
      lockedUntil: this._lockedUntil
    };
  }
}
