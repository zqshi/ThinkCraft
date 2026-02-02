/**
 * 分享标题值对象
 */
export class ShareTitle {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('分享标题不能为空且必须是字符串');
    }

    const trimmed = this._value.trim();
    if (trimmed.length === 0) {
      throw new Error('分享标题不能为空');
    }

    if (trimmed.length > 100) {
      throw new Error('分享标题不能超过100个字符');
    }

    this._value = trimmed;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ShareTitle && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
