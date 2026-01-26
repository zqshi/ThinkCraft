/**
 * 消息实体
 * 表示聊天中的一条消息
 */
import { Entity } from '../../../../shared/domain/entity.base.js';
import { MessageId } from '../value-objects/message-id.vo.js';
import { MessageContent } from '../value-objects/message-content.vo.js';
import { MessageType } from '../value-objects/message-type.vo.js';
import { MessageStatus } from '../value-objects/message-status.vo.js';
import { ChatId } from '../value-objects/chat-id.vo.js';
import { UserId } from '../value-objects/user-id.vo.js';

export class Message extends Entity {
  constructor(
    id,
    chatId,
    content,
    type = MessageType.TEXT,
    senderId = null,
    status = MessageStatus.SENT,
    metadata = {}
  ) {
    super(id);
    this._chatId = chatId;
    this._content = content;
    this._type = type;
    this._senderId = senderId;
    this._status = status;
    this._metadata = metadata;
    this._createdAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * 创建文本消息
   */
  static createText(chatId, content, senderId = null, metadata = {}) {
    return new Message(
      MessageId.generate(),
      chatId instanceof ChatId ? chatId : new ChatId(chatId),
      new MessageContent(content),
      MessageType.TEXT,
      senderId ? new UserId(senderId) : null,
      MessageStatus.SENT,
      metadata
    );
  }

  /**
   * 创建图片消息
   */
  static createImage(chatId, imageUrl, senderId = null, metadata = {}) {
    return new Message(
      MessageId.generate(),
      chatId instanceof ChatId ? chatId : new ChatId(chatId),
      new MessageContent(imageUrl),
      MessageType.IMAGE,
      senderId ? new UserId(senderId) : null,
      MessageStatus.SENT,
      { ...metadata, imageUrl }
    );
  }

  /**
   * 创建文件消息
   */
  static createFile(chatId, fileInfo, senderId = null, metadata = {}) {
    const content = typeof fileInfo === 'string' ? fileInfo : JSON.stringify(fileInfo);
    return new Message(
      MessageId.generate(),
      chatId instanceof ChatId ? chatId : new ChatId(chatId),
      new MessageContent(content),
      MessageType.FILE,
      senderId ? new UserId(senderId) : null,
      MessageStatus.SENT,
      typeof fileInfo === 'object' ? { ...fileInfo, ...metadata } : metadata
    );
  }

  /**
   * 更新消息状态
   */
  updateStatus(status) {
    this._status = status instanceof MessageStatus ? status : MessageStatus.fromString(status);
    this.updateTimestamp();
  }

  /**
   * 标记为已读
   */
  markAsRead() {
    if (!this._status.isRead()) {
      this.updateStatus(MessageStatus.READ);
    }
  }

  /**
   * 标记为已送达
   */
  markAsDelivered() {
    if (this._status.isSent()) {
      this.updateStatus(MessageStatus.DELIVERED);
    }
  }

  /**
   * 更新内容
   */
  updateContent(newContent) {
    this._content = new MessageContent(newContent);
    this.updateTimestamp();
  }

  /**
   * 添加元数据
   */
  addMetadata(key, value) {
    this._metadata[key] = value;
    this.updateTimestamp();
  }

  /**
   * 验证消息
   */
  validate() {
    if (!this._content || !this._content.value) {
      throw new Error('消息内容不能为空');
    }

    if (!this._chatId) {
      throw new Error('消息必须属于一个聊天');
    }

    if (!this._type) {
      throw new Error('消息类型不能为空');
    }
  }

  /**
   * 获取显示内容
   */
  getDisplayContent() {
    switch (this._type.value) {
    case 'text':
      return this._content.value;
    case 'image':
      return '[图片]';
    case 'file':
      const fileInfo = this._metadata.fileName || '文件';
      return `[文件: ${fileInfo}]`;
    case 'system':
      return `[系统] ${this._content.value}`;
    default:
      return this._content.value;
    }
  }

  /**
   * 判断是否是用户消息
   */
  isUserMessage() {
    return this._senderId !== null;
  }

  /**
   * 判断是否是AI消息
   */
  isAIMessage() {
    return this._senderId === null;
  }

  /**
   * 判断是否是系统消息
   */
  isSystemMessage() {
    return this._type.equals(MessageType.SYSTEM);
  }

  // Getters
  get chatId() {
    return this._chatId;
  }
  get content() {
    return this._content;
  }
  get type() {
    return this._type;
  }
  get senderId() {
    return this._senderId;
  }
  get status() {
    return this._status;
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isUser() {
    return this.isUserMessage();
  }
  get isAI() {
    return this.isAIMessage();
  }
  get isSystem() {
    return this.isSystemMessage();
  }

  toJSON() {
    return {
      id: this.id,
      chatId: this._chatId.value,
      content: this._content.value,
      type: this._type.value,
      senderId: this._senderId?.value || null,
      status: this._status.value,
      metadata: this._metadata,
      displayContent: this.getDisplayContent(),
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}

/**
 * 消息工厂
 * 用于创建消息实例
 */
export class MessageFactory {
  static createFromJSON(data) {
    const message = new Message(
      new MessageId(data.id),
      new ChatId(data.chatId),
      new MessageContent(data.content),
      MessageType.fromString(data.type),
      data.senderId ? new UserId(data.senderId) : null,
      MessageStatus.fromString(data.status),
      data.metadata || {}
    );

    // 设置时间戳
    message._createdAt = new Date(data.createdAt);
    message._updatedAt = new Date(data.updatedAt);

    return message;
  }

  static createText(chatId, content, senderId = null, metadata = {}) {
    return Message.createText(chatId, content, senderId, metadata);
  }

  static createImage(chatId, imageUrl, senderId = null, metadata = {}) {
    return Message.createImage(chatId, imageUrl, senderId, metadata);
  }

  static createFile(chatId, fileInfo, senderId = null, metadata = {}) {
    return Message.createFile(chatId, fileInfo, senderId, metadata);
  }

  static createSystem(chatId, content, metadata = {}) {
    return new Message(
      MessageId.generate(),
      new ChatId(chatId),
      new MessageContent(content),
      MessageType.SYSTEM,
      null,
      MessageStatus.SENT,
      metadata
    );
  }

  static createLoading(chatId) {
    return new Message(
      MessageId.generate(),
      new ChatId(chatId),
      new MessageContent(''),
      MessageType.LOADING,
      null,
      MessageStatus.SENDING,
      { isLoading: true }
    );
  }

  static createError(chatId, errorMessage) {
    return Message.createSystem(chatId, `错误: ${errorMessage}`, { isError: true });
  }

  static createWelcome(chatId) {
    const welcomeMessages = [
      '欢迎使用ThinkCraft！我可以帮您：',
      '1. 💡 创新想法 - 提出和改进创意',
      '2. 📝 项目规划 - 制定开发计划',
      '3. 🚀 代码生成 - 创建Demo原型',
      '4. 🔄 迭代优化 - 完善您的项目',
      '',
      '请告诉我您的想法，让我们开始创造！'
    ];

    return Message.createSystem(chatId, welcomeMessages.join('\n'));
  }

  static createThinking(chatId) {
    return Message.createSystem(chatId, '正在思考中...', { isThinking: true });
  }

  static createFromResponse(chatId, response, senderId = null) {
    if (response.type === 'image') {
      return this.createImage(chatId, response.content, senderId, response.metadata);
    } else if (response.type === 'file') {
      return this.createFile(chatId, response.content, senderId, response.metadata);
    } else {
      return this.createText(chatId, response.content, senderId, response.metadata);
    }
  }
}
