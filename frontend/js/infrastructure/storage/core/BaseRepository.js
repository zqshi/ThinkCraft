/**
 * Repository 基类
 * 提供通用的 CRUD 操作
 */
export class BaseRepository {
  constructor(dbClient, storeName) {
    this.dbClient = dbClient;
    this.storeName = storeName;
  }

  /**
   * 添加单个项
   * @param {Object} item - 要添加的项
   * @returns {Promise<any>} 添加项的key
   */
  async add(item) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readwrite');
      const request = store.add(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 保存（添加或更新）
   * @param {Object} item - 要保存的项
   * @returns {Promise<any>} 保存项的key
   */
  async save(item) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readwrite');
      const request = store.put(item);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 根据ID获取单个项
   * @param {any} id - 项的ID
   * @returns {Promise<Object|null>} 找到的项或null
   */
  async getById(id) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readonly');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有项
   * @returns {Promise<Array>} 所有项的数组
   */
  async getAll() {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readonly');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 根据索引查询
   * @param {string} indexName - 索引名称
   * @param {any} value - 索引值
   * @returns {Promise<Array>} 匹配的项数组
   */
  async getByIndex(indexName, value) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readonly');
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 根据索引范围查询
   * @param {string} indexName - 索引名称
   * @param {IDBKeyRange} range - 查询范围
   * @returns {Promise<Array>} 匹配的项数组
   */
  async getByRange(indexName, range) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readonly');
      const index = store.index(indexName);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除单个项
   * @param {any} id - 项的ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readwrite');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 批量删除
   * @param {Array<any>} ids - 要删除的ID数组
   * @returns {Promise<void>}
   */
  async deleteMany(ids) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.dbClient.getTransaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      ids.forEach(id => {
        store.delete(id);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 清空存储
   * @returns {Promise<void>}
   */
  async clear() {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readwrite');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 统计数量
   * @returns {Promise<number>} 存储中的项数量
   */
  async count() {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const store = this.dbClient.getStore(this.storeName, 'readonly');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 检查项是否存在
   * @param {any} id - 项的ID
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const item = await this.getById(id);
    return item !== null;
  }

  /**
   * 批量保存
   * @param {Array<Object>} items - 要保存的项数组
   * @returns {Promise<void>}
   */
  async saveMany(items) {
    await this.dbClient.ensureReady();

    return new Promise((resolve, reject) => {
      const transaction = this.dbClient.getTransaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      items.forEach(item => {
        store.put(item);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
