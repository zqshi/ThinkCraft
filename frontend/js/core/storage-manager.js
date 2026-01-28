/**
 * ThinkCraft Storage Manager
 * 使用IndexedDB管理大容量数据存储，替代localStorage
 */

class StorageManager {
  constructor() {
    this.db = null;
    this.dbName = 'ThinkCraft';
    this.dbVersion = 6; // 升级到v6支持工作流交付物存储
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
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = event.target.result;

        // 创建对象存储（表）
        if (!db.objectStoreNames.contains('chats')) {
          const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
          chatsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('reports')) {
          const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
          reportsStore.createIndex('type', 'type', { unique: false });
          reportsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('demos')) {
          const demosStore = db.createObjectStore('demos', { keyPath: 'id' });
          demosStore.createIndex('type', 'type', { unique: false });
          demosStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Phase 3：灵感收件箱存储（v3新增）
        if (!db.objectStoreNames.contains('inspirations')) {
          const inspirationsStore = db.createObjectStore('inspirations', { keyPath: 'id' });
          inspirationsStore.createIndex('status', 'status', { unique: false });
          inspirationsStore.createIndex('type', 'type', { unique: false });
          inspirationsStore.createIndex('createdAt', 'createdAt', { unique: false });
          inspirationsStore.createIndex('category', 'category', { unique: false });
          inspirationsStore.createIndex('linkedChatId', 'linkedChatId', { unique: false });
        }

        // 知识库存储（v4新增）
        if (!db.objectStoreNames.contains('knowledge')) {
          const knowledgeStore = db.createObjectStore('knowledge', { keyPath: 'id' });
          knowledgeStore.createIndex('type', 'type', { unique: false });
          knowledgeStore.createIndex('scope', 'scope', { unique: false });
          knowledgeStore.createIndex('projectId', 'projectId', { unique: false });
          knowledgeStore.createIndex('createdAt', 'createdAt', { unique: false });
          knowledgeStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }

        // 项目管理存储（v5新增）
        if (!db.objectStoreNames.contains('projects')) {
          const projectsStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectsStore.createIndex('ideaId', 'ideaId', { unique: false });
          projectsStore.createIndex('mode', 'mode', { unique: false });
          projectsStore.createIndex('status', 'status', { unique: false });
          projectsStore.createIndex('createdAt', 'createdAt', { unique: false });
          projectsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 工作流交付物存储（v6新增）
        if (!db.objectStoreNames.contains('artifacts')) {
          const artifactsStore = db.createObjectStore('artifacts', { keyPath: 'id' });
          artifactsStore.createIndex('projectId', 'projectId', { unique: false });
          artifactsStore.createIndex('stageId', 'stageId', { unique: false });
          artifactsStore.createIndex('type', 'type', { unique: false });
          artifactsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * 确保数据库已初始化
   * @returns {Promise<void>}
   */
  async ensureReady() {
    if (this.ready) {
      return;
    }
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
        resolve();
      };

      request.onerror = () => {
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
        resolve();
      };

      request.onerror = () => {
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
        resolve();
      };

      request.onerror = () => {
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
      chatId: report.chatId || null,
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
    try {
      // 迁移对话历史
      const chatsJSON = localStorage.getItem('thinkcraft_chats');
      if (chatsJSON) {
        const chats = JSON.parse(chatsJSON);
        for (const chat of chats) {
          await this.saveChat(chat);
        }
      }

      // 迁移设置
      const settingsJSON = localStorage.getItem('thinkcraft_settings');
      if (settingsJSON) {
        const settings = JSON.parse(settingsJSON);
        for (const [key, value] of Object.entries(settings)) {
          await this.saveSetting(key, value);
        }
      }

      // 标记迁移完成
      localStorage.setItem('thinkcraft_migrated', 'true');
    } catch (error) {}
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
  }

  // ========== 灵感收件箱业务方法（Phase 3新增） ==========

  /**
   * 保存灵感
   * @param {Object} inspiration - 灵感对象
   * @returns {Promise<void>}
   */
  async saveInspiration(inspiration) {
    await this.save('inspirations', inspiration);
  }

  /**
   * 获取灵感
   * @param {String} id - 灵感ID
   * @returns {Promise<Object|null>}
   */
  async getInspiration(id) {
    return this.get('inspirations', id);
  }

  /**
   * 获取所有灵感
   * @returns {Promise<Array>}
   */
  async getAllInspirations() {
    const inspirations = await this.getAll('inspirations');
    // 按创建时间倒序排列（最新的在前）
    return inspirations.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据状态获取灵感
   * @param {String} status - 'unprocessed' | 'processing' | 'completed'
   * @returns {Promise<Array>}
   */
  async getInspirationsByStatus(status) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inspirations'], 'readonly');
      const store = transaction.objectStore('inspirations');
      const index = store.index('status');
      const request = index.getAll(status);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 保存灵感
   * @param {Object} inspiration - 灵感对象
   * @returns {Promise<void>}
   */
  async saveInspiration(inspiration) {
    if (!inspiration.id) {
      inspiration.id = `inspiration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    inspiration.updatedAt = Date.now();
    await this.save('inspirations', inspiration);
  }

  /**
   * 获取灵感
   * @param {String} id - 灵感ID
   * @returns {Promise<Object|null>}
   */
  async getInspiration(id) {
    return this.get('inspirations', id);
  }

  /**
   * 获取所有灵感
   * @returns {Promise<Array>}
   */
  async getAllInspirations() {
    const inspirations = await this.getAll('inspirations');
    // 按创建时间倒序排序
    return inspirations.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据状态获取灵感
   * @param {String} status - 'unprocessed' | 'processing' | 'completed'
   * @returns {Promise<Array>}
   */
  async getInspirationsByStatus(status) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inspirations'], 'readonly');
      const store = transaction.objectStore('inspirations');
      const index = store.index('status');
      const request = index.getAll(status);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 保存灵感
   * @param {Object} inspiration - 灵感对象
   * @returns {Promise<void>}
   */
  async saveInspiration(inspiration) {
    return this.save('inspirations', inspiration);
  }

  /**
   * 获取灵感
   * @param {String} id - 灵感ID
   * @returns {Promise<Object|null>}
   */
  async getInspiration(id) {
    return this.get('inspirations', id);
  }

  /**
   * 获取所有灵感
   * @returns {Promise<Array>}
   */
  async getAllInspirations() {
    const inspirations = await this.getAll('inspirations');
    // 按创建时间倒序排列（最新的在前）
    return inspirations.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据状态获取灵感
   * @param {String} status - 'unprocessed' | 'processing' | 'completed'
   * @returns {Promise<Array>}
   */
  async getInspirationsByStatus(status) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inspirations'], 'readonly');
      const store = transaction.objectStore('inspirations');
      const index = store.index('status');
      const request = index.getAll(status);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 保存灵感
   * @param {Object} inspiration - 灵感对象
   * @returns {Promise<void>}
   */
  async saveInspiration(inspiration) {
    return this.save('inspirations', inspiration);
  }

  /**
   * 获取灵感
   * @param {String} id - 灵感ID
   * @returns {Promise<Object|null>}
   */
  async getInspiration(id) {
    return this.get('inspirations', id);
  }

  /**
   * 获取所有灵感
   * @returns {Promise<Array>}
   */
  async getAllInspirations() {
    const items = await this.getAll('inspirations');
    // 按创建时间倒序排列（最新的在前）
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据状态获取灵感
   * @param {String} status - 'unprocessed' | 'processing' | 'completed'
   * @returns {Promise<Array>}
   */
  async getInspirationsByStatus(status) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inspirations'], 'readonly');
      const store = transaction.objectStore('inspirations');
      const index = store.index('status');
      const request = index.getAll(status);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 保存灵感
   * @param {Object} inspiration - 灵感对象
   * @returns {Promise<void>}
   */
  async saveInspiration(inspiration) {
    await this.save('inspirations', inspiration);
  }

  /**
   * 获取灵感
   * @param {String} id - 灵感ID
   * @returns {Promise<Object|null>}
   */
  async getInspiration(id) {
    return this.get('inspirations', id);
  }

  /**
   * 获取所有灵感
   * @returns {Promise<Array>}
   */
  async getAllInspirations() {
    return this.getAll('inspirations');
  }

  /**
   * 根据状态获取灵感
   * @param {String} status - 'unprocessed' | 'processing' | 'completed'
   * @returns {Promise<Array>}
   */
  async getInspirationsByStatus(status) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inspirations'], 'readonly');
      const store = transaction.objectStore('inspirations');
      const index = store.index('status');
      const request = index.getAll(status);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 删除灵感
   * @param {String} id - 灵感ID
   * @returns {Promise<void>}
   */
  async deleteInspiration(id) {
    return this.delete('inspirations', id);
  }

  /**
   * 批量保存灵感
   * @param {Array} inspirations - 灵感数组
   * @returns {Promise<void>}
   */
  async saveInspirations(inspirations) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['inspirations'], 'readwrite');
      const store = transaction.objectStore('inspirations');

      let completed = 0;
      const total = inspirations.length;

      inspirations.forEach(inspiration => {
        const request = store.put(inspiration);

        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 清空灵感收件箱
   * @returns {Promise<void>}
   */
  async clearInspirations() {
    return this.clear('inspirations');
  }

  // ========== 知识库业务方法（v4新增） ==========

  /**
   * 保存知识条目
   * @param {Object} item - 知识条目对象
   * @returns {Promise<void>}
   */
  async saveKnowledge(item) {
    if (!item.id) {
      item.id = `knowledge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    item.updatedAt = Date.now();
    await this.save('knowledge', item);
  }

  /**
   * 获取知识条目
   * @param {String} id - 知识ID
   * @returns {Promise<Object|null>}
   */
  async getKnowledge(id) {
    return this.get('knowledge', id);
  }

  /**
   * 获取所有知识条目
   * @returns {Promise<Array>}
   */
  async getAllKnowledge() {
    const items = await this.getAll('knowledge');
    // 按创建时间倒序排序
    return items.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据项目获取知识
   * @param {String} projectId - 项目ID
   * @returns {Promise<Array>}
   */
  async getKnowledgeByProject(projectId) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['knowledge'], 'readonly');
      const store = transaction.objectStore('knowledge');
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => {
        const items = request.result || [];
        // 按创建时间倒序排序
        resolve(items.sort((a, b) => b.createdAt - a.createdAt));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 根据作用域获取知识
   * @param {String} scope - 'project' | 'global'
   * @returns {Promise<Array>}
   */
  async getKnowledgeByScope(scope) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['knowledge'], 'readonly');
      const store = transaction.objectStore('knowledge');
      const index = store.index('scope');
      const request = index.getAll(scope);

      request.onsuccess = () => {
        const items = request.result || [];
        resolve(items.sort((a, b) => b.createdAt - a.createdAt));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 根据文档类型获取知识
   * @param {String} type - 文档类型
   * @returns {Promise<Array>}
   */
  async getKnowledgeByType(type) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['knowledge'], 'readonly');
      const store = transaction.objectStore('knowledge');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        const items = request.result || [];
        resolve(items.sort((a, b) => b.createdAt - a.createdAt));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 根据标签获取知识
   * @param {String} tag - 标签
   * @returns {Promise<Array>}
   */
  async getKnowledgeByTag(tag) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['knowledge'], 'readonly');
      const store = transaction.objectStore('knowledge');
      const index = store.index('tags');
      const request = index.getAll(tag);

      request.onsuccess = () => {
        const items = request.result || [];
        resolve(items.sort((a, b) => b.createdAt - a.createdAt));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 删除知识条目
   * @param {String} id - 知识ID
   * @returns {Promise<void>}
   */
  async deleteKnowledge(id) {
    return this.delete('knowledge', id);
  }

  /**
   * 搜索知识条目
   * @param {String} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchKnowledge(keyword) {
    if (!keyword) {
      return this.getAllKnowledge();
    }

    const allItems = await this.getAllKnowledge();
    const lowerKeyword = keyword.toLowerCase();

    return allItems.filter(item => {
      return (
        item.title.toLowerCase().includes(lowerKeyword) ||
        item.content.toLowerCase().includes(lowerKeyword) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
      );
    });
  }

  /**
   * 批量保存知识条目
   * @param {Array} items - 知识条目数组
   * @returns {Promise<void>}
   */
  async saveKnowledgeItems(items) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['knowledge'], 'readwrite');
      const store = transaction.objectStore('knowledge');

      let completed = 0;
      const total = items.length;

      items.forEach(item => {
        const request = store.put(item);

        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 清空知识库
   * @returns {Promise<void>}
   */
  async clearKnowledge() {
    return this.clear('knowledge');
  }

  // ========== 项目管理业务方法（v5新增） ==========

  /**
   * 保存项目
   * @param {Object} project - 项目对象
   * @returns {Promise<void>}
   */
  async saveProject(project) {
    if (!project.id) {
      project.id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    project.updatedAt = Date.now();
    if (!project.createdAt) {
      project.createdAt = Date.now();
    }
    await this.save('projects', project);
  }

  /**
   * 获取项目
   * @param {String} id - 项目ID
   * @returns {Promise<Object|null>}
   */
  async getProject(id) {
    return this.get('projects', id);
  }

  /**
   * 获取所有项目
   * @returns {Promise<Array>}
   */
  async getAllProjects() {
    const projects = await this.getAll('projects');
    // 按更新时间倒序排序（最近更新的在前）
    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * 根据创意ID获取项目
   * @param {String} ideaId - 创意ID（对话ID）
   * @returns {Promise<Object|null>}
   */
  async getProjectByIdeaId(ideaId) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const index = store.index('ideaId');
      const request = index.get(ideaId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 根据模式获取项目
   * @param {String} mode - 'demo' | 'development'
   * @returns {Promise<Array>}
   */
  async getProjectsByMode(mode) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const index = store.index('mode');
      const request = index.getAll(mode);

      request.onsuccess = () => {
        const projects = request.result || [];
        resolve(projects.sort((a, b) => b.updatedAt - a.updatedAt));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 根据状态获取项目
   * @param {String} status - 'planning' | 'active' | 'completed' | 'archived'
   * @returns {Promise<Array>}
   */
  async getProjectsByStatus(status) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const index = store.index('status');
      const request = index.getAll(status);

      request.onsuccess = () => {
        const projects = request.result || [];
        resolve(projects.sort((a, b) => b.updatedAt - a.updatedAt));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 更新项目模式（Demo → Development升级）
   * @param {String} id - 项目ID
   * @param {String} newMode - 新模式
   * @returns {Promise<void>}
   */
  async updateProjectMode(id, newMode) {
    const project = await this.getProject(id);
    if (!project) {
      throw new Error(`项目不存在: ${id}`);
    }
    project.mode = newMode;
    project.updatedAt = Date.now();
    await this.saveProject(project);
  }

  /**
   * 删除项目
   * @param {String} id - 项目ID
   * @returns {Promise<void>}
   */
  async deleteProject(id) {
    return this.delete('projects', id);
  }

  /**
   * 搜索项目
   * @param {String} keyword - 搜索关键词
   * @returns {Promise<Array>}
   */
  async searchProjects(keyword) {
    if (!keyword) {
      return this.getAllProjects();
    }

    const allProjects = await this.getAllProjects();
    const lowerKeyword = keyword.toLowerCase();

    return allProjects.filter(project => {
      return project.name.toLowerCase().includes(lowerKeyword);
    });
  }

  /**
   * 清空项目
   * @returns {Promise<void>}
   */
  async clearProjects() {
    return this.clear('projects');
  }

  // ========== 工作流交付物业务方法（v6新增） ==========

  /**
   * 保存交付物
   * @param {Object} artifact - 交付物对象
   * @returns {Promise<void>}
   */
  async saveArtifact(artifact) {
    if (!artifact.id) {
      artifact.id = `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!artifact.createdAt) {
      artifact.createdAt = Date.now();
    }
    await this.save('artifacts', artifact);
  }

  /**
   * 获取交付物
   * @param {String} id - 交付物ID
   * @returns {Promise<Object|null>}
   */
  async getArtifact(id) {
    return this.get('artifacts', id);
  }

  /**
   * 获取所有交付物
   * @returns {Promise<Array>}
   */
  async getAllArtifacts() {
    const artifacts = await this.getAll('artifacts');
    // 按创建时间倒序排序
    return artifacts.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * 根据项目获取交付物
   * @param {String} projectId - 项目ID
   * @returns {Promise<Array>}
   */
  async getArtifactsByProject(projectId) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['artifacts'], 'readonly');
      const store = transaction.objectStore('artifacts');
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => {
        const artifacts = request.result || [];
        resolve(artifacts.sort((a, b) => b.createdAt - a.createdAt));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 根据阶段获取交付物
   * @param {String} projectId - 项目ID
   * @param {String} stageId - 阶段ID
   * @returns {Promise<Array>}
   */
  async getArtifactsByStage(projectId, stageId) {
    const projectArtifacts = await this.getArtifactsByProject(projectId);
    return projectArtifacts.filter(artifact => artifact.stageId === stageId);
  }

  /**
   * 根据类型获取交付物
   * @param {String} type - 交付物类型
   * @returns {Promise<Array>}
   */
  async getArtifactsByType(type) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['artifacts'], 'readonly');
      const store = transaction.objectStore('artifacts');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        const artifacts = request.result || [];
        resolve(artifacts.sort((a, b) => b.createdAt - a.createdAt));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 删除交付物
   * @param {String} id - 交付物ID
   * @returns {Promise<void>}
   */
  async deleteArtifact(id) {
    return this.delete('artifacts', id);
  }

  /**
   * 批量保存交付物
   * @param {Array} artifacts - 交付物数组
   * @returns {Promise<void>}
   */
  async saveArtifacts(artifacts) {
    await this.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['artifacts'], 'readwrite');
      const store = transaction.objectStore('artifacts');

      let completed = 0;
      const total = artifacts.length;

      if (total === 0) {
        resolve();
        return;
      }

      artifacts.forEach(artifact => {
        const request = store.put(artifact);

        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }

  /**
   * 清空交付物
   * @returns {Promise<void>}
   */
  async clearArtifacts() {
    return this.clear('artifacts');
  }

  /**
   * 删除项目的所有交付物
   * @param {String} projectId - 项目ID
   * @returns {Promise<void>}
   */
  async deleteProjectArtifacts(projectId) {
    const artifacts = await this.getArtifactsByProject(projectId);
    for (const artifact of artifacts) {
      await this.deleteArtifact(artifact.id);
    }
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
}
