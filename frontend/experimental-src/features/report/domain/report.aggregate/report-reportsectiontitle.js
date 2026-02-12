export class ReportSectionTitle {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('章节标题不能为空且必须是字符串');
    }

    const trimmed = this._value.trim();
    if (trimmed.length === 0) {
      throw new Error('章节标题不能为空');
    }

    if (trimmed.length > 150) {
      throw new Error('章节标题不能超过150个字符');
    }

    this._value = trimmed;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ReportSectionTitle && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
