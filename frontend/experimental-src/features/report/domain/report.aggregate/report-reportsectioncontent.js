export class ReportSectionContent {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (typeof this._value !== 'string') {
      throw new Error('章节内容必须是字符串');
    }

    if (this._value.length > 10000) {
      throw new Error('章节内容不能超过10000个字符');
    }
  }

  get value() {
    return this._value;
  }
  get length() {
    return this._value.length;
  }

  getSummary(maxLength = 200) {
    if (this._value.length <= maxLength) {
      return this._value;
    }
    return this._value.substring(0, maxLength) + '...';
  }

  getWordCount() {
    return this._value
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length;
  }

  equals(other) {
    return other instanceof ReportSectionContent && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
