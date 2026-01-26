/**
 * 手机号值对象
 * 封装手机号的验证逻辑
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class Phone extends ValueObject {
  constructor(value) {
    super({ value });
    this.validate();
  }

  validate() {
    if (!this.props.value) {
      throw new Error('手机号不能为空');
    }

    // 中国大陆手机号：1开头，第二位是3-9，共11位
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(this.props.value)) {
      throw new Error('手机号格式不正确');
    }
  }

  get value() {
    return this.props.value;
  }

  /**
   * 手机号脱敏
   * @returns {string}
   */
  mask() {
    const phone = this.props.value;
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }

  /**
   * 验证手机号格式（静态方法）
   * @param {string} phone
   * @returns {boolean}
   */
  static isValid(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }
}
