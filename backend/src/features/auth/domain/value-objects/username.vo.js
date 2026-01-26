/**
 * 用户名值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class Username extends ValueObject {
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
   * 验证用户名格式
   */
  validate() {
    if (!this._props.value || typeof this._props.value !== 'string') {
      throw new Error('用户名不能为空');
    }

    if (this._props.value.length < 3 || this._props.value.length > 20) {
      throw new Error('用户名长度必须在3-20个字符之间');
    }

    // 只允许字母、数字、下划线和连字符
    if (!/^[a-zA-Z0-9_-]+$/.test(this._props.value)) {
      throw new Error('用户名只能包含字母、数字、下划线和连字符');
    }

    // 不能以数字开头
    if (/^[0-9]/.test(this._props.value)) {
      throw new Error('用户名不能以数字开头');
    }
  }

  get value() {
    return this._props.value;
  }

  equals(other) {
    if (!(other instanceof Username)) {
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
