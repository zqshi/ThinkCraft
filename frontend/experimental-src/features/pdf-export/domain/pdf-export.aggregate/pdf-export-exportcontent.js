export class ExportContent {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (typeof this._value !== 'string') {
      throw new Error('导出内容必须是字符串');
    }

    if (this._value.length > 1000000) {
      // 1MB限制
      throw new Error('导出内容不能超过1MB');
    }
  }

  get value() {
    return this._value;
  }
  get length() {
    return this._value.length;
  }

  equals(other) {
    return other instanceof ExportContent && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
