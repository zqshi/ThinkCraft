/**
 * 消息状态值对象
 */
import { ValueObject } from '../../../shared/domain/index.js';

export class MessageStatus extends ValueObject {
  /**
   * 消息状态枚举
   */
  static get PENDING() {
    return new MessageStatus({ value: 'pending' });
  }

  static get SENT() {
    return new MessageStatus({ value: 'sent' });
  }

  static get DELIVERED() {
    return new MessageStatus({ value: 'delivered' });
  }

  static get READ() {
    return new MessageStatus({ value: 'read' });
  }

  static get FAILED() {
    return new MessageStatus({ value: 'failed' });
  }

  /**
   * 创建消息状态
   */
  static create(value) {
    switch (value) {
    case 'pending':
      return MessageStatus.PENDING;
    case 'sent':
      return MessageStatus.SENT;
    case 'delivered':
      return MessageStatus.DELIVERED;
    case 'read':
      return MessageStatus.READ;
    case 'failed':
      return MessageStatus.FAILED;
    default:
      throw new Error(`无效的消息状态: ${value}`);
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
    const validValues = ['pending', 'sent', 'delivered', 'read', 'failed'];
    if (!validValues.includes(this.props.value)) {
      throw new Error(`消息状态必须是以下值之一: ${validValues.join(', ')}`);
    }
  }

  /**
   * 检查是否为待发送状态
   */
  get isPending() {
    return this.props.value === 'pending';
  }

  /**
   * 检查是否为已发送状态
   */
  get isSent() {
    return this.props.value === 'sent';
  }

  /**
   * 检查是否为已送达状态
   */
  get isDelivered() {
    return this.props.value === 'delivered';
  }

  /**
   * 检查是否为已读状态
   */
  get isRead() {
    return this.props.value === 'read';
  }

  /**
   * 检查是否为失败状态
   */
  get isFailed() {
    return this.props.value === 'failed';
  }

  /**
   * 检查是否已发送（包括sent、delivered、read）
   */
  get isSentSuccessfully() {
    return ['sent', 'delivered', 'read'].includes(this.props.value);
  }
}
