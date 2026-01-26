/**
 * 存储服务
 * 封装localStorage/sessionStorage操作
 */
export class StorageService {
  constructor(storageType = 'localStorage') {
    this.storage = storageType === 'sessionStorage' ? sessionStorage : localStorage;
    this.prefix = 'thinkcraft_';
  }

  /**
   * 设置值
   */
  set(key, value, expireTime = null) {
    try {
      const data = {
        value: value,
        expireTime: expireTime ? Date.now() + expireTime : null,
        timestamp: Date.now()
      };

      this.storage.setItem(this.prefix + key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('[StorageService] 设置值失败:', error);
      return false;
    }
  }

  /**
   * 获取值
   */
  get(key, defaultValue = null) {
    try {
      const data = this.storage.getItem(this.prefix + key);
      if (!data) {
        return defaultValue;
      }

      const parsed = JSON.parse(data);

      // 检查是否过期
      if (parsed.expireTime && Date.now() > parsed.expireTime) {
        this.remove(key);
        return defaultValue;
      }

      return parsed.value;
    } catch (error) {
      console.error('[StorageService] 获取值失败:', error);
      return defaultValue;
    }
  }

  /**
   * 删除值
   */
  remove(key) {
    try {
      this.storage.removeItem(this.prefix + key);
      return true;
    } catch (error) {
      console.error('[StorageService] 删除值失败:', error);
      return false;
    }
  }

  /**
   * 清空所有值
   */
  clear() {
    try {
      // 只清除带前缀的项
      const keysToRemove = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        this.storage.removeItem(key);
      });

      return true;
    } catch (error) {
      console.error('[StorageService] 清空失败:', error);
      return false;
    }
  }

  /**
   * 获取所有键
   */
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  /**
   * 检查是否存在
   */
  has(key) {
    return this.storage.getItem(this.prefix + key) !== null;
  }

  /**
   * 设置临时值（会话存储）
   */
  setSession(key, value) {
    return this.set(key, value, 24 * 60 * 60 * 1000); // 24小时
  }

  /**
   * 设置长期值（本地存储）
   */
  setPersistent(key, value) {
    return this.set(key, value, 365 * 24 * 60 * 60 * 1000); // 1年
  }
}

// 创建存储服务实例
export const localStorageService = new StorageService('localStorage');
export const sessionStorageService = new StorageService('sessionStorage');
