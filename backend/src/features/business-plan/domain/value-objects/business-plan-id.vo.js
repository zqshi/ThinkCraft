/**
 * 商业计划书ID值对象
 */
export class BusinessPlanId {
  constructor(value) {
    this._value = value || this._generateId();
  }

  _generateId() {
    return 'bp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!other || !(other instanceof BusinessPlanId)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }
}
