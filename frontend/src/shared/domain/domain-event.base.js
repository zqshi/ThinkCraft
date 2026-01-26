/**
 * 领域事件基类
 * 记录领域中的重要业务事件
 */
export class DomainEvent {
  constructor({ aggregateId, eventType, data, timestamp }) {
    this._aggregateId = aggregateId;
    this._eventType = eventType;
    this._data = data;
    this._timestamp = timestamp || new Date();
    this._eventId = this._generateEventId();
  }

  /**
   * 生成事件ID
   */
  _generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Getters
  get eventId() {
    return this._eventId;
  }
  get aggregateId() {
    return this._aggregateId;
  }
  get eventType() {
    return this._eventType;
  }
  get data() {
    return this._data;
  }
  get timestamp() {
    return this._timestamp;
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      eventId: this._eventId,
      aggregateId: this._aggregateId,
      eventType: this._eventType,
      data: this._data,
      timestamp: this._timestamp
    };
  }
}
