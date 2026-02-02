/**
 * 视觉任务完成事件
 */
export class VisionTaskCompletedEvent {
  constructor({ taskId, taskType, confidence, processingTime, resultType, completedAt }) {
    this.eventName = 'VisionTaskCompleted';
    this.taskId = taskId;
    this.taskType = taskType;
    this.confidence = confidence;
    this.processingTime = processingTime;
    this.resultType = resultType;
    this.completedAt = completedAt;
    this.timestamp = new Date();
    this.eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
