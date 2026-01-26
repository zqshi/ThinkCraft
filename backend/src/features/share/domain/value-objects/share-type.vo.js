/**
 * Share类型 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ShareType extends ValueObject {
  static PROJECT = 'project';
  static REPORT = 'report';
  static DEMO = 'demo';
  static WORKFLOW = 'workflow';
  static CUSTOM = 'custom';

  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    const validTypes = [
      ShareType.PROJECT,
      ShareType.REPORT,
      ShareType.DEMO,
      ShareType.WORKFLOW,
      ShareType.CUSTOM
    ];

    if (!validTypes.includes(this.props.value)) {
      throw new Error(
        `Invalid share type: ${this.props.value}. Must be one of: ${validTypes.join(', ')}`
      );
    }
  }

  isProject() {
    return this.props.value === ShareType.PROJECT;
  }

  isReport() {
    return this.props.value === ShareType.REPORT;
  }

  isDemo() {
    return this.props.value === ShareType.DEMO;
  }

  isWorkflow() {
    return this.props.value === ShareType.WORKFLOW;
  }

  isCustom() {
    return this.props.value === ShareType.CUSTOM;
  }

  getDisplayName() {
    const displayNames = {
      [ShareType.PROJECT]: '项目',
      [ShareType.REPORT]: '报告',
      [ShareType.DEMO]: '演示',
      [ShareType.WORKFLOW]: '工作流',
      [ShareType.CUSTOM]: '自定义'
    };

    return displayNames[this.props.value] || this.props.value;
  }
}
