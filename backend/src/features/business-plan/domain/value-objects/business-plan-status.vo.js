/**
 * 商业计划书状态值对象
 */
export class BusinessPlanStatus {
  static DRAFT = new BusinessPlanStatus('DRAFT');
  static COMPLETED = new BusinessPlanStatus('COMPLETED');
  static ARCHIVED = new BusinessPlanStatus('ARCHIVED');

  constructor(value) {
    this._value = value;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!other || !(other instanceof BusinessPlanStatus)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }
}
