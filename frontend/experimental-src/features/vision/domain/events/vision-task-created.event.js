/**
 * 视觉任务创建事件
 */
export class VisionTaskCreatedEvent {
  constructor({ taskId, taskType, imageSize, imageFormat, hasPrompt, createdBy }) {
    this.eventName = 'VisionTaskCreated';
    this.taskId = taskId;
    this.taskType = taskType;
    this.imageSize = imageSize;
    this.imageFormat = imageFormat;
    this.hasPrompt = hasPrompt;
    this.createdBy = createdBy;
    this.timestamp = new Date();
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
