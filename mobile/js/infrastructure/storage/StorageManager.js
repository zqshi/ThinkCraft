import { dbClient } from './core/IndexedDBClient.js';
import { ChatRepository } from './repositories/ChatRepository.js';
import { ReportRepository } from './repositories/ReportRepository.js';
import { DemoRepository } from './repositories/DemoRepository.js';
import { InspirationRepository } from './repositories/InspirationRepository.js';
import { KnowledgeRepository } from './repositories/KnowledgeRepository.js';
import { SettingsRepository } from './repositories/SettingsRepository.js';

/**
 * StorageManager - Facade模式
 * 保持向后兼容的接口，内部委托给各个Repository
 */
class StorageManager {
  constructor() {
    this.db = null;
    this.dbName = 'ThinkCraft';
    this.dbVersion = 4;
    this.ready = false;

    // 初始化各个Repository
    this.chatRepo = new ChatRepository(dbClient);
    this.reportRepo = new ReportRepository(dbClient);
    this.demoRepo = new DemoRepository(dbClient);
    this.inspirationRepo = new InspirationRepository(dbClient);
    this.knowledgeRepo = new KnowledgeRepository(dbClient);
    this.settingsRepo = new SettingsRepository(dbClient);
  }

  /**
   * 初始化数据库
   * @returns {Promise<void>}
   */
  async init() {
    const storeDefinitions = [
      {
        name: 'chats',
        keyPath: 'id',
        indexes: [
          { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } }
        ]
      },
      {
        name: 'reports',
        keyPath: 'id',
        indexes: [
          { name: 'type', keyPath: 'type', options: { unique: false } },
          { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } }
        ]
      },
      {
        name: 'demos',
        keyPath: 'id',
        indexes: [
          { name: 'type', keyPath: 'type', options: { unique: false } },
          { name: 'timestamp', keyPath: 'timestamp', options: { unique: false } }
        ]
      },
      {
        name: 'settings',
        keyPath: 'key'
      },
      {
        name: 'inspirations',
        keyPath: 'id',
        indexes: [
          { name: 'status', keyPath: 'status', options: { unique: false } },
          { name: 'type', keyPath: 'type', options: { unique: false } },
          { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
          { name: 'category', keyPath: 'category', options: { unique: false } },
          { name: 'linkedChatId', keyPath: 'linkedChatId', options: { unique: false } }
        ]
      },
      {
        name: 'knowledge',
        keyPath: 'id',
        indexes: [
          { name: 'type', keyPath: 'type', options: { unique: false } },
          { name: 'scope', keyPath: 'scope', options: { unique: false } },
          { name: 'projectId', keyPath: 'projectId', options: { unique: false } },
          { name: 'createdAt', keyPath: 'createdAt', options: { unique: false } },
          { name: 'tags', keyPath: 'tags', options: { unique: false, multiEntry: true } }
        ]
      }
    ];

    await dbClient.init(storeDefinitions);
    this.db = dbClient.db;
    this.ready = true;
  }

  /**
   * 确保数据库已初始化
   * @returns {Promise<void>}
   */
  async ensureReady() {
    if (this.ready) return;
    await this.init();
  }

  // ========== 通用CRUD方法（向后兼容旧接口） ==========

  /**
   * 保存数据（通用方法）
   * @param {String} storeName - 存储名称
   * @param {Object} data - 数据对象
   * @returns {Promise<void>}
   */
  async save(storeName, data) {
    const repo = this._getRepository(storeName);
    if (repo) {
      return repo.save(data);
    }
    throw new Error(`Unknown store: ${storeName}`);
  }

  /**
   * 获取数据（通用方法）
   * @param {String} storeName - 存储名称
   * @param {String|Number} id - 数据ID
   * @returns {Promise<Object|null>}
   */
  async get(storeName, id) {
    const repo = this._getRepository(storeName);
    if (repo) {
      return repo.getById(id);
    }
    throw new Error(`Unknown store: ${storeName}`);
  }

  /**
   * 获取所有数据（通用方法）
   * @param {String} storeName - 存储名称
   * @returns {Promise<Array>}
   */
  async getAll(storeName) {
    const repo = this._getRepository(storeName);
    if (repo) {
      return repo.getAll();
    }
    throw new Error(`Unknown store: ${storeName}`);
  }

  /**
   * 删除数据（通用方法）
   * @param {String} storeName - 存储名称
   * @param {String|Number} id - 数据ID
   * @returns {Promise<void>}
   */
  async delete(storeName, id) {
    const repo = this._getRepository(storeName);
    if (repo) {
      return repo.delete(id);
    }
    throw new Error(`Unknown store: ${storeName}`);
  }

  /**
   * 获取对应的Repository
   * @private
   */
  _getRepository(storeName) {
    const repoMap = {
      'chats': this.chatRepo,
      'reports': this.reportRepo,
      'demos': this.demoRepo,
      'inspirations': this.inspirationRepo,
      'knowledge': this.knowledgeRepo,
      'settings': this.settingsRepo
    };
    return repoMap[storeName];
  }

  // ========== Chat 方法（委托给 ChatRepository） ==========

  async saveChat(chat) {
    return this.chatRepo.saveChat(chat);
  }

  async getChat(id) {
    return this.chatRepo.getChat(id);
  }

  async getAllChats() {
    return this.chatRepo.getAllChats();
  }

  async deleteChat(id) {
    return this.chatRepo.deleteChat(id);
  }

  async clearAllChats() {
    return this.chatRepo.clearAllChats();
  }

  async searchChats(keyword) {
    return this.chatRepo.searchChats(keyword);
  }

  // ========== Report 方法（委托给 ReportRepository） ==========

  async saveReport(report) {
    return this.reportRepo.saveReport(report);
  }

  async getReport(id) {
    return this.reportRepo.getReport(id);
  }

  async getAllReports() {
    return this.reportRepo.getAllReports();
  }

  async deleteReport(id) {
    return this.reportRepo.deleteReport(id);
  }

  async clearAllReports() {
    return this.reportRepo.clearAllReports();
  }

  async getReportsByType(type) {
    return this.reportRepo.getReportsByType(type);
  }

  // ========== Demo 方法（委托给 DemoRepository） ==========

  async saveDemo(demo) {
    return this.demoRepo.saveDemo(demo);
  }

  async getDemo(id) {
    return this.demoRepo.getDemo(id);
  }

  async getAllDemos() {
    return this.demoRepo.getAllDemos();
  }

  async deleteDemo(id) {
    return this.demoRepo.deleteDemo(id);
  }

  async clearAllDemos() {
    return this.demoRepo.clearAllDemos();
  }

  async getDemosByType(type) {
    return this.demoRepo.getDemosByType(type);
  }

  // ========== Inspiration 方法（委托给 InspirationRepository） ==========

  async saveInspiration(inspiration) {
    return this.inspirationRepo.saveInspiration(inspiration);
  }

  async getInspiration(id) {
    return this.inspirationRepo.getInspiration(id);
  }

  async getAllInspirations() {
    return this.inspirationRepo.getAllInspirations();
  }

  async deleteInspiration(id) {
    return this.inspirationRepo.deleteInspiration(id);
  }

  async clearAllInspirations() {
    return this.inspirationRepo.clearAllInspirations();
  }

  async getInspirationsByStatus(status) {
    return this.inspirationRepo.getInspirationsByStatus(status);
  }

  async getInspirationsByType(type) {
    return this.inspirationRepo.getInspirationsByType(type);
  }

  async getInspirationsByCategory(category) {
    return this.inspirationRepo.getInspirationsByCategory(category);
  }

  async batchUpdateInspirationStatus(ids, status) {
    return this.inspirationRepo.batchUpdateStatus(ids, status);
  }

  async getInspirationStats() {
    return this.inspirationRepo.getStatsByStatus();
  }

  // ========== Knowledge 方法（委托给 KnowledgeRepository） ==========

  async saveKnowledge(knowledge) {
    return this.knowledgeRepo.saveKnowledge(knowledge);
  }

  async getKnowledge(id) {
    return this.knowledgeRepo.getKnowledge(id);
  }

  async getAllKnowledge() {
    return this.knowledgeRepo.getAllKnowledge();
  }

  async deleteKnowledge(id) {
    return this.knowledgeRepo.deleteKnowledge(id);
  }

  async clearAllKnowledge() {
    return this.knowledgeRepo.clearAllKnowledge();
  }

  async getKnowledgeByType(type) {
    return this.knowledgeRepo.getKnowledgeByType(type);
  }

  async getKnowledgeByScope(scope) {
    return this.knowledgeRepo.getKnowledgeByScope(scope);
  }

  async getKnowledgeByProject(projectId) {
    return this.knowledgeRepo.getKnowledgeByProject(projectId);
  }

  async getKnowledgeByTag(tag) {
    return this.knowledgeRepo.getKnowledgeByTag(tag);
  }

  async searchKnowledge(keyword) {
    return this.knowledgeRepo.searchKnowledge(keyword);
  }

  async getKnowledgeStats() {
    return this.knowledgeRepo.getStats();
  }

  // ========== Settings 方法（委托给 SettingsRepository） ==========

  async getSetting(key, defaultValue) {
    return this.settingsRepo.get(key, defaultValue);
  }

  async setSetting(key, value) {
    return this.settingsRepo.set(key, value);
  }

  async removeSetting(key) {
    return this.settingsRepo.remove(key);
  }

  async getAllSettings() {
    return this.settingsRepo.getAllSettings();
  }

  async clearAllSettings() {
    return this.settingsRepo.clearAll();
  }

  // ========== 数据库管理方法 ==========

  /**
   * 关闭数据库连接
   */
  close() {
    dbClient.close();
    this.db = null;
    this.ready = false;
  }

  /**
   * 删除数据库
   * @returns {Promise<void>}
   */
  async deleteDatabase() {
    return dbClient.deleteDatabase();
  }
}

// 导出单例
export const storageManager = new StorageManager();
