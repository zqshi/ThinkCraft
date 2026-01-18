/**
 * StateStore 基类
 * 提供观察者模式的状态管理
 */
export class StateStore {
  constructor(initialState = {}) {
    this._state = initialState;
    this._observers = new Map(); // key: observerId, value: callback
    this._nextObserverId = 0;
  }

  /**
   * 获取状态（只读）
   * @returns {Object} 状态的深拷贝
   */
  getState() {
    // 返回深拷贝，防止外部修改
    return JSON.parse(JSON.stringify(this._state));
  }

  /**
   * 获取原始状态引用（内部使用）
   * @protected
   * @returns {Object}
   */
  _getRawState() {
    return this._state;
  }

  /**
   * 更新状态（浅合并）
   * @param {Object} updates - 要更新的状态
   */
  setState(updates) {
    const oldState = this.getState();

    // 浅合并更新
    this._state = {
      ...this._state,
      ...updates
    };

    const newState = this.getState();

    // 通知所有观察者
    this._notifyObservers(newState, oldState);
  }

  /**
   * 深度更新状态（支持嵌套路径）
   * @param {string} path - 点分隔的路径，如 'user.profile.name'
   * @param {any} value - 新值
   */
  updateState(path, value) {
    const oldState = this.getState();
    const keys = path.split('.');
    const lastKey = keys.pop();

    let target = this._state;
    for (const key of keys) {
      if (!target[key]) target[key] = {};
      target = target[key];
    }

    target[lastKey] = value;

    const newState = this.getState();
    this._notifyObservers(newState, oldState);
  }

  /**
   * 批量更新（合并多个更新，只触发一次通知）
   * @param {Function} updateFn - 更新函数，接收当前状态，返回更新对象
   */
  batchUpdate(updateFn) {
    const oldState = this.getState();
    const updates = updateFn(this._state);

    this._state = {
      ...this._state,
      ...updates
    };

    const newState = this.getState();
    this._notifyObservers(newState, oldState);
  }

  /**
   * 订阅状态变化
   * @param {Function} callback - 回调函数 (newState, oldState) => void
   * @returns {Function} 取消订阅函数
   */
  subscribe(callback) {
    const observerId = this._nextObserverId++;
    this._observers.set(observerId, callback);

    // 返回取消订阅函数
    return () => {
      this._observers.delete(observerId);
    };
  }

  /**
   * 通知所有观察者
   * @private
   */
  _notifyObservers(newState, oldState) {
    this._observers.forEach(callback => {
      try {
        callback(newState, oldState);
      } catch (error) {
        console.error('[StateStore] Observer error:', error);
      }
    });
  }

  /**
   * 重置状态
   * @param {Object} initialState - 新的初始状态
   */
  reset(initialState) {
    const oldState = this.getState();
    this._state = initialState || {};
    const newState = this.getState();
    this._notifyObservers(newState, oldState);
  }

  /**
   * 清空所有观察者
   */
  clearObservers() {
    this._observers.clear();
  }

  /**
   * 获取观察者数量
   * @returns {number}
   */
  getObserverCount() {
    return this._observers.size;
  }

  /**
   * 合并状态（深度合并）
   * @param {Object} updates - 要合并的状态
   */
  mergeState(updates) {
    const oldState = this.getState();

    this._state = this._deepMerge(this._state, updates);

    const newState = this.getState();
    this._notifyObservers(newState, oldState);
  }

  /**
   * 深度合并对象
   * @private
   */
  _deepMerge(target, source) {
    const output = { ...target };

    if (this._isObject(target) && this._isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this._isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }

    return output;
  }

  /**
   * 判断是否为普通对象
   * @private
   */
  _isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
