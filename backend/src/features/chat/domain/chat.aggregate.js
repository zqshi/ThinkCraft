/**
 * 聊天聚合根
 * 聚合聊天会话的所有信息和行为
 */
import { AggregateRoot } from '../../../shared/domain/index.js';
import { ChatStatus } from './chat-status.vo.js';
import { Message } from './message.entity.js';
import { ChatCreatedEvent } from './events/chat-created.event.js';
import { MessageAddedEvent } from './events/message-added.event.js';
import { ChatStatusChangedEvent } from './events/chat-status-changed.event.js';

export class Chat extends AggregateRoot {
  /**
   * @param {string} id - 聊天ID
   * @param {string} userId - 用户ID
   * @param {string} title - 聊天标题
   * @param {boolean} titleEdited - 标题是否被手动修改
   * @param {ChatStatus} status - 聊天状态
   * @param {Message[]} messages - 消息列表
   * @param {string[]} tags - 标签列表
   * @param {boolean} isPinned - 是否置顶
   * @param {Object|null} reportState - 报告状态
   * @param {boolean} analysisCompleted - 是否生成分析报告
   * @param {number} conversationStep - 对话步骤
   * @param {Date} createdAt - 创建时间
   * @param {Date} updatedAt - 更新时间
   */
  constructor(
    id,
    userId,
    title,
    titleEdited = false,
    status = ChatStatus.ACTIVE,
    messages = [],
    tags = [],
    isPinned = false,
    reportState = null,
    analysisCompleted = false,
    conversationStep = 0,
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    super(id);
    this._userId = userId;
    this._title = title;
    this._titleEdited = Boolean(titleEdited);
    this._status = status;
    this._messages = messages;
    this._tags = tags;
    this._isPinned = isPinned;
    this._reportState = reportState;
    this._analysisCompleted = analysisCompleted;
    this._conversationStep = conversationStep;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * 创建新的聊天会话
   */
  static create(id, title, initialMessage = null) {
    const chat = new Chat(id, 'system', title);

    // 添加领域事件
    chat.addDomainEvent(
      new ChatCreatedEvent({
        chatId: id,
        title: title,
        timestamp: new Date()
      })
    );

    // 如果有初始消息，添加它
    if (initialMessage) {
      chat.addMessage(initialMessage);
    }

    return chat;
  }

  /**
   * 创建带用户信息的聊天会话
   */
  static createForUser(id, userId, title, initialMessage = null) {
    const chat = new Chat(id, userId, title);

    chat.addDomainEvent(
      new ChatCreatedEvent({
        chatId: id,
        title: title,
        userId: userId,
        timestamp: new Date()
      })
    );

    if (initialMessage) {
      chat.addMessage(initialMessage);
    }

    return chat;
  }

  /**
   * 添加消息
   */
  addMessage(message) {
    if (!message) {
      throw new Error('消息不能为空');
    }

    this._messages.push(message);
    this.updateTimestamp();

    // 添加领域事件
    this.addDomainEvent(
      new MessageAddedEvent({
        chatId: this._id,
        messageId: message.id,
        messageType: message.type,
        timestamp: new Date()
      })
    );

    // 如果这是第一条消息，更新标题
    if (this._messages.length === 1 && !this._title) {
      this.updateTitle(message.content.substring(0, 50));
    }
  }

  /**
   * 更新标题
   */
  updateTitle(newTitle) {
    if (!newTitle || typeof newTitle !== 'string') {
      throw new Error('标题必须是字符串');
    }

    this._title = newTitle;
    this.updateTimestamp();

    return this;
  }

  /**
   * 设置标题是否手动修改
   */
  setTitleEdited(isEdited) {
    this._titleEdited = Boolean(isEdited);
    this.updateTimestamp();
    return this;
  }

  /**
   * 更新状态
   */
  updateStatus(newStatus) {
    if (this._status.equals(newStatus)) {
      return this;
    }

    const oldStatus = this._status;
    this._status = newStatus;
    this.updateTimestamp();

    // 添加领域事件
    this.addDomainEvent(
      new ChatStatusChangedEvent({
        chatId: this._id,
        oldStatus: oldStatus.value,
        newStatus: newStatus.value,
        timestamp: new Date()
      })
    );

    return this;
  }

  /**
   * 添加标签
   */
  addTag(tag) {
    if (!tag || typeof tag !== 'string') {
      throw new Error('标签必须是字符串');
    }

    if (!this._tags.includes(tag)) {
      this._tags.push(tag);
      this.updateTimestamp();
    }

    return this;
  }

  /**
   * 移除标签
   */
  removeTag(tag) {
    const index = this._tags.indexOf(tag);
    if (index > -1) {
      this._tags.splice(index, 1);
      this.updateTimestamp();
    }

    return this;
  }

  /**
   * 切换置顶状态
   */
  togglePin() {
    this._isPinned = !this._isPinned;
    this.updateTimestamp();
    return this;
  }

  /**
   * 更新报告状态
   */
  setReportState(reportState) {
    this._reportState = reportState || null;
    this.updateTimestamp();
    return this;
  }

  /**
   * 更新分析报告完成标记
   */
  setAnalysisCompleted(isCompleted) {
    this._analysisCompleted = Boolean(isCompleted);
    this.updateTimestamp();
    return this;
  }

  /**
   * 更新对话步骤
   */
  setConversationStep(step) {
    if (typeof step !== 'number' || Number.isNaN(step) || step < 0) {
      throw new Error('对话步骤必须是非负数字');
    }
    this._conversationStep = step;
    this.updateTimestamp();
    return this;
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
   * 验证聚合根的有效性
   */
  validate() {
    if (!this._id || typeof this._id !== 'string') {
      throw new Error('聊天ID必须是字符串');
    }

    if (!this._userId || typeof this._userId !== 'string') {
      throw new Error('用户ID必须是字符串');
    }

    if (!this._title || typeof this._title !== 'string') {
      throw new Error('聊天标题必须是字符串');
    }

    if (typeof this._titleEdited !== 'boolean') {
      throw new Error('titleEdited必须是布尔值');
    }

    if (!(this._status instanceof ChatStatus)) {
      throw new Error('聊天状态必须是ChatStatus类型');
    }

    if (!Array.isArray(this._messages)) {
      throw new Error('消息列表必须是数组');
    }

    if (!Array.isArray(this._tags)) {
      throw new Error('标签列表必须是数组');
    }

    if (
      this._reportState !== null &&
      (typeof this._reportState !== 'object' || Array.isArray(this._reportState))
    ) {
      throw new Error('报告状态必须是对象');
    }

    if (typeof this._analysisCompleted !== 'boolean') {
      throw new Error('analysisCompleted必须是布尔值');
    }

    if (
      typeof this._conversationStep !== 'number' ||
      Number.isNaN(this._conversationStep) ||
      this._conversationStep < 0
    ) {
      throw new Error('conversationStep必须是非负数字');
    }

    // 验证所有消息
    for (const message of this._messages) {
      if (!(message instanceof Message)) {
        throw new Error('所有消息必须是Message类型');
      }
      message.validate();
    }
  }

  // Getters
  get title() {
    return this._title;
  }
  get titleEdited() {
    return this._titleEdited;
  }
  get userId() {
    return this._userId;
  }
  get status() {
    return this._status;
  }
  get messages() {
    return [...this._messages];
  }
  get tags() {
    return [...this._tags];
  }
  get isPinned() {
    return this._isPinned;
  }
  get reportState() {
    return this._reportState;
  }
  get analysisCompleted() {
    return this._analysisCompleted;
  }
  get conversationStep() {
    return this._conversationStep;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }

  /**
   * 从JSON创建Chat
   */
  static fromJSON(json) {
    const messages = json.messages ? json.messages.map(msg => Message.fromJSON(msg)) : [];
    const status = ChatStatus.create(json.status);

    const resolvedUserId = json.userId || 'system';
    return new Chat(
      json.id,
      resolvedUserId,
      json.title,
      json.titleEdited || false,
      status,
      messages,
      json.tags || [],
      json.isPinned || false,
      json.reportState || null,
      json.analysisCompleted || false,
      json.conversationStep || 0,
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
      userId: this._userId,
      title: this._title,
      titleEdited: this._titleEdited,
      status: this._status.value,
      messages: this._messages.map(msg => msg.toJSON()),
      tags: this._tags,
      isPinned: this._isPinned,
      reportState: this._reportState,
      analysisCompleted: this._analysisCompleted,
      conversationStep: this._conversationStep,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}
