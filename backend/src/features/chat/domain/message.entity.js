/**
 * 消息实体
 * 表示聊天中的一条消息
 */
import { Entity } from '../../../shared/domain/index.js';
import { MessageType } from './message-type.vo.js';
import { MessageStatus } from './message-status.vo.js';

export class Message extends Entity {
  /**
   * @param {string} id - 消息ID
   * @param {string} content - 消息内容
   * @param {MessageType} type - 消息类型
   * @param {MessageStatus} status - 消息状态
   * @param {string} sender - 发送者
   * @param {Object} metadata - 元数据
   * @param {Date} createdAt - 创建时间
   * @param {Date} updatedAt - 更新时间
   */
  constructor(
    id,
    content,
    type = MessageType.TEXT,
    status = MessageStatus.SENT,
    sender = 'user',
    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    super(id);
    this._content = content;
    this._type = type;
    this._status = status;
    this._sender = sender;
    this._metadata = metadata;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * 创建文本消息
   */
  static createText(id, content, sender = 'user') {
    return new Message(id, content, MessageType.TEXT, MessageStatus.SENT, sender);
  }

  /**
   * 创建图片消息
   */
  static createImage(id, imageUrl, sender = 'user') {
    return new Message(id, imageUrl, MessageType.IMAGE, MessageStatus.SENT, sender, { imageUrl });
  }

  /**
   * 创建代码消息
   */
  static createCode(id, code, language = 'javascript', sender = 'user') {
    return new Message(id, code, MessageType.CODE, MessageStatus.SENT, sender, { language });
  }

  /**
   * 更新消息内容
   */
  updateContent(newContent) {
    if (!newContent || typeof newContent !== 'string') {
      throw new Error('消息内容必须是字符串');
    }

    this._content = newContent;
    this.updateTimestamp();
    return this;
  }

  /**
   * 更新消息状态
   */
  updateStatus(newStatus) {
    if (!(newStatus instanceof MessageStatus)) {
      throw new Error('消息状态必须是MessageStatus类型');
    }

    this._status = newStatus;
    this.updateTimestamp();
    return this;
  }

  /**
   * 标记为已发送
   */
  markAsSent() {
    this.updateStatus(MessageStatus.SENT);
    return this;
  }

  /**
   * 标记为已送达
   */
  markAsDelivered() {
    this.updateStatus(MessageStatus.DELIVERED);
    return this;
  }

  /**
   * 标记为已读
   */
  markAsRead() {
    this.updateStatus(MessageStatus.READ);
    return this;
  }

  /**
   * 标记为失败
   */
  markAsFailed(error = null) {
    this.updateStatus(MessageStatus.FAILED);
    if (error) {
      this._metadata.error = error;
    }
    return this;
  }

  /**
   * 添加元数据
   */
  addMetadata(key, value) {
    this._metadata[key] = value;
    this.updateTimestamp();
    return this;
  }

  /**
   * 验证消息实体的有效性
   */
  validate() {
    if (!this._id || typeof this._id !== 'string') {
      throw new Error('消息ID必须是字符串');
    }

    if (!this._content || typeof this._content !== 'string') {
      throw new Error('消息内容必须是字符串');
    }

    if (!(this._type instanceof MessageType)) {
      throw new Error('消息类型必须是MessageType类型');
    }

    if (!(this._status instanceof MessageStatus)) {
      throw new Error('消息状态必须是MessageStatus类型');
    }

    if (!this._sender || typeof this._sender !== 'string') {
      throw new Error('发送者必须是字符串');
    }

    if (typeof this._metadata !== 'object' || Array.isArray(this._metadata)) {
      throw new Error('元数据必须是对象');
    }
  }

  // Getters
  get content() {
    return this._content;
  }
  get type() {
    return this._type;
  }
  get status() {
    return this._status;
  }
  get sender() {
    return this._sender;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }

  /**
   * 检查是否为AI消息
   */
  get isAIMessage() {
    return this._sender === 'assistant' || this._sender === 'ai';
  }

  /**
   * 检查是否为用户消息
   */
  get isUserMessage() {
    return this._sender === 'user';
  }

  /**
   * 检查是否为系统消息
   */
  get isSystemMessage() {
    return this._sender === 'system';
  }

  /**
   * 从JSON创建Message
   */
  static fromJSON(json) {
    return new Message(
      json.id,
      json.content,
      MessageType.create(json.type),
      MessageStatus.create(json.status),
      json.sender,
      json.metadata || {},
      new Date(json.createdAt),
      new Date(json.updatedAt)
    );
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      content: this._content,
      type: this._type.value,
      status: this._status.value,
      sender: this._sender,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}
