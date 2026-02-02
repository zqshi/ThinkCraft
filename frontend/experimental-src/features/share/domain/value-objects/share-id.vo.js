/**
 * 分享ID值对象
 */
export class ShareId {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  static generate() {
    return new ShareId(`share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('分享ID必须是字符串');
    }

    if (!/^share_[a-zA-Z0-9_]+$/.test(this._value)) {
      throw new Error('分享ID格式无效');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ShareId && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
