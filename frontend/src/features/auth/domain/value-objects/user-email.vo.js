/**
 * 用户邮箱值对象
 */
export class UserEmail {
  constructor(value) {
    this._value = this._validateAndNormalize(value);
  }

  _validateAndNormalize(email) {
    if (!email) {
      throw new Error('邮箱不能为空');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 简单的邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new Error('邮箱格式不正确');
    }

    return normalizedEmail;
  }

  get value() {
    return this._value;
  }

  get domain() {
    return this._value.split('@')[1];
  }

  get localPart() {
    return this._value.split('@')[0];
  }

  equals(other) {
    if (!other || !(other instanceof UserEmail)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }

  /**
   * 检查是否为常见的邮箱提供商
   */
  isCommonProvider() {
    const commonProviders = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      '163.com',
      'qq.com',
      '126.com',
      'sina.com',
      'sohu.com'
    ];
    return commonProviders.includes(this.domain);
  }

  /**
   * 检查是否为企业邮箱
   */
  isCorporateEmail() {
    return !this.isCommonProvider();
  }
}
