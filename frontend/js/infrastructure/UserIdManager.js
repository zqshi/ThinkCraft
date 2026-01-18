/**
 * 用户ID管理器 (Singleton)
 *
 * 职责：
 * - 提供全局统一的用户ID
 * - 确保ID在页面刷新后保持不变
 * - 防止多次初始化导致ID重复生成
 *
 * 使用方式：
 * ```javascript
 * import { UserIdManager } from './infrastructure/UserIdManager.js';
 * const userId = UserIdManager.getUserId(); // 始终返回同一个ID
 * ```
 */

class UserIdManagerClass {
  constructor() {
    this.STORAGE_KEY = 'thinkcraft_user_id';
    this._userId = null;
    this._initialized = false;
  }

  /**
   * 初始化用户ID（应用启动时调用一次）
   * @returns {string} 用户ID
   */
  init() {
    if (this._initialized) {
      console.warn('[UserIdManager] 已经初始化，跳过重复初始化');
      return this._userId;
    }

    // 1. 尝试从localStorage读取
    this._userId = localStorage.getItem(this.STORAGE_KEY);

    // 2. 如果不存在，生成新ID并保存
    if (!this._userId) {
      this._userId = this._generateUserId();
      this._saveToStorage(this._userId);
      console.log('[UserIdManager] 🆕 生成新用户ID:', this._userId);
    } else {
      console.log('[UserIdManager] ✅ 使用已有用户ID:', this._userId);
    }

    // 3. 暴露到window全局（向后兼容）
    window.USER_ID = this._userId;

    this._initialized = true;
    return this._userId;
  }

  /**
   * 获取用户ID（推荐使用此方法）
   * @returns {string} 用户ID
   */
  getUserId() {
    // 如果未初始化，自动初始化
    if (!this._initialized) {
      console.warn('[UserIdManager] 未初始化，自动初始化...');
      return this.init();
    }

    return this._userId;
  }

  /**
   * 重置用户ID（仅用于测试或特殊场景）
   * @param {string} newUserId - 新的用户ID（可选，不传则生成新ID）
   */
  reset(newUserId = null) {
    const oldUserId = this._userId;

    if (newUserId) {
      this._userId = newUserId;
    } else {
      this._userId = this._generateUserId();
    }

    this._saveToStorage(this._userId);
    window.USER_ID = this._userId;

    console.log(`[UserIdManager] 🔄 用户ID已重置: ${oldUserId} -> ${this._userId}`);
    return this._userId;
  }

  /**
   * 生成用户ID
   * @private
   */
  _generateUserId() {
    return 'user_' + Date.now();
  }

  /**
   * 保存到localStorage
   * @private
   */
  _saveToStorage(userId) {
    try {
      localStorage.setItem(this.STORAGE_KEY, userId);
    } catch (error) {
      console.error('[UserIdManager] 保存到localStorage失败:', error);
    }
  }

  /**
   * 检查是否已初始化
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }
}

// 创建单例实例
export const UserIdManager = new UserIdManagerClass();

// 默认导出
export default UserIdManager;
