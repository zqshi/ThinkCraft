/**
 * 密码值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';
import crypto from 'crypto';

export class Password extends ValueObject {
  constructor(props) {
    // 如果传入的是字符串，转换为对象
    if (typeof props === 'string') {
      props = { hash: props };
    }
    super(props);
  }

  /**
   * 创建密码（加密）
   */
  static create(plainPassword) {
    Password.validateStrength(plainPassword);
    const hash = Password._hashPassword(plainPassword);
    return new Password({ hash });
  }

  /**
   * 从哈希创建密码
   */
  static fromHash(hash) {
    return new Password({ hash });
  }

  /**
   * 验证密码
   */
  verify(plainPassword) {
    const hash = Password._hashPassword(plainPassword);
    return this._props.hash === hash;
  }

  /**
   * 验证密码强度
   */
  static validateStrength(plainPassword) {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('密码不能为空');
    }

    if (plainPassword.length < 6) {
      throw new Error('密码长度至少为6位');
    }

    if (plainPassword.length > 50) {
      throw new Error('密码长度不能超过50位');
    }

    // 检查复杂度
    let strength = 0;

    // 包含小写字母
    if (/[a-z]/.test(plainPassword)) {
      strength++;
    }

    // 包含大写字母
    if (/[A-Z]/.test(plainPassword)) {
      strength++;
    }

    // 包含数字
    if (/[0-9]/.test(plainPassword)) {
      strength++;
    }

    // 包含特殊字符
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(plainPassword)) {
      strength++;
    }

    if (strength < 2) {
      throw new Error('密码强度不够，请包含大小写字母、数字或特殊字符中的至少两种');
    }
  }

  /**
   * 哈希密码（使用SHA256）
   */
  static _hashPassword(plainPassword) {
    return crypto.createHash('sha256').update(plainPassword).digest('hex');
  }

  validate() {
    if (!this._props.hash || typeof this._props.hash !== 'string') {
      throw new Error('密码哈希不能为空');
    }

    if (this._props.hash.length !== 64) {
      throw new Error('密码哈希格式不正确');
    }
  }

  get hash() {
    return this._props.hash;
  }

  equals(other) {
    if (!(other instanceof Password)) {
      return false;
    }
    return this._props.hash === other._props.hash;
  }

  toString() {
    return '[Password]';
  }

  toJSON() {
    return '[Password]';
  }
}
