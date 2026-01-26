/**
 * Chat事件处理器
 * 处理聊天相关的领域事件
 */
import { eventBus } from '../../../shared/infrastructure/event-bus.js';
import { ChatCreatedEvent } from '../domain/events/chat-created.event.js';
import { MessageAddedEvent } from '../domain/events/message-added.event.js';
import { ChatStatusChangedEvent } from '../domain/events/chat-status-changed.event.js';

export class ChatEventHandler {
  constructor() {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听聊天创建事件
    this.eventBus.subscribe(ChatCreatedEvent.EVENT_NAME, this.handleChatCreated.bind(this));

    // 监听消息添加事件
    this.eventBus.subscribe(MessageAddedEvent.EVENT_NAME, this.handleMessageAdded.bind(this));

    // 监听聊天状态变更事件
    this.eventBus.subscribe(
      ChatStatusChangedEvent.EVENT_NAME,
      this.handleChatStatusChanged.bind(this)
    );
  }

  /**
   * 处理聊天创建事件
   */
  handleChatCreated(event) {
    console.log('[ChatEventHandler] 聊天创建:', event.payload);

    // 可以在这里添加额外的逻辑，比如：
    // - 发送通知
    // - 记录日志
    // - 更新UI状态

    // 触发UI更新事件
    this.eventBus.emit('chat:created', {
      chatId: event.payload.chatId,
      projectId: event.payload.projectId,
      title: event.payload.title
    });
  }

  /**
   * 处理消息添加事件
   */
  handleMessageAdded(event) {
    console.log('[ChatEventHandler] 消息添加:', event.payload);

    const { chatId, message } = event.payload;

    // 触发UI更新事件
    this.eventBus.emit('chat:messageAdded', {
      chatId,
      message
    });

    // 如果是新消息通知，可以播放声音
    if (message.type === 'notification') {
      this.playNotificationSound();
    }
  }

  /**
   * 处理聊天状态变更事件
   */
  handleChatStatusChanged(event) {
    console.log('[ChatEventHandler] 聊天状态变更:', event.payload);

    const { chatId, oldStatus, newStatus } = event.payload;

    // 触发UI更新事件
    this.eventBus.emit('chat:statusChanged', {
      chatId,
      oldStatus,
      newStatus
    });

    // 如果聊天变为活跃状态，可以滚动到底部
    if (newStatus === 'active') {
      this.eventBus.emit('chat:scrollToBottom', { chatId });
    }
  }

  /**
   * 播放通知声音
   */
  playNotificationSound() {
    // 检查用户偏好设置
    const preferences = JSON.parse(localStorage.getItem('chat:preferences') || '{}');
    if (preferences.soundEnabled !== false) {
      // 创建音频上下文播放提示音
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      } catch (error) {
        console.warn('无法播放通知声音:', error);
      }
    }
  }

  /**
   * 手动触发事件
   */
  emit(eventName, data) {
    this.eventBus.emit(eventName, data);
  }

  /**
   * 订阅事件
   */
  subscribe(eventName, handler) {
    return this.eventBus.subscribe(eventName, handler);
  }

  /**
   * 取消订阅
   */
  unsubscribe(eventName, handler) {
    this.eventBus.unsubscribe(eventName, handler);
  }
}

// 创建单例实例
export const chatEventHandler = new ChatEventHandler();
