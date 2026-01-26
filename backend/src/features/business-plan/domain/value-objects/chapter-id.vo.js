/**
 * 章节ID值对象
 */
export class ChapterId {
  constructor(value) {
    this._value = value;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!other || !(other instanceof ChapterId)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }
}
