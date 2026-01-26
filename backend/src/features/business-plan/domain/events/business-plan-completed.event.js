/**
 * 商业计划书完成领域事件
 */
export class BusinessPlanCompletedEvent {
  constructor(payload) {
    this._payload = payload;
    this._occurredOn = new Date();
    this._eventType = 'BusinessPlanCompleted';
  }

  get payload() {
    return this._payload;
  }

  get occurredOn() {
    return this._occurredOn;
  }

  get eventType() {
    return this._eventType;
  }
}
