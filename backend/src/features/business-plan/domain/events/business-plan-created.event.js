/**
 * 商业计划书创建领域事件
 */
export class BusinessPlanCreatedEvent {
  constructor(payload) {
    this._payload = payload;
    this._occurredOn = new Date();
    this._eventType = 'BusinessPlanCreated';
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
