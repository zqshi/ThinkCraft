/**
 * ThinkCraft Storage Manager
 * 使用IndexedDB管理大容量数据存储，替代localStorage
 */

class StorageManager {
  constructor() {
    this.db = null;
    this.dbName = 'ThinkCraft';
    this.dbVersion = 2;
    this.ready = false;

    // 初始化数据库
    this.init();
  }

  /**
   * 初始化IndexedDB
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[StorageManager] 数据库打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        console.log('[StorageManager] IndexedDB已初始化');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建对象存储（表）
        if (!db.objectStoreNames.contains('chats')) {
          const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatsStore.createIndex('createdAt', 'createdAt', { unique: false });
          console.log('[StorageManager] 创建 chats 存储');
        }

        if (!db.objectStoreNames.contains('reports')) {
          const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportsStore.createIndex('type', 'type', { unique: false });
          reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[StorageManager] 创建 reports 存储');
        }

        if (!db.objectStoreNames.contains('demos')) {
          const demosStore = db.createObjectStore('demos', { keyPath: 'id' });
          demosStore.createIndex('type', 'type', { unique: false });
          demosStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('[StorageManager] 创建 demos 存储');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
          console.log('[StorageManager] 创建 settings 存储');
        }
      };
    });
  }

  /**
   * 确保数据库已初始化
   * @returns {Promise<void>}
   */
  async ensureReady() {
    if (this.ready) return;
    await this.init();
  }

  // ========== 通用CRUD方法 ==========

  /**
   * 保存数据
   * @param {String} storeName - 存储名称
   * @param {Object} data - 数据对象
   * @returns {Promise<void>}
   */
  async save(storeName, data) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`[StorageManager] 保存到 ${storeName}:`, data.id || data.key);
        resolve();
      };

      request.onerror = () => {
        console.error(`[StorageManager] 保存失败:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取数据
   * @param {String} storeName - 存储名称
   * @param {String|Number} id - 数据ID
   * @returns {Promise<Object|null>}
   */
  async get(storeName, id) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error(`[StorageManager] 获取失败:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 获取所有数据
   * @param {String} storeName - 存储名称
   * @returns {Promise<Array>}
   */
  async getAll(storeName) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error(`[StorageManager] 获取所有数据失败:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 删除数据
   * @param {String} storeName - 存储名称
   * @param {String|Number} id - 数据ID
   * @returns {Promise<void>}
   */
  async delete(storeName, id) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`[StorageManager] 删除 ${storeName}:`, id);
        resolve();
      };

      request.onerror = () => {
        console.error(`[StorageManager] 删除失败:`, request.error);
        reject(request.error);
      };
    });
  }

  /**
   * 清空存储
   * @param {String} storeName - 存储名称
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log(`[StorageManager] 清空 ${storeName}`);
        resolve();
      };

      request.onerror = () => {
        console.error(`[StorageManager] 清空失败:`, request.error);
        reject(request.error);
      };
    });
  }

  // ========== 业务方法 ==========

  /**
   * 保存对话
   * @param {Object} chat - 对话对象
   * @returns {Promise<void>}
   */
  async saveChat(chat) {
    const chatData = {
      ...chat,
      id: chat.id || Date.now(),
      updatedAt: Date.now()
    };
    await this.save('chats', chatData);
  }

  /**
   * 获取对话
   * @param {Number} id - 对话ID
   * @returns {Promise<Object|null>}
   */
  async getChat(id) {
    return this.get('chats', id);
  }

  /**
   * 获取所有对话
   * @returns {Promise<Array>}
   */
  async getAllChats() {
    return this.getAll('chats');
  }

  /**
   * 删除对话
   * @param {Number} id - 对话ID
   * @returns {Promise<void>}
   */
  async deleteChat(id) {
    return this.delete('chats', id);
  }

  /**
   * 保存报告（商业计划书/产品立项材料）
   * @param {Object} report - 报告对象
   * @returns {Promise<void>}
   */
  async saveReport(report) {
    const reportData = {
      id: report.id || `report-${Date.now()}`,
      type: report.type, // 'business' | 'proposal'
      data: report.data,
      timestamp: Date.now(),
      size: JSON.stringify(report.data).length
    };
    await this.save('reports', reportData);
  }

  /**
   * 获取报告
   * @param {String} id - 报告ID
   * @returns {Promise<Object|null>}
   */
  async getReport(id) {
    return this.get('reports', id);
  }

  /**
   * 获取所有报告
   * @returns {Promise<Array>}
   */
  async getAllReports() {
    return this.getAll('reports');
  }

  /**
   * 保存Demo
   * @param {Object} demo - Demo对象
   * @returns {Promise<void>}
   */
  async saveDemo(demo) {
    const demoData = {
      id: demo.id || `demo-${Date.now()}`,
      type: demo.type, // 'web' | 'app' | 'miniapp' | 'admin'
      code: demo.code,
      prd: demo.prd,
      architecture: demo.architecture,
      test: demo.test,
      deploy: demo.deploy,
      timestamp: Date.now(),
      size: (demo.code || '').length
    };
    await this.save('demos', demoData);
  }

  /**
   * 获取Demo
   * @param {String} id - Demo ID
   * @returns {Promise<Object|null>}
   */
  async getDemo(id) {
    return this.get('demos', id);
  }

  /**
   * 获取所有Demo
   * @returns {Promise<Array>}
   */
  async getAllDemos() {
    return this.getAll('demos');
  }

  /**
   * 保存设置
   * @param {String} key - 设置键
   * @param {Any} value - 设置值
   * @returns {Promise<void>}
   */
  async saveSetting(key, value) {
    await this.save('settings', { key, value });
  }

  /**
   * 获取设置
   * @param {String} key - 设置键
   * @returns {Promise<Any|null>}
   */
  async getSetting(key) {
    const result = await this.get('settings', key);
    return result ? result.value : null;
  }

  // ========== 数据迁移（从localStorage） ==========

  /**
   * 从localStorage迁移数据
   * @returns {Promise<void>}
   */
  async migrateFromLocalStorage() {
    console.log('[StorageManager] 开始数据迁移...');

    try {
      // 迁移对话历史
      const chatsJSON = localStorage.getItem('thinkcraft_chats');
      if (chatsJSON) {
        const chats = JSON.parse(chatsJSON);
        for (const chat of chats) {
          await this.saveChat(chat);
        }
        console.log(`[StorageManager] 迁移了 ${chats.length} 条对话`);
      }

      // 迁移设置
      const settingsJSON = localStorage.getItem('thinkcraft_settings');
      if (settingsJSON) {
        const settings = JSON.parse(settingsJSON);
        for (const [key, value] of Object.entries(settings)) {
          await this.saveSetting(key, value);
        }
        console.log(`[StorageManager] 迁移了设置`);
      }

      // 标记迁移完成
      localStorage.setItem('thinkcraft_migrated', 'true');
      console.log('[StorageManager] 数据迁移完成');

    } catch (error) {
      console.error('[StorageManager] 数据迁移失败:', error);
    }
  }

  /**
   * 检查是否需要迁移
   * @returns {Boolean}
   */
  needsMigration() {
    return !localStorage.getItem('thinkcraft_migrated');
  }

  // ========== 工具方法 ==========

  /**
   * 获取数据库使用情况
   * @returns {Promise<Object>} { quota, usage, percentage }
   */
  async getUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
      };
    }
    return null;
  }

  /**
   * 清空所有数据
   * @returns {Promise<void>}
   */
  async clearAll() {
    await this.clear('chats');
    await this.clear('reports');
    await this.clear('demos');
    await this.clear('settings');
    console.log('[StorageManager] 已清空所有数据');
  }

  /**
   * 导出数据（用于备份）
   * @returns {Promise<Object>}
   */
  async exportData() {
    return {
      chats: await this.getAllChats(),
      reports: await this.getAllReports(),
      demos: await this.getAllDemos(),
      exportedAt: Date.now()
    };
  }

  /**
   * 导入数据（用于恢复）
   * @param {Object} data - 导出的数据
   * @returns {Promise<void>}
   */
  async importData(data) {
    if (data.chats) {
      for (const chat of data.chats) {
        await this.saveChat(chat);
      }
    }

    if (data.reports) {
      for (const report of data.reports) {
        await this.saveReport(report);
      }
    }

    if (data.demos) {
      for (const demo of data.demos) {
        await this.saveDemo(demo);
      }
    }

    console.log('[StorageManager] 数据导入完成');
  }
}

// 导出单例实例
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
  window.storageManager = new StorageManager();

  // 自动检查并执行数据迁移
  window.storageManager.ensureReady().then(async () => {
    if (window.storageManager.needsMigration()) {
      await window.storageManager.migrateFromLocalStorage();
    }
  });

  console.log('[StorageManager] 存储管理器已初始化');
}
