/**
 * Report类型 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ReportType extends ValueObject {
  static BUSINESS_PLAN = 'business_plan';
  static PROJECT_SUMMARY = 'project_summary';
  static PROGRESS_REPORT = 'progress_report';
  static ANALYSIS_REPORT = 'analysis_report';
  static CUSTOM_REPORT = 'custom_report';

  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    const validTypes = [
      ReportType.BUSINESS_PLAN,
      ReportType.PROJECT_SUMMARY,
      ReportType.PROGRESS_REPORT,
      ReportType.ANALYSIS_REPORT,
      ReportType.CUSTOM_REPORT
    ];

    if (!validTypes.includes(this.props.value)) {
      throw new Error(
        `Invalid report type: ${this.props.value}. Must be one of: ${validTypes.join(', ')}`
      );
    }
  }

  isBusinessPlan() {
    return this.props.value === ReportType.BUSINESS_PLAN;
  }

  isProjectSummary() {
    return this.props.value === ReportType.PROJECT_SUMMARY;
  }

  isProgressReport() {
    return this.props.value === ReportType.PROGRESS_REPORT;
  }

  isAnalysisReport() {
    return this.props.value === ReportType.ANALYSIS_REPORT;
  }

  isCustomReport() {
    return this.props.value === ReportType.CUSTOM_REPORT;
  }

  getDisplayName() {
    const displayNames = {
      [ReportType.BUSINESS_PLAN]: '商业计划书',
      [ReportType.PROJECT_SUMMARY]: '项目总结报告',
      [ReportType.PROGRESS_REPORT]: '进度报告',
      [ReportType.ANALYSIS_REPORT]: '分析报告',
      [ReportType.CUSTOM_REPORT]: '自定义报告'
    };

    return displayNames[this.props.value] || this.props.value;
  }
}
