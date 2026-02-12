export class ReportSectionId {
  constructor(value) {
    this._value = value;
    this.validate();
  }

  static generate() {
    return new ReportSectionId(`section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('章节ID必须是字符串');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ReportSectionId && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
