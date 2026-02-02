/**
 * 消息类型值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class MessageType extends ValueObject {
  static TEXT = new MessageType('text');
  static IMAGE = new MessageType('image');
  static FILE = new MessageType('file');
  static AUDIO = new MessageType('audio');
  static VIDEO = new MessageType('video');
  static SYSTEM = new MessageType('system');
  static LOADING = new MessageType('loading');

  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建消息类型
   */
  static fromString(value) {
    const type = new MessageType(value);

    // 检查是否是预定义类型
    const predefinedTypes = [
      MessageType.TEXT,
      MessageType.IMAGE,
      MessageType.FILE,
      MessageType.AUDIO,
      MessageType.VIDEO,
      MessageType.SYSTEM,
      MessageType.LOADING
    ];
    const found = predefinedTypes.find(t => t.value === value);

    if (!found) {
      throw new Error(`无效的消息类型: ${value}`);
    }

    return found;
  }

  /**
   * 验证类型值
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('消息类型不能为空');
    }

    const validTypes = ['text', 'image', 'file', 'audio', 'video', 'system', 'loading'];
    if (!validTypes.includes(this._value)) {
      throw new Error(`无效的消息类型: ${this._value}`);
    }
  }

  /**
   * 检查是否是文本类型
   */
  isText() {
    return this._value === 'text';
  }

  /**
   * 检查是否是图片类型
   */
  isImage() {
    return this._value === 'image';
  }

  /**
   * 检查是否是文件类型
   */
  isFile() {
    return this._value === 'file';
  }

  /**
   * 检查是否是系统类型
   */
  isSystem() {
    return this._value === 'system';
  }

  /**
   * 检查是否是加载类型
   */
  isLoading() {
    return this._value === 'loading';
  }

  /**
   * 获取对应的HTML元素标签
   */
  getHtmlTag() {
    const tagMap = {
      text: 'div',
      image: 'img',
      file: 'a',
      audio: 'audio',
      video: 'video',
      system: 'div',
      loading: 'div'
    };
    return tagMap[this._value];
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof MessageType)) {
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
