/**
 * 分享类型值对象
 */
export class ShareType {
  static PROJECT = new ShareType('PROJECT');
  static REPORT = new ShareType('REPORT');
  static BUSINESS_PLAN = new ShareType('BUSINESS_PLAN');
  static PDF_EXPORT = new ShareType('PDF_EXPORT');
  static WORKFLOW = new ShareType('WORKFLOW');
  static CHAT = new ShareType('CHAT');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const type = this[value.toUpperCase()];
    if (!type) {
      throw new Error(`无效的分享类型: ${value}`);
    }
    return type;
  }

  validate() {
    const validTypes = [
      'PROJECT',
      'REPORT',
      'BUSINESS_PLAN',
      'PDF_EXPORT',
      'WORKFLOW',
      'CHAT'
    ];
    if (!validTypes.includes(this._value)) {
      throw new Error(`无效的分享类型: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  getDisplayName() {
    const names = {
      PROJECT: '项目',
      REPORT: '报告',
      BUSINESS_PLAN: '商业计划书',
      PDF_EXPORT: 'PDF导出',
      WORKFLOW: '工作流',
      CHAT: '对话'
    };
    return names[this._value] || this._value;
  }

  equals(other) {
    return other instanceof ShareType && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
