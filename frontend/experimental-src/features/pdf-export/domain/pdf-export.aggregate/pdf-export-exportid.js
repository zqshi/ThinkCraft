export class ExportId extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  static generate() {
    return new ExportId(`export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('导出ID必须是字符串');
    }

    if (!/^export_[a-zA-Z0-9_]+$/.test(this._value)) {
      throw new Error('导出ID必须以"export_"开头，且只能包含字母数字和下划线');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    return other instanceof ExportId && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
