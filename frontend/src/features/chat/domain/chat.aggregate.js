/**
 * 聊天聚合根
 * 管理聊天会话的业务逻辑和状态
 */
import { AggregateRoot } from '../../../shared/domain/aggregate-root.base.js';
import { ChatId } from './value-objects/chat-id.vo.js';
import { ChatStatus } from './value-objects/chat-status.vo.js';
import { ChatTitle } from './value-objects/chat-title.vo.js';
import { Message } from './entities/message.entity.js';
import { MessageId } from './value-objects/message-id.vo.js';
import { MessageType } from './value-objects/message-type.vo.js';
import { MessageContent } from './value-objects/message-content.vo.js';
import { UserId } from '../value-objects/user-id.vo.js';
import { ChatCreatedEvent } from './events/chat-created.event.js';
import { MessageAddedEvent } from './events/message-added.event.js';
import { ChatStatusChangedEvent } from './events/chat-status-changed.event.js';

export class Chat extends AggregateRoot {
  constructor(
    id,
    title,
    status = ChatStatus.ACTIVE,
    messages = [],
    participants = [],
    metadata = {}
  ) {
    super(id);
    this._title = title;
    this._status = status;
    this._messages = messages;
    this._participants = participants;
    this._metadata = metadata;
  }

  /**
   * 创建新聊天
   */
  static create(title, initialMessage = null) {
    const chatId = ChatId.generate();
    const chatTitle = new ChatTitle(title);
    const chat = new Chat(chatId, chatTitle);

    // 添加初始消息（如果有）
    if (initialMessage) {
      chat.addMessage(initialMessage.content, initialMessage.type, initialMessage.senderId);
    }

    // 添加聊天创建事件
    chat.addDomainEvent(new ChatCreatedEvent(chatId.value, title));

    return chat;
  }

  /**
   * 添加消息
   */
  addMessage(content, type = MessageType.TEXT, senderId = null, metadata = {}) {
    const messageId = MessageId.generate();
    const messageType = type instanceof MessageType ? type : MessageType.fromString(type);
    const messageContent = new MessageContent(content);
    const sender = senderId ? new UserId(senderId) : null;

    const message = new Message(messageId, this.id, messageContent, messageType, sender, metadata);

    this._messages.push(message);

    // 更新聊天时间戳
    this.updateTimestamp();

    // 添加消息添加事件
    this.addDomainEvent(new MessageAddedEvent(this.id.value, message.id.value, content, type));

    return message;
  }

  /**
   * 获取最后一条消息
   */
  getLastMessage() {
    return this._messages.length > 0 ? this._messages[this._messages.length - 1] : null;
  }

  /**
   * 获取消息数量
   */
  getMessageCount() {
    return this._messages.length;
  }

  /**
   * 更新聊天状态
   */
  updateStatus(newStatus) {
    const oldStatus = this._status;
    this._status = newStatus instanceof ChatStatus ? newStatus : ChatStatus.fromString(newStatus);

    // 添加状态变更事件
    this.addDomainEvent(
      new ChatStatusChangedEvent(this.id.value, oldStatus.value, this._status.value)
    );
  }

  /**
   * 标记为已读
   */
  markAsRead() {
    if (!this._status.isRead()) {
      this.updateStatus(ChatStatus.READ);
    }
  }

  /**
   * 归档聊天
   */
  archive() {
    this.updateStatus(ChatStatus.ARCHIVED);
  }

  /**
   * 删除聊天
   */
  delete() {
    this.updateStatus(ChatStatus.DELETED);
  }

  /**
   * 添加参与者
   */
  addParticipant(userId) {
    const user = new UserId(userId);
    if (!this._participants.some(p => p.equals(user))) {
      this._participants.push(user);
    }
  }

  /**
   * 移除参与者
   */
  removeParticipant(userId) {
    const user = new UserId(userId);
    this._participants = this._participants.filter(p => !p.equals(user));
  }

  /**
   * 更新元数据
   */
  updateMetadata(key, value) {
    this._metadata[key] = value;
    this.updateTimestamp();
  }

  /**
   * 更新标题
   */
  updateTitle(title) {
    this._title = new ChatTitle(title);
    this.updateTimestamp();
  }

  /**
   * 验证聊天状态
   */
  validate() {
    if (!this._title) {
      throw new Error('聊天标题不能为空');
    }

    if (!this._status) {
      throw new Error('聊天状态不能为空');
    }

    if (this._status.isDeleted() && this._messages.length > 0) {
      throw new Error('已删除的聊天不应该有新消息');
    }
  }

  // Getters
  get title() {
    return this._title;
  }
  get status() {
    return this._status;
  }
  get messages() {
    return [...this._messages];
  }
  get participants() {
    return [...this._participants];
  }
  get metadata() {
    return { ...this._metadata };
  }
  get isActive() {
    return this._status.isActive();
  }
  get isArchived() {
    return this._status.isArchived();
  }
  get isDeleted() {
    return this._status.isDeleted();
  }

  toJSON() {
    return {
      ...super.toJSON(),
      title: this._title.value,
      status: this._status.value,
      messages: this._messages.map(m => m.toJSON()),
      participants: this._participants.map(p => p.value),
      metadata: this._metadata,
      messageCount: this._messages.length,
      lastMessage: this.getLastMessage()?.toJSON() || null
    };
  }
}

/**
 * 聊天工厂
 * 用于创建聊天实例
 */
export class ChatFactory {
  static createFromJSON(data) {
    const chat = new Chat(
      new ChatId(data.id),
      new ChatTitle(data.title),
      ChatStatus.fromString(data.status),
      data.messages.map(msg => Message.createFromJSON(msg)),
      data.participants.map(pid => new UserId(pid)),
      data.metadata || {}
    );

    // 设置时间戳
    chat._createdAt = new Date(data.createdAt);
    chat._updatedAt = new Date(data.updatedAt);

    return chat;
  }

  static createNew(title, initialMessage = null) {
    return Chat.create(title, initialMessage);
  }

  static createFromHistory(title, messages = []) {
    const chat = Chat.create(title);

    messages.forEach(msg => {
      chat.addMessage(msg.content, msg.type, msg.senderId, msg.metadata);
    });

    return chat;
  }
}

// 导入依赖（解决循环依赖问题）
import { Message } from './entities/message.entity.js';
