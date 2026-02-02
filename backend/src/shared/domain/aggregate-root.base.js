/**
 * 聚合根基类
 * 聚合根是领域模型的入口点，负责维护聚合的一致性
 */
import { Entity } from './entity.base.js';

export class AggregateRoot extends Entity {
  constructor(id, props) {
    super(id, props);
    this._version = 0; // 用于乐观锁
  }

  /**
   * 获取版本号
   */
  get version() {
    return this._version;
  }

  /**
   * 增加版本号
   */
  incrementVersion() {
    this._version++;
  }

  /**
   * 添加领域事件
   */
  addDomainEvent(event) {
    super.addDomainEvent(event);
    this.incrementVersion();
  }

  /**
   * 验证聚合根及其所有子对象的有效性
   * 子类需要重写此方法
   */
  validate() {
    throw new Error('子类必须实现validate方法');
  }

  /**
   * 检查业务规则
   * @param {boolean} condition - 条件
   * @param {string} message - 错误消息
   */
  checkRule(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      version: this._version
    };
  }
}
