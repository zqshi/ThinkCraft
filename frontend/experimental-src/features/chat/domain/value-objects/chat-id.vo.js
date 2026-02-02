/**
 * 聊天ID值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ChatId extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 生成新的聊天ID
   */
  static generate() {
    const id = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    return new ChatId(id);
  }

  /**
   * 从字符串创建聊天ID
   */
  static fromString(value) {
    return new ChatId(value);
  }

  /**
   * 验证聊天ID格式
   */
  validate() {
    if (!this._value || typeof this._value !== 'string') {
      throw new Error('聊天ID必须是字符串');
    }

    if (this._value.length < 3 || this._value.length > 50) {
      throw new Error('聊天ID长度必须在3-50个字符之间');
    }

    // 只允许字母、数字、下划线和连字符
    if (!/^[a-zA-Z0-9_-]+$/.test(this._value)) {
      throw new Error('聊天ID只能包含字母、数字、下划线和连字符');
    }
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ChatId)) {
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
