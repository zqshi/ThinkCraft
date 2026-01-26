/**
 * 聊天状态值对象
 */
import { ValueObject } from '../../../shared/domain/index.js';

export class ChatStatus extends ValueObject {
  /**
   * 聊天状态枚举
   */
  static get ACTIVE() {
    return new ChatStatus({ value: 'active' });
  }

  static get ARCHIVED() {
    return new ChatStatus({ value: 'archived' });
  }

  static get DELETED() {
    return new ChatStatus({ value: 'deleted' });
  }

  /**
   * 创建聊天状态
   */
  static create(value) {
    switch (value) {
    case 'active':
      return ChatStatus.ACTIVE;
    case 'archived':
      return ChatStatus.ARCHIVED;
    case 'deleted':
      return ChatStatus.DELETED;
    default:
      throw new Error(`无效的聊天状态: ${value}`);
    }
  }

  /**
   * 获取状态值
   */
  get value() {
    return this.props.value;
  }

  /**
   * 验证状态值
   */
  validate() {
    const validValues = ['active', 'archived', 'deleted'];
    if (!validValues.includes(this.props.value)) {
      throw new Error(`聊天状态必须是以下值之一: ${validValues.join(', ')}`);
    }
  }

  /**
   * 检查是否为活跃状态
   */
  get isActive() {
    return this.props.value === 'active';
  }

  /**
   * 检查是否为已归档状态
   */
  get isArchived() {
    return this.props.value === 'archived';
  }

  /**
   * 检查是否为已删除状态
   */
  get isDeleted() {
    return this.props.value === 'deleted';
  }
}
