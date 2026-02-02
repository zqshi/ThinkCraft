import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base.js';
import { WorkflowId } from './value-objects/workflow-id.vo.js';
import { WorkflowStatus } from './value-objects/workflow-status.vo.js';
import { WorkflowType } from './value-objects/workflow-type.vo.js';
import { WorkflowCreatedEvent } from './events/workflow-created.event.js';
import { WorkflowStatusChangedEvent } from './events/workflow-status-changed.event.js';

/**
 * 工作流步骤实体
 */
export class WorkflowStep {
  constructor(id, name, type, assignee, orderIndex, metadata = {}) {
    this.id = id;
    this.name = name;
    this.type = type; // 'task', 'review', 'approval'
    this.assignee = assignee;
    this.orderIndex = orderIndex;
    this.metadata = metadata;
    this.status = 'pending'; // 'pending', 'in-progress', 'completed', 'skipped'
    this.startedAt = null;
    this.completedAt = null;
    this.comments = [];
  }

  start() {
    if (this.status !== 'pending') {
      throw new Error('步骤不是待处理状态');
    }
    this.status = 'in-progress';
    this.startedAt = new Date();
  }

  complete(comment = '') {
    if (this.status !== 'in-progress') {
      throw new Error('步骤不在进行中状态');
    }
    this.status = 'completed';
    this.completedAt = new Date();
    if (comment) {
      this.comments.push({
        text: comment,
        timestamp: new Date()
      });
    }
  }

  skip(reason = '') {
    this.status = 'skipped';
    this.completedAt = new Date();
    if (reason) {
      this.comments.push({
        text: `跳过: ${reason}`,
        timestamp: new Date()
      });
    }
  }

  isCompleted() {
    return this.status === 'completed';
  }

  isSkipped() {
    return this.status === 'skipped';
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      assignee: this.assignee,
      orderIndex: this.orderIndex,
      status: this.status,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      comments: this.comments,
      metadata: this.metadata
    };
  }

  static fromJSON(json) {
    const step = new WorkflowStep(
      json.id,
      json.name,
      json.type,
      json.assignee,
      json.orderIndex,
      json.metadata
    );
    step.status = json.status;
    step.startedAt = json.startedAt ? new Date(json.startedAt) : null;
    step.completedAt = json.completedAt ? new Date(json.completedAt) : null;
    step.comments = json.comments || [];
    return step;
  }
}

/**
 * 工作流聚合根
 */
export class Workflow extends AggregateRoot {
  constructor(id) {
    super();
    this.id = id || WorkflowId.generate();
    this.name = '';
    this.description = '';
    this.type = null;
    this.status = WorkflowStatus.create(WorkflowStatus.DRAFT);
    this.projectId = null;
    this.steps = [];
    this.currentStepIndex = -1;
    this.createdBy = null;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
    this.metadata = {};
  }

  /**
   * 创建工作流
   */
  static create(params) {
    const workflow = new Workflow(params.id);
    workflow.name = params.name;
    workflow.description = params.description || '';
    workflow.type = WorkflowType.create(params.type);
    workflow.projectId = params.projectId;
    workflow.createdBy = params.createdBy;

    // 添加创建事件
    workflow.addEvent(
      new WorkflowCreatedEvent({
        workflowId: workflow.id.value,
        projectId: workflow.projectId,
        name: workflow.name,
        type: workflow.type.value,
        createdBy: workflow.createdBy
      })
    );

    return workflow;
  }

  /**
   * 添加步骤
   */
  addStep(name, type, assignee, orderIndex, metadata = {}) {
    if (!this.status.isDraft()) {
      throw new Error('只能编辑草稿状态的工作流');
    }

    const stepId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const step = new WorkflowStep(stepId, name, type, assignee, orderIndex, metadata);

    // 插入到指定位置
    if (orderIndex !== undefined) {
      this.steps.splice(orderIndex, 0, step);
      // 更新后续步骤的索引
      for (let i = orderIndex + 1; i < this.steps.length; i++) {
        this.steps[i].orderIndex = i;
      }
    } else {
      step.orderIndex = this.steps.length;
      this.steps.push(step);
    }

    this.updatedAt = new Date();
    return step;
  }

  /**
   * 移除步骤
   */
  removeStep(stepId) {
    if (!this.status.isDraft()) {
      throw new Error('只能编辑草稿状态的工作流');
    }

    const index = this.steps.findIndex(s => s.id === stepId);
    if (index === -1) {
      throw new Error('步骤不存在');
    }

    this.steps.splice(index, 1);

    // 更新后续步骤的索引
    for (let i = index; i < this.steps.length; i++) {
      this.steps[i].orderIndex = i;
    }

    this.updatedAt = new Date();
  }

  /**
   * 启动工作流
   */
  start() {
    if (!this.status.canStart()) {
      throw new Error('当前状态不能启动工作流');
    }

    if (this.steps.length === 0) {
      throw new Error('工作流没有步骤，无法启动');
    }

    const oldStatus = this.status;
    this.status = WorkflowStatus.create(WorkflowStatus.ACTIVE);
    this.currentStepIndex = 0;
    this.startedAt = new Date();
    this.updatedAt = new Date();

    // 启动第一个步骤
    if (this.steps[0]) {
      this.steps[0].start();
    }

    this.addEvent(
      new WorkflowStatusChangedEvent({
        workflowId: this.id.value,
        projectId: this.projectId,
        oldStatus: oldStatus.value,
        newStatus: this.status.value,
        changedBy: this.createdBy
      })
    );
  }

  /**
   * 暂停工作流
   */
  pause() {
    if (!this.status.isActive()) {
      throw new Error('只能暂停活跃状态的工作流');
    }

    const oldStatus = this.status;
    this.status = WorkflowStatus.create(WorkflowStatus.PAUSED);
    this.updatedAt = new Date();

    this.addEvent(
      new WorkflowStatusChangedEvent({
        workflowId: this.id.value,
        projectId: this.projectId,
        oldStatus: oldStatus.value,
        newStatus: this.status.value,
        changedBy: this.createdBy
      })
    );
  }

  /**
   * 恢复工作流
   */
  resume() {
    if (!this.status.value === WorkflowStatus.PAUSED) {
      throw new Error('只能恢复暂停状态的工作流');
    }

    const oldStatus = this.status;
    this.status = WorkflowStatus.create(WorkflowStatus.ACTIVE);
    this.updatedAt = new Date();

    this.addEvent(
      new WorkflowStatusChangedEvent({
        workflowId: this.id.value,
        projectId: this.projectId,
        oldStatus: oldStatus.value,
        newStatus: this.status.value,
        changedBy: this.createdBy
      })
    );
  }

  /**
   * 完成工作流
   */
  complete() {
    if (!this.status.isActive()) {
      throw new Error('只能完成活跃状态的工作流');
    }

    const oldStatus = this.status;
    this.status = WorkflowStatus.create(WorkflowStatus.COMPLETED);
    this.completedAt = new Date();
    this.updatedAt = new Date();

    this.addEvent(
      new WorkflowStatusChangedEvent({
        workflowId: this.id.value,
        projectId: this.projectId,
        oldStatus: oldStatus.value,
        newStatus: this.status.value,
        changedBy: this.createdBy
      })
    );
  }

  /**
   * 取消工作流
   */
  cancel(reason) {
    if (![WorkflowStatus.ACTIVE, WorkflowStatus.PAUSED].includes(this.status.value)) {
      throw new Error('当前状态不能取消工作流');
    }

    const oldStatus = this.status;
    this.status = WorkflowStatus.create(WorkflowStatus.CANCELLED);
    this.completedAt = new Date();
    this.updatedAt = new Date();

    if (reason) {
      this.metadata.cancellationReason = reason;
    }

    this.addEvent(
      new WorkflowStatusChangedEvent({
        workflowId: this.id.value,
        projectId: this.projectId,
        oldStatus: oldStatus.value,
        newStatus: this.status.value,
        changedBy: this.createdBy
      })
    );
  }

  /**
   * 执行下一步
   */
  nextStep() {
    if (!this.status.isActive()) {
      throw new Error('工作流不在活跃状态');
    }

    if (this.currentStepIndex >= this.steps.length - 1) {
      // 所有步骤已完成
      this.complete();
      return null;
    }

    // 完成当前步骤
    if (this.steps[this.currentStepIndex]) {
      this.steps[this.currentStepIndex].complete();
    }

    // 移动到下一步
    this.currentStepIndex++;
    const nextStep = this.steps[this.currentStepIndex];
    if (nextStep) {
      nextStep.start();
    }

    this.updatedAt = new Date();
    return nextStep;
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep() {
    return this.steps[this.currentStepIndex] || null;
  }

  /**
   * 获取进度百分比
   */
  getProgress() {
    if (this.steps.length === 0) {
      return 0;
    }
    if (this.status.value === WorkflowStatus.COMPLETED) {
      return 100;
    }

    const completedSteps = this.steps.filter(s => s.isCompleted() || s.isSkipped()).length;
    return Math.round((completedSteps / this.steps.length) * 100);
  }

  /**
   * 获取当前状态显示名称
   */
  getStatusDisplayName() {
    return this.status.getDisplayName();
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      id: this.id.value,
      name: this.name,
      description: this.description,
      type: this.type.value,
      status: this.status.value,
      projectId: this.projectId,
      steps: this.steps.map(s => s.toJSON()),
      currentStepIndex: this.currentStepIndex,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      progress: this.getProgress(),
      metadata: this.metadata
    };
  }

  /**
   * 从JSON恢复
   */
  static fromJSON(json) {
    const workflow = new Workflow(WorkflowId.create(json.id));
    workflow.name = json.name;
    workflow.description = json.description;
    workflow.type = WorkflowType.create(json.type);
    workflow.status = WorkflowStatus.create(json.status);
    workflow.projectId = json.projectId;
    workflow.steps = json.steps.map(s => WorkflowStep.fromJSON(s));
    workflow.currentStepIndex = json.currentStepIndex;
    workflow.createdBy = json.createdBy;
    workflow.createdAt = new Date(json.createdAt);
    workflow.updatedAt = new Date(json.updatedAt);
    workflow.startedAt = json.startedAt ? new Date(json.startedAt) : null;
    workflow.completedAt = json.completedAt ? new Date(json.completedAt) : null;
    workflow.metadata = json.metadata || {};

    return workflow;
  }
}

/**
 * 工作流工厂
 */
export class WorkflowFactory {
  static createFromTemplate(projectId, type, createdBy) {
    const template = type.getDefaultTemplate();
    if (!template) {
      throw new Error('没有可用的模板');
    }

    const workflow = Workflow.create({
      name: template.name,
      description: template.description,
      type: type.value,
      projectId: projectId,
      createdBy: createdBy
    });

    // 添加模板步骤
    template.steps.forEach((step, index) => {
      workflow.addStep(step.name, step.type, step.assignee, index, step.metadata);
    });

    return workflow;
  }

  static createCustom(projectId, name, description, type, createdBy) {
    return Workflow.create({
      name: name,
      description: description,
      type: type,
      projectId: projectId,
      createdBy: createdBy
    });
  }

  static fromJSON(json) {
    return Workflow.fromJSON(json);
  }
}
