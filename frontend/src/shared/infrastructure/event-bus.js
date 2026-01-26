/**
 * 事件总线
 * 处理组件间通信和领域事件传递
 */
export class EventBus {
  constructor() {
    this.events = {};
    this.onceEvents = {};
  }

  /**
   * 监听事件
   */
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);

    // 返回取消监听的函数
    return () => {
      this.off(eventName, callback);
    };
  }

  /**
   * 监听事件一次
   */
  once(eventName, callback) {
    const onceCallback = (...args) => {
      callback(...args);
      this.off(eventName, onceCallback);
    };

    this.on(eventName, onceCallback);
  }

  /**
   * 取消监听事件
   */
  off(eventName, callback) {
    if (!this.events[eventName]) {
      return;
    }

    const index = this.events[eventName].indexOf(callback);
    if (index > -1) {
      this.events[eventName].splice(index, 1);
    }

    // 如果事件数组为空，删除事件
    if (this.events[eventName].length === 0) {
      delete this.events[eventName];
    }
  }

  /**
   * 触发事件
   */
  emit(eventName, ...args) {
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[EventBus] 事件处理错误: ${eventName}`, error);
        }
      });
    }
  }

  /**
   * 监听多个事件
   */
  onMultiple(eventNames, callback) {
    const unsubs = eventNames.map(eventName => this.on(eventName, callback));

    // 返回批量取消函数
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }

  /**
   * 获取事件监听器数量
   */
  getListenerCount(eventName) {
    return this.events[eventName] ? this.events[eventName].length : 0;
  }

  /**
   * 获取所有事件名称
   */
  getEventNames() {
    return Object.keys(this.events);
  }

  /**
   * 清除所有事件监听器
   */
  clear() {
    this.events = {};
    this.onceEvents = {};
  }

  /**
   * 清除特定事件的所有监听器
   */
  clearEvent(eventName) {
    delete this.events[eventName];
    delete this.onceEvents[eventName];
  }
}

// 创建全局事件总线实例
export const eventBus = new EventBus();

/**
 * 领域事件处理器
 * 处理领域事件的发布和订阅
 */
export class DomainEventHandler {
  constructor() {
    this.handlers = new Map();
  }

  /**
   * 订阅领域事件
   */
  subscribe(eventType, handler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType).push(handler);

    // 在事件总线上监听对应事件
    return eventBus.on(eventType, handler);
  }

  /**
   * 发布领域事件
   */
  publish(event) {
    const eventType = event.eventType;

    console.log(`[DomainEventHandler] 发布领域事件: ${eventType}`, event);

    // 在事件总线上触发事件
    eventBus.emit(eventType, event);
  }

  /**
   * 取消订阅
   */
  unsubscribe(eventType, handler) {
    eventBus.off(eventType, handler);

    if (this.handlers.has(eventType)) {
      const handlers = this.handlers.get(eventType);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * 获取事件处理器
   */
  getHandlers(eventType) {
    return this.handlers.get(eventType) || [];
  }

  /**
   * 清除所有处理器
   */
  clear() {
    this.handlers.clear();
  }
}

// 创建领域事件处理器实例
export const domainEventHandler = new DomainEventHandler();
