/**
 * 事件总线
 * 负责领域事件的发布和订阅
 */
import logger from '../logger/logger.js';

class EventBus {
  constructor() {
    this._handlers = new Map();
    this._asyncHandlers = new Map();
  }

  /**
   * 订阅事件（同步处理）
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理器
   */
  subscribe(eventName, handler) {
    if (!this._handlers.has(eventName)) {
      this._handlers.set(eventName, []);
    }
    this._handlers.get(eventName).push(handler);
    logger.info(`[EventBus] 订阅事件: ${eventName}`);
  }

  /**
   * 订阅事件（异步处理）
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 异步事件处理器
   */
  subscribeAsync(eventName, handler) {
    if (!this._asyncHandlers.has(eventName)) {
      this._asyncHandlers.set(eventName, []);
    }
    this._asyncHandlers.get(eventName).push(handler);
    logger.info(`[EventBus] 订阅异步事件: ${eventName}`);
  }

  /**
   * 取消订阅
   * @param {string} eventName - 事件名称
   * @param {Function} handler - 事件处理器
   */
  unsubscribe(eventName, handler) {
    // 从同步处理器中移除
    if (this._handlers.has(eventName)) {
      const handlers = this._handlers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        logger.info(`[EventBus] 取消订阅事件: ${eventName}`);
      }
    }

    // 从异步处理器中移除
    if (this._asyncHandlers.has(eventName)) {
      const handlers = this._asyncHandlers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        logger.info(`[EventBus] 取消订阅异步事件: ${eventName}`);
      }
    }
  }

  /**
   * 发布事件
   * @param {DomainEvent} event - 领域事件
   */
  async publish(event) {
    const eventName = event.eventName || event.constructor.name;

    logger.info(`[EventBus] 发布事件: ${eventName}`, {
      eventId: event.eventId,
      occurredOn: event.occurredOn
    });

    // 执行同步处理器
    if (this._handlers.has(eventName)) {
      const handlers = this._handlers.get(eventName);
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          logger.error(`[EventBus] 同步处理事件失败: ${eventName}`, error);
          // 同步处理器失败不影响其他处理器
        }
      }
    }

    // 执行异步处理器（不等待完成）
    if (this._asyncHandlers.has(eventName)) {
      const handlers = this._asyncHandlers.get(eventName);
      for (const handler of handlers) {
        // 异步执行，不阻塞主流程
        handler(event).catch(error => {
          logger.error(`[EventBus] 异步处理事件失败: ${eventName}`, error);
        });
      }
    }
  }

  /**
   * 批量发布事件
   * @param {DomainEvent[]} events - 领域事件数组
   */
  async publishAll(events) {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * 清空所有订阅
   */
  clear() {
    this._handlers.clear();
    this._asyncHandlers.clear();
    logger.info('[EventBus] 清空所有订阅');
  }

  /**
   * 获取事件订阅数量
   * @param {string} eventName - 事件名称
   * @returns {number}
   */
  getSubscriberCount(eventName) {
    const syncCount = this._handlers.has(eventName) ? this._handlers.get(eventName).length : 0;
    const asyncCount = this._asyncHandlers.has(eventName)
      ? this._asyncHandlers.get(eventName).length
      : 0;
    return syncCount + asyncCount;
  }

  /**
   * 获取所有已订阅的事件名称
   * @returns {string[]}
   */
  getSubscribedEvents() {
    const syncEvents = Array.from(this._handlers.keys());
    const asyncEvents = Array.from(this._asyncHandlers.keys());
    return [...new Set([...syncEvents, ...asyncEvents])];
  }
}

// 导出单例
export const eventBus = new EventBus();
