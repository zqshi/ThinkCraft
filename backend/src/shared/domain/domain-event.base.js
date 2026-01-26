/**
 * 领域事件基类
 * 用于记录领域中发生的重要业务事件
 */
export class DomainEvent {
  /**
   * @param {string} name - 事件名称
   * @param {Object} data - 事件数据
   * @param {Date} occurredOn - 发生时间
   */
  constructor(name, data = {}, occurredOn = new Date()) {
    if (!name || typeof name !== 'string') {
      throw new Error('事件名称必须是字符串');
    }

    this._id = this._generateId();
    this._name = name;
    this._data = { ...data };
    this._occurredOn = occurredOn;
    this._version = 1;
  }

  /**
   * 获取事件ID
   */
  get id() {
    return this._id;
  }

  /**
   * 获取事件名称
   */
  get name() {
    return this._name;
  }

  /**
   * 获取事件数据
   */
  get data() {
    return { ...this._data };
  }

  /**
   * 获取发生时间
   */
  get occurredOn() {
    return this._occurredOn;
  }

  /**
   * 获取版本号
   */
  get version() {
    return this._version;
  }

  /**
   * 生成唯一ID
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      id: this._id,
      name: this._name,
      data: this._data,
      occurredOn: this._occurredOn,
      version: this._version
    };
  }

  /**
   * 从JSON创建事件
   */
  static fromJSON(json) {
    return new DomainEvent(json.name, json.data, new Date(json.occurredOn));
  }
}

/**
 * 领域事件发布者接口
 */
export class IDomainEventPublisher {
  /**
   * 发布领域事件
   * @param {DomainEvent} event
   */
  async publish(event) {
    throw new Error('必须实现publish方法');
  }

  /**
   * 发布多个领域事件
   * @param {DomainEvent[]} events
   */
  async publishAll(events) {
    throw new Error('必须实现publishAll方法');
  }
}

/**
 * 内存领域事件发布者（用于测试）
 */
export class InMemoryDomainEventPublisher extends IDomainEventPublisher {
  constructor() {
    super();
    this._events = [];
    this._subscribers = new Map();
  }

  /**
   * 订阅事件
   * @param {string} eventName
   * @param {Function} handler
   */
  subscribe(eventName, handler) {
    if (!this._subscribers.has(eventName)) {
      this._subscribers.set(eventName, []);
    }
    this._subscribers.get(eventName).push(handler);
  }

  /**
   * 发布领域事件
   */
  async publish(event) {
    this._events.push(event);

    const handlers = this._subscribers.get(event.name) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`处理事件 ${event.name} 失败:`, error);
      }
    }
  }

  /**
   * 发布多个领域事件
   */
  async publishAll(events) {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * 获取所有事件
   */
  getEvents() {
    return [...this._events];
  }

  /**
   * 清除所有事件
   */
  clear() {
    this._events = [];
  }
}
