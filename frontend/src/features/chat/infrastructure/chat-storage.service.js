/**
 * Chat存储服务
 * 处理聊天数据的本地存储
 */
import { storageService } from '../../../shared/infrastructure/storage.service.js';

const CHAT_STORAGE_KEYS = {
  ACTIVE_CHAT: 'chat:active',
  CHAT_DRAFTS: 'chat:drafts',
  CHAT_PREFERENCES: 'chat:preferences',
  MESSAGE_CACHE: 'chat:messages:cache'
};

export class ChatStorageService {
  constructor() {
    this.storage = storageService;
  }

  /**
   * 保存活跃的聊天ID
   */
  setActiveChatId(chatId) {
    this.storage.set(CHAT_STORAGE_KEYS.ACTIVE_CHAT, chatId);
  }

  /**
   * 获取活跃的聊天ID
   */
  getActiveChatId() {
    return this.storage.get(CHAT_STORAGE_KEYS.ACTIVE_CHAT);
  }

  /**
   * 清除活跃的聊天ID
   */
  clearActiveChat() {
    this.storage.remove(CHAT_STORAGE_KEYS.ACTIVE_CHAT);
  }

  /**
   * 保存草稿
   */
  saveDraft(chatId, content) {
    const drafts = this.getAllDrafts();
    drafts[chatId] = {
      content,
      timestamp: new Date().toISOString()
    };
    this.storage.set(CHAT_STORAGE_KEYS.CHAT_DRAFTS, drafts);
  }

  /**
   * 获取草稿
   */
  getDraft(chatId) {
    const drafts = this.getAllDrafts();
    const draft = drafts[chatId];
    return draft ? draft.content : '';
  }

  /**
   * 获取所有草稿
   */
  getAllDrafts() {
    return this.storage.get(CHAT_STORAGE_KEYS.CHAT_DRAFTS) || {};
  }

  /**
   * 删除草稿
   */
  deleteDraft(chatId) {
    const drafts = this.getAllDrafts();
    delete drafts[chatId];
    this.storage.set(CHAT_STORAGE_KEYS.CHAT_DRAFTS, drafts);
  }

  /**
   * 保存聊天偏好设置
   */
  savePreferences(preferences) {
    const current = this.getPreferences();
    const updated = { ...current, ...preferences };
    this.storage.set(CHAT_STORAGE_KEYS.CHAT_PREFERENCES, updated);
  }

  /**
   * 获取聊天偏好设置
   */
  getPreferences() {
    return (
      this.storage.get(CHAT_STORAGE_KEYS.CHAT_PREFERENCES) || {
        autoScroll: true,
        showTimestamps: true,
        soundEnabled: true,
        theme: 'light'
      }
    );
  }

  /**
   * 缓存消息
   */
  cacheMessages(chatId, messages) {
    const cache = this.getMessageCache();
    cache[chatId] = {
      messages,
      timestamp: new Date().toISOString()
    };
    this.storage.set(CHAT_STORAGE_KEYS.MESSAGE_CACHE, cache);
  }

  /**
   * 获取缓存的消息
   */
  getCachedMessages(chatId) {
    const cache = this.getMessageCache();
    const cached = cache[chatId];

    // 检查缓存是否过期（5分钟）
    if (cached && cached.timestamp) {
      const cacheTime = new Date(cached.timestamp).getTime();
      const now = new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - cacheTime < fiveMinutes) {
        return cached.messages;
      }
    }

    return null;
  }

  /**
   * 获取所有消息缓存
   */
  getMessageCache() {
    return this.storage.get(CHAT_STORAGE_KEYS.MESSAGE_CACHE) || {};
  }

  /**
   * 清除消息缓存
   */
  clearMessageCache(chatId) {
    const cache = this.getMessageCache();
    delete cache[chatId];
    this.storage.set(CHAT_STORAGE_KEYS.MESSAGE_CACHE, cache);
  }

  /**
   * 清除所有聊天相关数据
   */
  clearAll() {
    Object.values(CHAT_STORAGE_KEYS).forEach(key => {
      this.storage.remove(key);
    });
  }
}

// 创建单例实例
export const chatStorageService = new ChatStorageService();
