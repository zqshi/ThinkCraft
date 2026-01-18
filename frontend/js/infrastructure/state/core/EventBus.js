/**
 * 事件总线
 * 用于不同State之间的通信（解耦合）
 */
export class EventBus {
  constructor() {
    this._events = new Map();
  }

  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  on(eventName, callback) {
    if (!this._events.has(eventName)) {
      this._events.set(eventName, []);
    }

    this._events.get(eventName).push(callback);

    // 返回取消订阅函数
    return () => {
      const callbacks = this._events.get(eventName);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 发布事件
   * @param {string} eventName - 事件名称
   * @param {any} data - 事件数据
   */
  emit(eventName, data) {
    const callbacks = this._events.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[EventBus] Error in ${eventName} handler:`, error);
        }
      });
    }
  }

  /**
   * 一次性订阅
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  once(eventName, callback) {
    const unsubscribe = this.on(eventName, (data) => {
      callback(data);
      unsubscribe();
    });
    return unsubscribe;
  }

  /**
   * 取消所有订阅
   * @param {string} eventName - 事件名称（可选，不传则清空所有）
   */
  off(eventName) {
    if (eventName) {
      this._events.delete(eventName);
    } else {
      this._events.clear();
    }
  }

  /**
   * 获取事件列表
   * @returns {Array<string>}
   */
  getEventNames() {
    return Array.from(this._events.keys());
  }

  /**
   * 获取某个事件的监听器数量
   * @param {string} eventName - 事件名称
   * @returns {number}
   */
  listenerCount(eventName) {
    const callbacks = this._events.get(eventName);
    return callbacks ? callbacks.length : 0;
  }

  /**
   * 清空所有监听器
   */
  clear() {
    this._events.clear();
  }
}

// 导出单例
export const eventBus = new EventBus();
