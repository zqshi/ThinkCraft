export class ReportType {
  static PROJECT_SUMMARY = new ReportType('PROJECT_SUMMARY');
  static PROGRESS_REPORT = new ReportType('PROGRESS_REPORT');
  static ANALYSIS_REPORT = new ReportType('ANALYSIS_REPORT');
  static FINANCIAL_REPORT = new ReportType('FINANCIAL_REPORT');
  static TECHNICAL_REPORT = new ReportType('TECHNICAL_REPORT');
  static MARKETING_REPORT = new ReportType('MARKETING_REPORT');
  static CUSTOM_REPORT = new ReportType('CUSTOM_REPORT');

  constructor(value) {
    this._value = value;
    this.validate();
  }

  static fromString(value) {
    const type = this[value.toUpperCase()];
    if (!type) {
      throw new Error(`无效的报告类型: ${value}`);
    }
    return type;
  }

  validate() {
    const validTypes = [
      'PROJECT_SUMMARY',
      'PROGRESS_REPORT',
      'ANALYSIS_REPORT',
      'FINANCIAL_REPORT',
      'TECHNICAL_REPORT',
      'MARKETING_REPORT',
      'CUSTOM_REPORT'
    ];
    if (!validTypes.includes(this._value)) {
      throw new Error(`无效的报告类型: ${this._value}`);
    }
  }

  get value() {
    return this._value;
  }

  getDisplayName() {
    const names = {
      PROJECT_SUMMARY: '项目总结报告',
      PROGRESS_REPORT: '进度报告',
      ANALYSIS_REPORT: '分析报告',
      FINANCIAL_REPORT: '财务报告',
      TECHNICAL_REPORT: '技术报告',
      MARKETING_REPORT: '营销报告',
      CUSTOM_REPORT: '自定义报告'
    };
    return names[this._value] || this._value;
  }

  getTemplate() {
    const templates = {
      PROJECT_SUMMARY: [
        { title: '项目概述', type: 'content' },
        { title: '主要成果', type: 'content' },
        { title: '总结与建议', type: 'content' }
      ],
      PROGRESS_REPORT: [
        { title: '本周完成', type: 'content' },
        { title: '下周计划', type: 'content' },
        { title: '问题与风险', type: 'content' }
      ],
      ANALYSIS_REPORT: [
        { title: '数据概况', type: 'content' },
        { title: '分析结果', type: 'content' },
        { title: '结论与建议', type: 'content' }
      ]
    };
    return templates[this._value] || [];
  }

  equals(other) {
    return other instanceof ReportType && this._value === other._value;
  }

  toString() {
    return this._value;
  }
  toJSON() {
    return this._value;
  }
}
