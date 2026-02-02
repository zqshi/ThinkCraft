import { ValueObject } from '../../../../shared/domain/value-object.base.js';

/**
 * 工作流类型枚举
 */
export class WorkflowType extends ValueObject {
  static PROJECT_MANAGEMENT = 'project_management';
  static CONTENT_CREATION = 'content_creation';
  static REVIEW_APPROVAL = 'review_approval';
  static AUTOMATION = 'automation';
  static CUSTOM = 'custom';

  constructor(value) {
    super(value);
    this._validate();
  }

  _validate() {
    const validTypes = [
      WorkflowType.PROJECT_MANAGEMENT,
      WorkflowType.CONTENT_CREATION,
      WorkflowType.REVIEW_APPROVAL,
      WorkflowType.AUTOMATION,
      WorkflowType.CUSTOM
    ];

    if (!validTypes.includes(this.value)) {
      throw new Error(`无效的工作流类型: ${this.value}`);
    }
  }

  static create(value) {
    return new WorkflowType(value);
  }

  /**
   * 获取类型的显示名称
   */
  getDisplayName() {
    const displayNames = {
      [WorkflowType.PROJECT_MANAGEMENT]: '项目管理',
      [WorkflowType.CONTENT_CREATION]: '内容创作',
      [WorkflowType.REVIEW_APPROVAL]: '审批流程',
      [WorkflowType.AUTOMATION]: '自动化流程',
      [WorkflowType.CUSTOM]: '自定义流程'
    };

    return displayNames[this.value] || this.value;
  }

  /**
   * 获取类型的图标
   */
  getIcon() {
    const icons = {
      [WorkflowType.PROJECT_MANAGEMENT]: '📊',
      [WorkflowType.CONTENT_CREATION]: '✍️',
      [WorkflowType.REVIEW_APPROVAL]: '✅',
      [WorkflowType.AUTOMATION]: '⚙️',
      [WorkflowType.CUSTOM]: '🔧'
    };

    return icons[this.value] || '📋';
  }

  /**
   * 获取默认模板
   */
  getDefaultTemplate() {
    const templates = {
      [WorkflowType.PROJECT_MANAGEMENT]: {
        name: '项目管理流程',
        description: '标准的项目管理生命周期流程',
        steps: [
          { name: '需求分析', type: 'task', assignee: 'analyst' },
          { name: '项目规划', type: 'task', assignee: 'manager' },
          { name: '开发实施', type: 'task', assignee: 'developer' },
          { name: '测试验收', type: 'review', assignee: 'tester' },
          { name: '项目交付', type: 'approval', assignee: 'manager' }
        ]
      },
      [WorkflowType.CONTENT_CREATION]: {
        name: '内容创作流程',
        description: '内容创作和发布审批流程',
        steps: [
          { name: '内容策划', type: 'task', assignee: 'planner' },
          { name: '内容创作', type: 'task', assignee: 'writer' },
          { name: '内容编辑', type: 'review', assignee: 'editor' },
          { name: '内容发布', type: 'approval', assignee: 'publisher' }
        ]
      },
      [WorkflowType.REVIEW_APPROVAL]: {
        name: '审批流程',
        description: '通用的审批流程模板',
        steps: [
          { name: '提交申请', type: 'task', assignee: 'applicant' },
          { name: '初审', type: 'review', assignee: 'reviewer' },
          { name: '终审', type: 'approval', assignee: 'approver' }
        ]
      }
    };

    return templates[this.value] || null;
  }

  toString() {
    return this.value;
  }
}
