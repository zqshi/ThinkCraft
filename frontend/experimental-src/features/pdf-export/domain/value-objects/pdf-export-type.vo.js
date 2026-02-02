import { ValueObject } from '../../../../shared/domain/value-object.base.js';

/**
 * PDF导出类型枚举
 */
export class PdfExportType extends ValueObject {
  static BUSINESS_PLAN = 'business_plan';
  static REPORT = 'report';
  static PROJECT_SUMMARY = 'project_summary';
  static CHAT_HISTORY = 'chat_history';
  static WORKFLOW = 'workflow';

  constructor(value) {
    super(value);
    this._validate();
  }

  _validate() {
    const validTypes = [
      PdfExportType.BUSINESS_PLAN,
      PdfExportType.REPORT,
      PdfExportType.PROJECT_SUMMARY,
      PdfExportType.CHAT_HISTORY,
      PdfExportType.WORKFLOW
    ];

    if (!validTypes.includes(this.value)) {
      throw new Error(`无效的PDF导出类型: ${this.value}`);
    }
  }

  static create(value) {
    return new PdfExportType(value);
  }

  /**
   * 获取类型的显示名称
   */
  getDisplayName() {
    const displayNames = {
      [PdfExportType.BUSINESS_PLAN]: '商业计划书',
      [PdfExportType.REPORT]: '报告',
      [PdfExportType.PROJECT_SUMMARY]: '项目摘要',
      [PdfExportType.CHAT_HISTORY]: '对话记录',
      [PdfExportType.WORKFLOW]: '工作流'
    };

    return displayNames[this.value] || this.value;
  }

  toString() {
    return this.value;
  }
}
