/**
 * 消息类型值对象
 */
import { ValueObject } from '../../../shared/domain/index.js';

export class MessageType extends ValueObject {
  /**
   * 消息类型枚举
   */
  static get TEXT() {
    return new MessageType({ value: 'text' });
  }

  static get IMAGE() {
    return new MessageType({ value: 'image' });
  }

  static get CODE() {
    return new MessageType({ value: 'code' });
  }

  static get FILE() {
    return new MessageType({ value: 'file' });
  }

  static get SYSTEM() {
    return new MessageType({ value: 'system' });
  }

  /**
   * 创建消息类型
   */
  static create(value) {
    switch (value) {
    case 'text':
      return MessageType.TEXT;
    case 'image':
      return MessageType.IMAGE;
    case 'code':
      return MessageType.CODE;
    case 'file':
      return MessageType.FILE;
    case 'system':
      return MessageType.SYSTEM;
    default:
      throw new Error(`无效的消息类型: ${value}`);
    }
  }

  /**
   * 获取类型值
   */
  get value() {
    return this.props.value;
  }

  /**
   * 验证类型值
   */
  validate() {
    const validValues = ['text', 'image', 'code', 'file', 'system'];
    if (!validValues.includes(this.props.value)) {
      throw new Error(`消息类型必须是以下值之一: ${validValues.join(', ')}`);
    }
  }

  /**
   * 检查是否为文本类型
   */
  get isText() {
    return this.props.value === 'text';
  }

  /**
   * 检查是否为图片类型
   */
  get isImage() {
    return this.props.value === 'image';
  }

  /**
   * 检查是否为代码类型
   */
  get isCode() {
    return this.props.value === 'code';
  }

  /**
   * 检查是否为文件类型
   */
  get isFile() {
    return this.props.value === 'file';
  }

  /**
   * 检查是否为系统类型
   */
  get isSystem() {
    return this.props.value === 'system';
  }
}
