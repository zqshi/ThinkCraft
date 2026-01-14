import { conversationState } from './stores/ConversationState.js';
import { generationState } from './stores/GenerationState.js';
import { demoState } from './stores/DemoState.js';
import { inspirationState } from './stores/InspirationState.js';
import { knowledgeState } from './stores/KnowledgeState.js';
import { settingsState } from './stores/SettingsState.js';
import { eventBus } from './core/EventBus.js';

/**
 * StateManager - Facade模式
 * 保持向后兼容的接口，内部委托给各个State
 */
class StateManager {
  constructor() {
    // 各个状态store
    this.conversation = conversationState;
    this.generation = generationState;
    this.demo = demoState;
    this.inspiration = inspirationState;
    this.knowledge = knowledgeState;
    this.settings = settingsState;

    // 事件总线
    this.eventBus = eventBus;

    // 兼容旧接口：state对象
    this._setupCompatibilityLayer();

    // 观察者列表（兼容旧接口）
    this.observers = [];
  }

  /**
   * 设置兼容层（使旧代码无需修改）
   * @private
   */
  _setupCompatibilityLayer() {
    // 使用Proxy拦截state访问
    this.state = new Proxy({}, {
      get: (target, prop) => {
        // 映射到对应的store
        switch(prop) {
          // Conversation 相关
          case 'currentChat':
          case 'chats':
          case 'messages':
          case 'userData':
          case 'conversationStep':
          case 'isTyping':
          case 'isLoading':
          case 'analysisCompleted':
            return this.conversation._getRawState()[prop];

          // Generation 相关
          case 'generation':
            return this.generation._getRawState();

          // Demo 相关
          case 'demo':
            return this.demo._getRawState();

          // Inspiration 相关
          case 'inspiration':
            return this.inspiration._getRawState();

          // Knowledge 相关
          case 'knowledge':
            return this.knowledge._getRawState();

          // Settings 相关
          case 'settings':
            return this.settings._getRawState();

          default:
            return undefined;
        }
      },

      set: (target, prop, value) => {
        console.warn(
          `[StateManager] 直接修改state已弃用。请使用对应的setter方法。`,
          `尝试设置: state.${prop}`
        );
        return false;
      }
    });
  }

  /**
   * 订阅状态变化（兼容旧接口）
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消订阅函数
   */
  subscribe(callback) {
    this.observers.push(callback);

    // 订阅所有store的变化
    const unsubscribes = [
      this.conversation.subscribe(() => this._notifyObservers()),
      this.generation.subscribe(() => this._notifyObservers()),
      this.demo.subscribe(() => this._notifyObservers()),
      this.inspiration.subscribe(() => this._notifyObservers()),
      this.knowledge.subscribe(() => this._notifyObservers()),
      this.settings.subscribe(() => this._notifyObservers())
    ];

    // 返回取消订阅函数
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
      unsubscribes.forEach(unsub => unsub());
    };
  }

  /**
   * 通知所有观察者（兼容旧接口）
   * @private
   */
  _notifyObservers() {
    this.observers.forEach(callback => {
      try {
        callback(this.state);
      } catch (error) {
        console.error('[StateManager] Observer error:', error);
      }
    });
  }

  // ========== Conversation 兼容方法 ==========

  getCurrentChat() {
    return this.conversation.getCurrentChat();
  }

  setCurrentChat(chat) {
    this.conversation.setCurrentChat(chat);
  }

  getMessages() {
    return this.conversation.getMessages();
  }

  setMessages(messages) {
    this.conversation.setMessages(messages);
  }

  addMessage(message) {
    this.conversation.addMessage(message);
  }

  updateMessage(index, updates) {
    this.conversation.updateMessage(index, updates);
  }

  getUserData() {
    return this.conversation.getUserData();
  }

  setUserData(userData) {
    this.conversation.setUserData(userData);
  }

  updateUserData(key, value) {
    this.conversation.updateUserData(key, value);
  }

  getConversationStep() {
    return this.conversation.getConversationStep();
  }

  setConversationStep(step) {
    this.conversation.setConversationStep(step);
  }

  incrementConversationStep() {
    this.conversation.incrementConversationStep();
  }

  setTyping(isTyping) {
    this.conversation.setTyping(isTyping);
  }

  setLoading(isLoading) {
    this.conversation.setLoading(isLoading);
  }

  setAnalysisCompleted(completed) {
    this.conversation.setAnalysisCompleted(completed);
  }

  startNewChat(chatId) {
    this.conversation.startNewChat(chatId);
  }

  clearConversation() {
    this.conversation.clearConversation();
  }

  loadChat(chat) {
    this.conversation.loadChat(chat);
  }

  // ========== Generation 兼容方法 ==========

  getGenerationType() {
    return this.generation.getType();
  }

  setGenerationType(type) {
    this.generation.setType(type);
  }

  getGenerationStatus() {
    return this.generation.getStatus();
  }

  setGenerationStatus(status) {
    this.generation.setStatus(status);
  }

  getSelectedChapters() {
    return this.generation.getSelectedChapters();
  }

  setSelectedChapters(chapters) {
    this.generation.setSelectedChapters(chapters);
  }

  updateGenerationProgress(current, total, currentAgent) {
    this.generation.updateProgress(current, total, currentAgent);
  }

  addGenerationResult(chapterId, result) {
    this.generation.addResult(chapterId, result);
  }

  startGeneration(type, chapters) {
    this.generation.startGeneration(type, chapters);
  }

  completeGeneration() {
    this.generation.completeGeneration();
  }

  resetGeneration() {
    this.generation.resetGeneration();
  }

  // ========== Demo 兼容方法 ==========

  getDemoType() {
    return this.demo.getType();
  }

  setDemoType(type) {
    this.demo.setType(type);
  }

  getDemoStatus() {
    return this.demo.getStatus();
  }

  setDemoCurrentStep(step) {
    this.demo.setCurrentStep(step);
  }

  updateDemoStepResult(stepName, result) {
    this.demo.updateStepResult(stepName, result);
  }

  startDemoGeneration(type, techStack, features) {
    this.demo.startDemoGeneration(type, techStack, features);
  }

  completeDemoGeneration() {
    this.demo.completeDemoGeneration();
  }

  resetDemo() {
    this.demo.resetDemo();
  }

  // ========== Inspiration 兼容方法 ==========

  getInspirationMode() {
    return this.inspiration.getMode();
  }

  setInspirationMode(mode) {
    this.inspiration.setMode(mode);
  }

  getInspirationItems() {
    return this.inspiration.getItems();
  }

  addInspirationItem(item) {
    this.inspiration.addItem(item);
  }

  updateInspirationItem(id, updates) {
    this.inspiration.updateItem(id, updates);
  }

  removeInspirationItem(id) {
    this.inspiration.removeItem(id);
  }

  getInspirationStats() {
    return this.inspiration.getStats();
  }

  // ========== Knowledge 兼容方法 ==========

  getKnowledgeViewMode() {
    return this.knowledge.getViewMode();
  }

  setKnowledgeViewMode(viewMode) {
    this.knowledge.setViewMode(viewMode);
  }

  getKnowledgeItems() {
    return this.knowledge.getItems();
  }

  setKnowledgeItems(items) {
    this.knowledge.setItems(items);
  }

  addKnowledgeItem(item) {
    this.knowledge.addItem(item);
  }

  updateKnowledgeItem(id, updates) {
    this.knowledge.updateItem(id, updates);
  }

  removeKnowledgeItem(id) {
    this.knowledge.removeItem(id);
  }

  setKnowledgeFilter(filter) {
    this.knowledge.setFilter(filter);
  }

  getKnowledgeFilter() {
    return this.knowledge.getFilter();
  }

  getKnowledgeStats() {
    return this.knowledge.getStats();
  }

  getFilteredKnowledgeItems() {
    return this.knowledge.getFilteredItems();
  }

  setKnowledgeOrganization(orgType) {
    this.knowledge.setOrganizationType(orgType);
  }

  getKnowledgeOrganization() {
    return this.knowledge.getOrganizationType();
  }

  setKnowledgeTagsFilter(tags) {
    this.knowledge.setSelectedTags(tags);
  }

  setKnowledgeSearchKeyword(keyword) {
    this.knowledge.setSearchKeyword(keyword);
  }

  setKnowledgeTypeFilter(type) {
    this.knowledge.setFilter({ type });
  }

  // ========== Settings 兼容方法 ==========

  isDarkMode() {
    return this.settings.isDarkMode();
  }

  setDarkMode(darkMode) {
    this.settings.setDarkMode(darkMode);
  }

  toggleDarkMode() {
    this.settings.toggleDarkMode();
  }

  getApiUrl() {
    return this.settings.getApiUrl();
  }

  setApiUrl(apiUrl) {
    this.settings.setApiUrl(apiUrl);
  }

  getAllSettings() {
    return this.settings.getAllSettings();
  }

  updateSettings(settings) {
    this.settings.updateSettings(settings);
  }

  // ========== 全局方法 ==========

  /**
   * 获取完整状态快照
   * @returns {Object}
   */
  getFullState() {
    return {
      conversation: this.conversation.getState(),
      generation: this.generation.getState(),
      demo: this.demo.getState(),
      inspiration: this.inspiration.getState(),
      knowledge: this.knowledge.getState(),
      settings: this.settings.getState()
    };
  }

  /**
   * 重置所有状态
   */
  resetAll() {
    this.conversation.reset();
    this.generation.reset();
    this.demo.reset();
    this.inspiration.reset();
    this.knowledge.reset();
    this.settings.resetToDefaults();
  }

  /**
   * 导出状态（用于调试或备份）
   * @returns {string} JSON字符串
   */
  exportState() {
    return JSON.stringify(this.getFullState(), null, 2);
  }

  /**
   * 清空所有观察者
   */
  clearAllObservers() {
    this.observers = [];
    this.conversation.clearObservers();
    this.generation.clearObservers();
    this.demo.clearObservers();
    this.inspiration.clearObservers();
    this.knowledge.clearObservers();
    this.settings.clearObservers();
  }
}

// 导出单例
export const stateManager = new StateManager();
