import { BaseRepository } from '../core/BaseRepository.js';

/**
 * Settings Repository
 * 管理设置数据的持久化
 */
export class SettingsRepository extends BaseRepository {
  constructor(dbClient) {
    super(dbClient, 'settings');
  }

  /**
   * 保存设置项
   * @param {string} key - 设置键
   * @param {any} value - 设置值
   * @returns {Promise<any>}
   */
  async set(key, value) {
    return this.save({ key, value });
  }

  /**
   * 获取设置项
   * @param {string} key - 设置键
   * @param {any} defaultValue - 默认值
   * @returns {Promise<any>}
   */
  async get(key, defaultValue = null) {
    const setting = await this.getById(key);
    return setting ? setting.value : defaultValue;
  }

  /**
   * 删除设置项
   * @param {string} key - 设置键
   * @returns {Promise<void>}
   */
  async remove(key) {
    return this.delete(key);
  }

  /**
   * 获取所有设置
   * @returns {Promise<Object>}
   */
  async getAllSettings() {
    const settings = await this.getAll();
    const result = {};

    settings.forEach(({ key, value }) => {
      result[key] = value;
    });

    return result;
  }

  /**
   * 批量设置
   * @param {Object} settings - 设置对象
   * @returns {Promise<void>}
   */
  async setMany(settings) {
    const items = Object.entries(settings).map(([key, value]) => ({
      key,
      value
    }));

    return this.saveMany(items);
  }

  /**
   * 清空所有设置
   * @returns {Promise<void>}
   */
  async clearAll() {
    return this.clear();
  }

  /**
   * 检查设置是否存在
   * @param {string} key - 设置键
   * @returns {Promise<boolean>}
   */
  async has(key) {
    return this.exists(key);
  }
}
