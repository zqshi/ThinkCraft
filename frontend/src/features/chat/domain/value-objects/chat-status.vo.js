/**
 * 聊天状态值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ChatStatus extends ValueObject {
  static ACTIVE = new ChatStatus('active');
  static INACTIVE = new ChatStatus('inactive');
  static READ = new ChatStatus('read');
  static UNREAD = new ChatStatus('unread');
  static ARCHIVED = new ChatStatus('archived');
  static DELETED = new ChatStatus('deleted');

  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建聊天状态
   */
  static fromString(value) {
    const status = new ChatStatus(value);

    // 检查是否是预定义状态
    const predefinedStatuses = [
      ChatStatus.ACTIVE,
      ChatStatus.INACTIVE,
      ChatStatus.READ,
      ChatStatus.UNREAD,
      ChatStatus.ARCHIVED,
      ChatStatus.DELETED
    ];
    const found = predefinedStatuses.find(s => s.value === value);

    if (!found) {
      throw new Error(`无效的聊天状态: ${value}`);
    }

    return found;
  }

  /**
   * 验证状态值
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('聊天状态不能为空');
    }

    const validStatuses = ['active', 'inactive', 'read', 'unread', 'archived', 'deleted'];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的聊天状态: ${this._value}`);
    }
  }

  /**
   * 检查是否是活跃状态
   */
  isActive() {
    return this._value === 'active';
  }

  /**
   * 检查是否是未读状态
   */
  isUnread() {
    return this._value === 'unread';
  }

  /**
   * 检查是否是已读状态
   */
  isRead() {
    return this._value === 'read';
  }

  /**
   * 检查是否是归档状态
   */
  isArchived() {
    return this._value === 'archived';
  }

  /**
   * 检查是否是已删除状态
   */
  isDeleted() {
    return this._value === 'deleted';
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ChatStatus)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}
