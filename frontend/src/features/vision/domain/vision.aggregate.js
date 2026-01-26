/**
 * 视觉识别聚合根
 * 管理图片分析和OCR任务
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { VisionTaskId } from './value-objects/vision-task-id.vo.js';
import { VisionTaskType } from './value-objects/vision-task-type.vo.js';
import { VisionTaskStatus } from './value-objects/vision-task-status.vo.js';
import { VisionImage } from './value-objects/vision-image.vo.js';
import { VisionPrompt } from './value-objects/vision-prompt.vo.js';
import { VisionResult } from './value-objects/vision-result.vo.js';
import { UserId } from '../../shared/value-objects/user-id.vo.js';
import { VisionTaskCreatedEvent } from './events/vision-task-created.event.js';
import { VisionTaskCompletedEvent } from './events/vision-task-completed.event.js';
import { VisionTaskFailedEvent } from './events/vision-task-failed.event.js';

export class VisionTask extends AggregateRoot {
  constructor(
    id,
    taskType,
    image,
    prompt = null,
    status = VisionTaskStatus.PENDING,
    result = null,
    confidence = 0,
    processingTime = 0,
    createdBy = null,
    startedAt = null,
    completedAt = null,
    metadata = {}
  ) {
    super(id);
    this._taskType = taskType;
    this._image = image;
    this._prompt = prompt;
    this._status = status;
    this._result = result;
    this._confidence = confidence;
    this._processingTime = processingTime;
    this._createdBy = createdBy;
    this._startedAt = startedAt;
    this._completedAt = completedAt;
    this._metadata = metadata;
  }

  /**
   * 创建视觉任务
   */
  static create({ taskType, imageData, prompt, createdBy }) {
    const taskId = VisionTaskId.generate();
    const type =
      taskType instanceof VisionTaskType ? taskType : VisionTaskType.fromString(taskType);
    const image = new VisionImage(imageData);
    const visionPrompt = prompt ? new VisionPrompt(prompt) : null;
    const userId = createdBy ? new UserId(createdBy) : null;

    const task = new VisionTask(
      taskId,
      type,
      image,
      visionPrompt,
      VisionTaskStatus.PENDING,
      null,
      0,
      0,
      userId
    );

    // 添加领域事件
    task.addDomainEvent(
      new VisionTaskCreatedEvent({
        taskId: taskId.value,
        taskType: type.value,
        imageSize: image.size,
        imageFormat: image.format,
        hasPrompt: Boolean(prompt),
        createdBy
      })
    );

    return task;
  }

  /**
   * 开始处理
   */
  start() {
    if (!this._status.canStart()) {
      throw new Error(`当前状态不能开始处理: ${this._status.value}`);
    }

    this._status = VisionTaskStatus.PROCESSING;
    this._startedAt = new Date();
    this.updateTimestamp();
  }

  /**
   * 完成任务
   */
  complete(result, confidence = 0, processingTime = 0) {
    if (!this._status.isProcessing()) {
      throw new Error('任务不在处理中状态');
    }

    this._status = VisionTaskStatus.COMPLETED;
    this._result = result instanceof VisionResult ? result : new VisionResult(result);
    this._confidence = Math.max(0, Math.min(1, confidence));
    this._processingTime = processingTime;
    this._completedAt = new Date();
    this.updateTimestamp();

    this.addDomainEvent(
      new VisionTaskCompletedEvent({
        taskId: this.id.value,
        taskType: this._taskType.value,
        confidence: this._confidence,
        processingTime: this._processingTime,
        resultType: this._result.type,
        completedAt: this._completedAt
      })
    );
  }

  /**
   * 任务失败
   */
  fail(errorMessage) {
    this._status = VisionTaskStatus.FAILED;
    this.updateMetadata('errorMessage', errorMessage);
    this._completedAt = new Date();
    this.updateTimestamp();

    this.addDomainEvent(
      new VisionTaskFailedEvent({
        taskId: this.id.value,
        taskType: this._taskType.value,
        errorMessage,
        failedAt: this._completedAt
      })
    );
  }

  /**
   * 添加元数据
   */
  addMetadata(key, value) {
    this._metadata[key] = value;
    this.updateTimestamp();
  }

  /**
   * 移除元数据
   */
  removeMetadata(key) {
    delete this._metadata[key];
    this.updateTimestamp();
  }

  /**
   * 验证任务
   */
  validate() {
    if (!this._taskType || !(this._taskType instanceof VisionTaskType)) {
      throw new Error('任务类型必须是VisionTaskType类型');
    }

    if (!this._image || !(this._image instanceof VisionImage)) {
      throw new Error('图片必须是VisionImage类型');
    }

    if (this._prompt && !(this._prompt instanceof VisionPrompt)) {
      throw new Error('提示词必须是VisionPrompt类型');
    }

    if (!this._status || !(this._status instanceof VisionTaskStatus)) {
      throw new Error('状态必须是VisionTaskStatus类型');
    }

    if (this._result && !(this._result instanceof VisionResult)) {
      throw new Error('结果必须是VisionResult类型');
    }

    if (this._confidence < 0 || this._confidence > 1) {
      throw new Error('置信度必须在0-1之间');
    }

    if (this._processingTime < 0) {
      throw new Error('处理时间不能为负数');
    }
  }

  // Getters
  get taskType() {
    return this._taskType;
  }
  get image() {
    return this._image;
  }
  get prompt() {
    return this._prompt;
  }
  get status() {
    return this._status;
  }
  get result() {
    return this._result;
  }
  get confidence() {
    return this._confidence;
  }
  get processingTime() {
    return this._processingTime;
  }
  get createdBy() {
    return this._createdBy;
  }
  get startedAt() {
    return this._startedAt;
  }
  get completedAt() {
    return this._completedAt;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isPending() {
    return this._status.isPending();
  }
  get isProcessing() {
    return this._status.isProcessing();
  }
  get isCompleted() {
    return this._status.isCompleted();
  }
  get isFailed() {
    return this._status.isFailed();
  }

  /**
   * 获取处理时间显示
   */
  getProcessingTimeDisplay() {
    if (this._processingTime === 0) {
      return '0ms';
    }

    if (this._processingTime < 1000) {
      return `${this._processingTime}ms`;
    } else if (this._processingTime < 60000) {
      return `${(this._processingTime / 1000).toFixed(1)}s`;
    } else {
      return `${(this._processingTime / 60000).toFixed(1)}min`;
    }
  }

  /**
   * 获取置信度显示
   */
  getConfidenceDisplay() {
    return `${Math.round(this._confidence * 100)}%`;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      taskType: this._taskType.value,
      image: this._image.toJSON(),
      prompt: this._prompt?.value,
      status: this._status.value,
      result: this._result?.toJSON(),
      confidence: this._confidence,
      processingTime: this._processingTime,
      processingTimeDisplay: this.getProcessingTimeDisplay(),
      confidenceDisplay: this.getConfidenceDisplay(),
      createdBy: this._createdBy?.value,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      metadata: this._metadata
    };
  }

  /**
   * 从JSON创建任务
   */
  static fromJSON(json) {
    const task = new VisionTask(
      new VisionTaskId(json.id),
      VisionTaskType.fromString(json.taskType),
      VisionImage.fromJSON(json.image),
      json.prompt ? new VisionPrompt(json.prompt) : null,
      VisionTaskStatus.fromString(json.status),
      json.result ? VisionResult.fromJSON(json.result) : null,
      json.confidence || 0,
      json.processingTime || 0,
      json.createdBy ? new UserId(json.createdBy) : null,
      json.startedAt ? new Date(json.startedAt) : null,
      json.completedAt ? new Date(json.completedAt) : null,
      json.metadata || {}
    );

    // 设置时间戳
    task._createdAt = new Date(json.createdAt);
    task._updatedAt = new Date(json.updatedAt);

    return task;
  }
}

/**
 * 视觉任务工厂
 */
export class VisionTaskFactory {
  static createImageAnalysis(imageData, prompt, createdBy) {
    return VisionTask.create({
      taskType: 'IMAGE_ANALYSIS',
      imageData,
      prompt,
      createdBy
    });
  }

  static createOCR(imageData, createdBy) {
    return VisionTask.create({
      taskType: 'OCR',
      imageData,
      createdBy
    });
  }

  static createObjectDetection(imageData, prompt, createdBy) {
    return VisionTask.create({
      taskType: 'OBJECT_DETECTION',
      imageData,
      prompt,
      createdBy
    });
  }

  static createFromJSON(json) {
    return VisionTask.fromJSON(json);
  }
}

export default VisionTask;
