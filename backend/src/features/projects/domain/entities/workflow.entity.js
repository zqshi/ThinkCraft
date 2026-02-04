/**
 * 工作流实体
 * 管理项目的工作流阶段和状态
 */
import { Entity } from '../../../../shared/domain/entity.base.js';
import { ARTIFACT_TYPES, DEFAULT_WORKFLOW_STAGES } from '../../../../../config/workflow-stages.js';

export class Workflow extends Entity {
  constructor(id, stages = [], currentStageId = null, isCustom = false) {
    super(id);
    this._stages = stages;
    this._currentStageId = currentStageId;
    this._isCustom = isCustom;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 创建默认工作流
   */
  static createDefault() {
    const workflowId = `workflow_${Date.now()}`;
    const stages = DEFAULT_WORKFLOW_STAGES.map((stage, index) => {
      const outputs = Array.isArray(stage.artifactTypes) ? stage.artifactTypes : [];
      const outputsDetailed = buildOutputsDetailed(outputs);
      return WorkflowStage.create(
        stage.id,
        stage.name,
        index + 1,
        stage.description || '',
        'pending',
        outputs,
        outputsDetailed
      );
    });

    return new Workflow(workflowId, stages, 'requirement', false);
  }

  /**
   * 从JSON恢复工作流
   */
  static fromJSON(json) {
    if (!json) {
      return null;
    }
    const stages = Array.isArray(json.stages)
      ? json.stages.map(stage => WorkflowStage.fromJSON(stage))
      : [];
    const workflow = new Workflow(
      json.id || `workflow_${Date.now()}`,
      stages,
      json.currentStageId || null,
      Boolean(json.isCustom)
    );
    workflow._createdAt = json.createdAt ? new Date(json.createdAt) : new Date();
    workflow._updatedAt = json.updatedAt ? new Date(json.updatedAt) : new Date();
    return workflow;
  }

  /**
   * 获取指定阶段
   */
  getStage(stageId) {
    return this._stages.find(stage => stage.id === stageId) || null;
  }

  /**
   * 获取当前阶段
   */
  getCurrentStage() {
    return this.getStage(this._currentStageId);
  }

  /**
   * 移动到下一阶段
   */
  moveToNextStage() {
    const currentStage = this.getCurrentStage();
    if (!currentStage) {
      throw new Error('当前阶段不存在');
    }

    // 完成当前阶段
    currentStage.complete();

    // 查找下一个阶段
    const currentIndex = this._stages.findIndex(stage => stage.id === this._currentStageId);
    if (currentIndex === -1 || currentIndex >= this._stages.length - 1) {
      throw new Error('已经是最后一个阶段');
    }

    const nextStage = this._stages[currentIndex + 1];
    this._currentStageId = nextStage.id;
    nextStage.start();

    this.updateTimestamp();
  }

  /**
   * 移动到指定阶段
   */
  moveToStage(stageId) {
    const targetStage = this.getStage(stageId);
    if (!targetStage) {
      throw new Error('目标阶段不存在');
    }

    // 更新当前阶段
    this._currentStageId = stageId;
    targetStage.start();

    this.updateTimestamp();
  }

  /**
   * 自定义阶段
   */
  customizeStages(stages) {
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new Error('工作流阶段不能为空');
    }

    // 验证阶段数据
    const newStages = stages.map((stageData, index) => {
      if (!stageData.id || !stageData.name) {
        throw new Error('阶段ID和名称不能为空');
      }

      const stageOutputsDetailed = Array.isArray(stageData.outputsDetailed)
        ? stageData.outputsDetailed
        : buildOutputsDetailed(Array.isArray(stageData.outputs) ? stageData.outputs : []);
      return WorkflowStage.create(
        stageData.id,
        stageData.name,
        index + 1,
        stageData.description,
        stageData.status || 'pending',
        Array.isArray(stageData.outputs) ? stageData.outputs : [],
        stageOutputsDetailed
      );
    });

    // 更新阶段
    this._stages = newStages;
    this._isCustom = true;

    // 如果当前阶段不存在，设置为第一个阶段
    if (!this.getStage(this._currentStageId) && newStages.length > 0) {
      this._currentStageId = newStages[0].id;
    }

    this.updateTimestamp();
  }

  /**
   * 添加阶段产物
   */
  addArtifact(stageId, artifact) {
    const stage = this.getStage(stageId);
    if (!stage) {
      throw new Error('阶段不存在');
    }

    stage.addArtifact(artifact);
    this.updateTimestamp();
  }

  /**
   * 删除阶段产物
   */
  removeArtifact(stageId, artifactId) {
    const stage = this.getStage(stageId);
    if (!stage) {
      throw new Error('阶段不存在');
    }

    const removed = stage.removeArtifact(artifactId);
    if (removed) {
      this.updateTimestamp();
    }
    return removed;
  }

  /**
   * 获取所有产物
   */
  getAllArtifacts() {
    return this._stages.flatMap(stage => stage.artifacts);
  }

  /**
   * 获取完成百分比
   */
  getCompletionPercentage() {
    if (this._stages.length === 0) {
      return 0;
    }

    const completedStages = this._stages.filter(stage => stage.isCompleted()).length;
    return Math.round((completedStages / this._stages.length) * 100);
  }

  /**
   * 验证工作流
   */
  validate() {
    if (!this._stages || this._stages.length === 0) {
      throw new Error('工作流必须包含至少一个阶段');
    }

    if (this._currentStageId && !this.getStage(this._currentStageId)) {
      throw new Error('当前阶段不存在');
    }

    // 验证阶段顺序
    const orderNumbers = this._stages.map(stage => stage.orderNumber);
    const uniqueOrderNumbers = new Set(orderNumbers);
    if (uniqueOrderNumbers.size !== orderNumbers.length) {
      throw new Error('阶段顺序号必须唯一');
    }
  }

  // Getters
  get stages() {
    return [...this._stages];
  }
  get currentStageId() {
    return this._currentStageId;
  }
  get isCustom() {
    return this._isCustom;
  }

  toJSON() {
    return {
      id: this.id,
      stages: this._stages.map(stage => stage.toJSON()),
      currentStageId: this._currentStageId,
      isCustom: this._isCustom,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}

/**
 * 工作流阶段实体
 */
class WorkflowStage extends Entity {
  constructor(
    id,
    name,
    orderNumber,
    description = '',
    status = 'pending',
    artifacts = [],
    outputs = [],
    outputsDetailed = []
  ) {
    super(id);
    this._name = name;
    this._orderNumber = orderNumber;
    this._description = description;
    this._status = status;
    this._artifacts = artifacts;
    this._outputs = outputs;
    this._outputsDetailed = outputsDetailed;
    this._startedAt = null;
    this._completedAt = null;
  }

  /**
   * 创建工作流阶段
   */
  static create(id, name, orderNumber, description = '', status = 'pending', outputs = [], outputsDetailed = []) {
    return new WorkflowStage(id, name, orderNumber, description, status, [], outputs, outputsDetailed);
  }

  /**
   * 从JSON恢复阶段
   */
  static fromJSON(json) {
    if (!json) {
      return null;
    }
    const fallbackStage = DEFAULT_WORKFLOW_STAGES.find(stage => stage.id === json.id);
    const fallbackOutputs = Array.isArray(fallbackStage?.artifactTypes)
      ? fallbackStage.artifactTypes
      : [];
    const outputs = Array.isArray(json.outputs) ? json.outputs : fallbackOutputs;
    const outputsDetailed = Array.isArray(json.outputsDetailed)
      ? json.outputsDetailed
      : buildOutputsDetailed(outputs);
    const stage = new WorkflowStage(
      json.id,
      json.name,
      json.orderNumber,
      json.description || '',
      json.status || 'pending',
      Array.isArray(json.artifacts) ? json.artifacts : [],
      outputs,
      outputsDetailed
    );
    stage._startedAt = json.startedAt ? new Date(json.startedAt) : null;
    stage._completedAt = json.completedAt ? new Date(json.completedAt) : null;
    return stage;
  }

  /**
   * 开始阶段
   */
  start() {
    if (this._status === 'completed') {
      throw new Error('阶段已完成，不能重新开始');
    }

    this._status = 'in_progress';
    this._startedAt = new Date();
  }

  /**
   * 完成阶段
   */
  complete() {
    if (this._status !== 'in_progress') {
      throw new Error('阶段未开始，不能完成');
    }

    this._status = 'completed';
    this._completedAt = new Date();
  }

  /**
   * 添加产物
   */
  addArtifact(artifact) {
    if (!artifact.id || !artifact.type || !artifact.name) {
      throw new Error('产物ID、类型和名称不能为空');
    }

    this._artifacts.push({
      ...artifact,
      createdAt: new Date()
    });
  }

  /**
   * 删除产物
   */
  removeArtifact(artifactId) {
    const index = this._artifacts.findIndex(a => a.id === artifactId);
    if (index === -1) {
      return false;
    }
    this._artifacts.splice(index, 1);
    return true;
  }

  /**
   * 获取产物
   */
  getArtifact(artifactId) {
    return this._artifacts.find(a => a.id === artifactId) || null;
  }

  /**
   * 检查是否已完成
   */
  isCompleted() {
    return this._status === 'completed';
  }

  /**
   * 检查是否进行中
   */
  isInProgress() {
    return this._status === 'in_progress';
  }

  // Getters
  get name() {
    return this._name;
  }
  get orderNumber() {
    return this._orderNumber;
  }
  get description() {
    return this._description;
  }
  get status() {
    return this._status;
  }
  get artifacts() {
    return [...this._artifacts];
  }
  get outputs() {
    return [...this._outputs];
  }
  get outputsDetailed() {
    return [...this._outputsDetailed];
  }
  get startedAt() {
    return this._startedAt;
  }
  get completedAt() {
    return this._completedAt;
  }

  toJSON() {
    return {
      id: this.id,
      name: this._name,
      orderNumber: this._orderNumber,
      description: this._description,
      status: this._status,
      artifacts: this._artifacts,
      outputs: this._outputs,
      outputsDetailed: this._outputsDetailed,
      startedAt: this._startedAt,
      completedAt: this._completedAt
    };
  }
}

function buildOutputsDetailed(outputs = []) {
  return outputs.map(outputId => {
    const def = ARTIFACT_TYPES[outputId];
    return def
      ? { id: outputId, name: def.name, promptTemplates: def.promptTemplates || [] }
      : { id: outputId, name: outputId, promptTemplates: [] };
  });
}
