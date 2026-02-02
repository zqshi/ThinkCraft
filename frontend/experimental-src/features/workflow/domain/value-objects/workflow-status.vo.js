import { ValueObject } from '../../../../shared/domain/value-object.base.js';

/**
 * 工作流状态枚举
 */
export class WorkflowStatus extends ValueObject {
  static DRAFT = 'draft';
  static ACTIVE = 'active';
  static PAUSED = 'paused';
  static COMPLETED = 'completed';
  static CANCELLED = 'cancelled';

  constructor(value) {
    super(value);
    this._validate();
  }

  _validate() {
    const validStatuses = [
      WorkflowStatus.DRAFT,
      WorkflowStatus.ACTIVE,
      WorkflowStatus.PAUSED,
      WorkflowStatus.COMPLETED,
      WorkflowStatus.CANCELLED
    ];

    if (!validStatuses.includes(this.value)) {
      throw new Error(`无效的工作流状态: ${this.value}`);
    }
  }

  static create(value) {
    return new WorkflowStatus(value);
  }

  /**
   * 检查是否为草稿
   */
  isDraft() {
    return this.value === WorkflowStatus.DRAFT;
  }

  /**
   * 检查是否为活跃状态
   */
  isActive() {
    return this.value === WorkflowStatus.ACTIVE;
  }

  /**
   * 检查是否可编辑
   */
  canEdit() {
    return [WorkflowStatus.DRAFT, WorkflowStatus.PAUSED].includes(this.value);
  }

  /**
   * 检查是否可启动
   */
  canStart() {
    return [WorkflowStatus.DRAFT, WorkflowStatus.PAUSED].includes(this.value);
  }

  /**
   * 获取状态显示名称
   */
  getDisplayName() {
    const displayNames = {
      [WorkflowStatus.DRAFT]: '草稿',
      [WorkflowStatus.ACTIVE]: '运行中',
      [WorkflowStatus.PAUSED]: '已暂停',
      [WorkflowStatus.COMPLETED]: '已完成',
      [WorkflowStatus.CANCELLED]: '已取消'
    };

    return displayNames[this.value] || this.value;
  }

  /**
   * 获取状态颜色
   */
  getStatusColor() {
    const colorMap = {
      [WorkflowStatus.DRAFT]: 'gray',
      [WorkflowStatus.ACTIVE]: 'green',
      [WorkflowStatus.PAUSED]: 'orange',
      [WorkflowStatus.COMPLETED]: 'blue',
      [WorkflowStatus.CANCELLED]: 'red'
    };

    return colorMap[this.value] || 'default';
  }

  toString() {
    return this.value;
  }
}
