/**
 * 报告类型值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ReportType extends ValueObject {
  static BUSINESS_PLAN = 'BUSINESS_PLAN';
  static PROJECT_SUMMARY = 'PROJECT_SUMMARY';
  static PROGRESS_REPORT = 'PROGRESS_REPORT';
  static ANALYSIS_REPORT = 'ANALYSIS_REPORT';
  static CUSTOM_REPORT = 'CUSTOM_REPORT';

  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建类型
   */
  static fromString(value) {
    const type = this[value];
    if (!type) {
      throw new Error(`无效的报告类型: ${value}`);
    }
    return type;
  }

  /**
   * 获取所有有效类型
   */
  static getValidTypes() {
    return [
      'BUSINESS_PLAN',
      'PROJECT_SUMMARY',
      'PROGRESS_REPORT',
      'ANALYSIS_REPORT',
      'CUSTOM_REPORT'
    ];
  }

  /**
   * 验证类型
   */
  validate() {
    const validTypes = ReportType.getValidTypes();
    if (!validTypes.includes(this._value)) {
      throw new Error(`无效的报告类型: ${this._value}`);
    }
  }

  /**
   * 是否商业计划书
   */
  isBusinessPlan() {
    return this._value === ReportType.BUSINESS_PLAN;
  }

  /**
   * 是否项目总结报告
   */
  isProjectSummary() {
    return this._value === ReportType.PROJECT_SUMMARY;
  }

  /**
   * 是否进度报告
   */
  isProgressReport() {
    return this._value === ReportType.PROGRESS_REPORT;
  }

  /**
   * 是否分析报告
   */
  isAnalysisReport() {
    return this._value === ReportType.ANALYSIS_REPORT;
  }

  /**
   * 是否自定义报告
   */
  isCustomReport() {
    return this._value === ReportType.CUSTOM_REPORT;
  }

  /**
   * 获取显示名称
   */
  getDisplayName() {
    const displayNames = {
      [ReportType.BUSINESS_PLAN]: '商业计划书',
      [ReportType.PROJECT_SUMMARY]: '项目总结报告',
      [ReportType.PROGRESS_REPORT]: '进度报告',
      [ReportType.ANALYSIS_REPORT]: '分析报告',
      [ReportType.CUSTOM_REPORT]: '自定义报告'
    };

    return displayNames[this._value] || this._value;
  }

  /**
   * 获取图标
   */
  getIcon() {
    const icons = {
      [ReportType.BUSINESS_PLAN]: '📊',
      [ReportType.PROJECT_SUMMARY]: '📋',
      [ReportType.PROGRESS_REPORT]: '📈',
      [ReportType.ANALYSIS_REPORT]: '🔍',
      [ReportType.CUSTOM_REPORT]: '📝'
    };

    return icons[this._value] || '📄';
  }

  /**
   * 获取默认模板
   */
  getDefaultTemplate() {
    const templates = {
      [ReportType.BUSINESS_PLAN]: 'business-plan-template',
      [ReportType.PROJECT_SUMMARY]: 'project-summary-template',
      [ReportType.PROGRESS_REPORT]: 'progress-report-template',
      [ReportType.ANALYSIS_REPORT]: 'analysis-report-template',
      [ReportType.CUSTOM_REPORT]: 'custom-template'
    };

    return templates[this._value];
  }

  /**
   * 是否需要数据分析
   */
  requiresDataAnalysis() {
    return [ReportType.ANALYSIS_REPORT, ReportType.PROGRESS_REPORT].includes(this._value);
  }

  /**
   * 是否需要图表
   */
  requiresCharts() {
    return [
      ReportType.ANALYSIS_REPORT,
      ReportType.PROGRESS_REPORT,
      ReportType.BUSINESS_PLAN
    ].includes(this._value);
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ReportType)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}
