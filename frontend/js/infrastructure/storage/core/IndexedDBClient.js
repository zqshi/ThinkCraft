/**
 * IndexedDB 基础客户端
 * 提供数据库连接和基本操作
 */
export class IndexedDBClient {
  constructor(dbName = 'ThinkCraft', version = 4) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.ready = false;
  }

  /**
   * 初始化数据库连接
   * @param {Array} storeDefinitions - 对象存储定义数组
   * @returns {Promise<void>}
   */
  async init(storeDefinitions) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[IndexedDBClient] 数据库打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.ready = true;
        console.log(`[IndexedDBClient] 数据库 ${this.dbName} v${this.version} 已连接`);
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log(`[IndexedDBClient] 数据库升级: v${event.oldVersion} -> v${event.newVersion}`);

        // 根据定义创建对象存储
        storeDefinitions.forEach(({ name, keyPath, indexes }) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });

            // 创建索引
            if (indexes && Array.isArray(indexes)) {
              indexes.forEach(({ name: indexName, keyPath: indexKeyPath, options }) => {
                store.createIndex(indexName, indexKeyPath, options || {});
              });
            }

            console.log(`[IndexedDBClient] 创建对象存储: ${name}`);
          }
        });
      };
    });
  }

  /**
   * 确保数据库已就绪
   * @returns {Promise<void>}
   */
  async ensureReady() {
    if (this.ready) return;
    throw new Error('Database not initialized. Call init() first.');
  }

  /**
   * 获取事务
   * @param {string} storeName - 对象存储名称
   * @param {string} mode - 事务模式 'readonly' | 'readwrite'
   * @returns {IDBTransaction}
   */
  getTransaction(storeName, mode = 'readonly') {
    return this.db.transaction([storeName], mode);
  }

  /**
   * 获取对象存储
   * @param {string} storeName - 对象存储名称
   * @param {string} mode - 事务模式
   * @returns {IDBObjectStore}
   */
  getStore(storeName, mode = 'readonly') {
    const transaction = this.getTransaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.ready = false;
      console.log('[IndexedDBClient] 数据库已关闭');
    }
  }

  /**
   * 删除数据库
   * @returns {Promise<void>}
   */
  async deleteDatabase() {
    return new Promise((resolve, reject) => {
      this.close();

      const request = indexedDB.deleteDatabase(this.dbName);

      request.onsuccess = () => {
        console.log(`[IndexedDBClient] 数据库 ${this.dbName} 已删除`);
        resolve();
      };

      request.onerror = () => {
        console.error('[IndexedDBClient] 数据库删除失败:', request.error);
        reject(request.error);
      };
    });
  }
}

// 导出单例实例
export const dbClient = new IndexedDBClient();
