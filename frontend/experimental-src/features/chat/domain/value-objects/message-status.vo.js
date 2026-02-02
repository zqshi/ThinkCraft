/**
 * 消息状态值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class MessageStatus extends ValueObject {
  static SENDING = new MessageStatus('sending');
  static SENT = new MessageStatus('sent');
  static DELIVERED = new MessageStatus('delivered');
  static READ = new MessageStatus('read');
  static FAILED = new MessageStatus('failed');
  static RETRY = new MessageStatus('retry');

  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建消息状态
   */
  static fromString(value) {
    const status = new MessageStatus(value);

    // 检查是否是预定义状态
    const predefinedStatuses = [
      MessageStatus.SENDING,
      MessageStatus.SENT,
      MessageStatus.DELIVERED,
      MessageStatus.READ,
      MessageStatus.FAILED,
      MessageStatus.RETRY
    ];
    const found = predefinedStatuses.find(s => s.value === value);

    if (!found) {
      throw new Error(`无效的消息状态: ${value}`);
    }

    return found;
  }

  /**
   * 验证状态值
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('消息状态不能为空');
    }

    const validStatuses = ['sending', 'sent', 'delivered', 'read', 'failed', 'retry'];
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的消息状态: ${this._value}`);
    }
  }

  /**
   * 检查是否是发送中状态
   */
  isSending() {
    return this._value === 'sending';
  }

  /**
   * 检查是否是已发送状态
   */
  isSent() {
    return this._value === 'sent';
  }

  /**
   * 检查是否是已送达状态
   */
  isDelivered() {
    return this._value === 'delivered';
  }

  /**
   * 检查是否是已读状态
   */
  isRead() {
    return this._value === 'read';
  }

  /**
   * 检查是否是失败状态
   */
  isFailed() {
    return this._value === 'failed';
  }

  /**
   * 检查是否是重试状态
   */
  isRetry() {
    return this._value === 'retry';
  }

  /**
   * 检查是否最终状态（不可再变更）
   */
  isFinal() {
    return ['read', 'failed'].includes(this._value);
  }

  /**
   * 获取状态颜色
   */
  getColor() {
    const colorMap = {
      sending: '#999',
      sent: '#1890ff',
      delivered: '#52c41a',
      read: '#52c41a',
      failed: '#ff4d4f',
      retry: '#faad14'
    };
    return colorMap[this._value];
  }

  /**
   * 获取状态图标
   */
  getIcon() {
    const iconMap = {
      sending: '⏳',
      sent: '✓',
      delivered: '✓✓',
      read: '✓✓',
      failed: '✗',
      retry: '🔄'
    };
    return iconMap[this._value];
  }

  /**
   * 获取状态文本
   */
  getDisplayText() {
    const textMap = {
      sending: '发送中...',
      sent: '已发送',
      delivered: '已送达',
      read: '已读',
      failed: '发送失败',
      retry: '重试中'
    };
    return textMap[this._value];
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof MessageStatus)) {
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
