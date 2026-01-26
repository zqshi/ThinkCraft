/**
 * Agents事件处理器
 * 处理数字员工相关的领域事件
 */
import { eventBus } from '../../../shared/infrastructure/event-bus.js';

export class AgentsEventHandler {
  constructor() {
    this.eventBus = eventBus;
    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // 监听Agent创建事件
    this.eventBus.subscribe('agent:created', this.handleAgentCreated.bind(this));

    // 监听Agent状态变更事件
    this.eventBus.subscribe('agent:statusChanged', this.handleAgentStatusChanged.bind(this));

    // 监听Agent任务执行事件
    this.eventBus.subscribe('agent:taskExecuted', this.handleAgentTaskExecuted.bind(this));

    // 监听Agent错误事件
    this.eventBus.subscribe('agent:error', this.handleAgentError.bind(this));

    // 监听Agent协作事件
    this.eventBus.subscribe('agent:collaboration', this.handleAgentCollaboration.bind(this));
  }

  /**
   * 处理Agent创建事件
   */
  handleAgentCreated(event) {
    console.log('[AgentsEventHandler] Agent创建:', event.payload);

    const { agent } = event.payload;

    // 显示通知
    this.showNotification({
      type: 'success',
      title: 'Agent创建成功',
      message: `Agent "${agent.name}" 已创建完成`
    });

    // 触发UI更新事件
    this.eventBus.emit('agents:agentCreated', {
      agentId: agent.id,
      agent: agent
    });
  }

  /**
   * 处理Agent状态变更事件
   */
  handleAgentStatusChanged(event) {
    console.log('[AgentsEventHandler] Agent状态变更:', event.payload);

    const { agentId, oldStatus, newStatus } = event.payload;

    // 根据状态显示不同的通知
    if (newStatus === 'running') {
      this.showNotification({
        type: 'info',
        title: 'Agent已启动',
        message: 'Agent正在运行中'
      });
    } else if (newStatus === 'stopped') {
      this.showNotification({
        type: 'warning',
        title: 'Agent已停止',
        message: 'Agent已停止运行'
      });
    } else if (newStatus === 'error') {
      this.showNotification({
        type: 'error',
        title: 'Agent出错',
        message: 'Agent运行出错，请检查日志'
      });
    }

    // 触发UI更新事件
    this.eventBus.emit('agents:statusChanged', {
      agentId,
      oldStatus,
      newStatus
    });
  }

  /**
   * 处理Agent任务执行事件
   */
  handleAgentTaskExecuted(event) {
    console.log('[AgentsEventHandler] Agent任务执行:', event.payload);

    const { agentId, taskId, result } = event.payload;

    // 显示任务完成通知
    if (result.success) {
      this.showNotification({
        type: 'success',
        title: '任务执行完成',
        message: '任务已成功完成'
      });
    } else {
      this.showNotification({
        type: 'error',
        title: '任务执行失败',
        message: result.error || '任务执行失败'
      });
    }

    // 触发UI更新事件
    this.eventBus.emit('agents:taskCompleted', {
      agentId,
      taskId,
      result
    });
  }

  /**
   * 处理Agent错误事件
   */
  handleAgentError(event) {
    console.error('[AgentsEventHandler] Agent错误:', event.payload);

    const { agentId, error } = event.payload;

    // 显示错误通知
    this.showNotification({
      type: 'error',
      title: 'Agent错误',
      message: error.message || 'Agent运行出错'
    });

    // 触发UI更新事件
    this.eventBus.emit('agents:error', {
      agentId,
      error
    });
  }

  /**
   * 处理Agent协作事件
   */
  handleAgentCollaboration(event) {
    console.log('[AgentsEventHandler] Agent协作:', event.payload);

    const { agentIds, task, collaborationType, results } = event.payload;

    // 显示协作完成通知
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    this.showNotification({
      type: successCount === totalCount ? 'success' : 'warning',
      title: '协作任务完成',
      message: `${successCount}/${totalCount} 个Agent成功完成任务`
    });

    // 触发UI更新事件
    this.eventBus.emit('agents:collaborationCompleted', {
      agentIds,
      task,
      collaborationType,
      results
    });
  }

  /**
   * 显示通知
   */
  showNotification(notification) {
    // 使用浏览器的通知API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }

    // 触发UI通知事件
    this.eventBus.emit('ui:notification', notification);
  }

  /**
   * 请求通知权限
   */
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  /**
   * 播放提示音
   */
  playNotificationSound(type = 'info') {
    // 创建音频上下文播放提示音
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 根据类型设置不同的音调
      const frequencies = {
        success: 800,
        error: 400,
        warning: 600,
        info: 600
      };

      oscillator.frequency.value = frequencies[type] || 600;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('无法播放提示音:', error);
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
export const agentsEventHandler = new AgentsEventHandler();
