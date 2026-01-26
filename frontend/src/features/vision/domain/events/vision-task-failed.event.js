/**
 * 视觉任务失败事件
 */
export class VisionTaskFailedEvent {
  constructor({ taskId, taskType, errorMessage, failedAt }) {
    this.eventName = 'VisionTaskFailed';
    this.taskId = taskId;
    this.taskType = taskType;
    this.errorMessage = errorMessage;
    this.failedAt = failedAt;
    this.timestamp = new Date();
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
