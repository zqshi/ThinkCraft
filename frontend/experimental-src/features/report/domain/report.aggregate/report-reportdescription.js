export class ReportDescription {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (typeof this._value !== 'string') {
      throw new Error('报告描述必须是字符串');
    }

    if (this._value.length > 2000) {
      throw new Error('报告描述不能超过2000个字符');
    }
  }

  get value() {
    return this._value;
  }
  get length() {
    return this._value.length;
  }

  getSummary(maxLength = 100) {
    if (this._value.length <= maxLength) {
      return this._value;
    }
    return this._value.substring(0, maxLength) + '...';
  }

  equals(other) {
    return other instanceof ReportDescription && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
