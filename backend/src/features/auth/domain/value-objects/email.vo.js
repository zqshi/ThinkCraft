/**
 * 邮箱值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class Email extends ValueObject {
  constructor(props) {
    // 如果传入的是字符串，转换为对象
    if (typeof props === 'string') {
      props = { value: props.trim().toLowerCase() };
    } else if (props && props.value) {
      props = { value: props.value.trim().toLowerCase() };
    }
    super(props);
  }

  /**
   * 验证邮箱格式
   */
  validate() {
    if (!this._props.value || typeof this._props.value !== 'string') {
      throw new Error('邮箱不能为空');
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this._props.value)) {
      throw new Error('邮箱格式不正确');
    }

    // 长度限制
    if (this._props.value.length > 100) {
      throw new Error('邮箱长度不能超过100个字符');
    }
  }

  get value() {
    return this._props.value;
  }

  get domain() {
    return this._props.value.split('@')[1];
  }

  get localPart() {
    return this._props.value.split('@')[0];
  }

  equals(other) {
    if (!(other instanceof Email)) {
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
