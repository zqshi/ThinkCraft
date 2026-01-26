/**
 * 章节生成领域事件
 */
export class ChapterGeneratedEvent {
  constructor(payload) {
    this._payload = payload;
    this._occurredOn = new Date();
    this._eventType = 'ChapterGenerated';
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
