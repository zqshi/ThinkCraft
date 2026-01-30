/**
 * 领域实体基类
 * 提供实体通用功能：唯一标识、相等性比较、领域事件等
 */
export class Entity {
  constructor(id) {
    if (!id) {
      throw new Error('实体ID不能为空');
    }
    this._id = id;
    this._domainEvents = [];
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 获取实体ID
   */
  get id() {
    return this._id;
  }

  /**
   * 获取创建时间
   */
  get createdAt() {
    return this._createdAt;
  }

  /**
   * 设置创建时间（用于从数据库恢复实体）
   */
  set createdAt(value) {
    this._createdAt = value;
  }

  /**
   * 获取更新时间
   */
  get updatedAt() {
    return this._updatedAt;
  }

  /**
   * 设置更新时间（用于从数据库恢复实体）
   */
  set updatedAt(value) {
    this._updatedAt = value;
  }

  /**
   * 更新时间戳
   */
  updateTimestamp() {
    this._updatedAt = new Date();
  }

  /**
   * 添加领域事件
   */
  addDomainEvent(event) {
    if (!event) {
      throw new Error('领域事件不能为空');
    }
    this._domainEvents.push(event);
  }

  /**
   * 获取领域事件
   */
  getDomainEvents() {
    return [...this._domainEvents];
  }

  /**
   * 清除领域事件
   */
  clearDomainEvents() {
    this._domainEvents = [];
  }

  /**
   * 判断相等性（基于ID）
   */
  equals(other) {
    if (!other || !(other instanceof Entity)) {
      return false;
    }
    return this._id === other._id;
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    return {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }

  /**
   * 验证实体有效性
   * 子类需要重写此方法
   */
  validate() {
    throw new Error('子类必须实现validate方法');
  }
}
