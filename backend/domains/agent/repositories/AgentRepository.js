/**
 * AgentRepository - Agent数据持久化仓储
 * 使用JSON文件存储，确保数据在后端重启后不丢失
 *
 * 存储结构：
 * {
 *   "users": {
 *     "user_xxx": {
 *       "agents": [...],
 *       "updatedAt": "..."
 *     }
 *   }
 * }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AgentRepository {
  constructor(dataDir = null) {
    // 数据存储目录（默认：backend/data）
    this.dataDir = dataDir || path.join(__dirname, '../../data');
    this.filePath = path.join(this.dataDir, 'agents.json');

    // 确保数据目录存在
    this._ensureDataDir();

    // 内存缓存（提高性能）
    this.cache = null;

    // 加载数据
    this._loadData();

    console.log('[AgentRepository] 初始化完成，数据文件:', this.filePath);
  }

  /**
   * 确保数据目录存在
   * @private
   */
  _ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
      console.log('[AgentRepository] 创建数据目录:', this.dataDir);
    }
  }

  /**
   * 从文件加载数据
   * @private
   */
  _loadData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        this.cache = JSON.parse(data);
        console.log('[AgentRepository] 加载数据成功，用户数:', Object.keys(this.cache.users || {}).length);
      } else {
        // 文件不存在，初始化空数据
        this.cache = { users: {}, version: '1.0' };
        this._saveData();
        console.log('[AgentRepository] 初始化空数据文件');
      }
    } catch (error) {
      console.error('[AgentRepository] 加载数据失败:', error);
      // 加载失败，使用空数据
      this.cache = { users: {}, version: '1.0' };
    }
  }

  /**
   * 保存数据到文件
   * @private
   */
  _saveData() {
    try {
      const data = JSON.stringify(this.cache, null, 2);
      fs.writeFileSync(this.filePath, data, 'utf8');
      // console.log('[AgentRepository] 数据已保存');
    } catch (error) {
      console.error('[AgentRepository] 保存数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有Agent
   * @param {string} userId - 用户ID
   * @returns {Array<Object>} Agent列表（原始JSON格式）
   */
  getUserAgents(userId) {
    if (!this.cache.users[userId]) {
      return [];
    }
    return this.cache.users[userId].agents || [];
  }

  /**
   * 保存用户的Agent（新增或更新）
   * @param {string} userId - 用户ID
   * @param {Object} agentData - Agent数据（toJSON()格式）
   * @returns {boolean} 是否成功
   */
  saveAgent(userId, agentData) {
    try {
      // 确保用户数据存在
      if (!this.cache.users[userId]) {
        this.cache.users[userId] = {
          agents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }

      const userData = this.cache.users[userId];

      // 检查是否已存在（更新）
      const existingIndex = userData.agents.findIndex(a => a.id === agentData.id);

      if (existingIndex >= 0) {
        // 更新现有Agent
        userData.agents[existingIndex] = agentData;
      } else {
        // 新增Agent
        userData.agents.push(agentData);
      }

      userData.updatedAt = new Date().toISOString();

      // 保存到文件
      this._saveData();

      return true;
    } catch (error) {
      console.error('[AgentRepository] 保存Agent失败:', error);
      return false;
    }
  }

  /**
   * 批量保存用户的Agent
   * @param {string} userId - 用户ID
   * @param {Array<Object>} agentsData - Agent数据列表
   * @returns {boolean} 是否成功
   */
  saveUserAgents(userId, agentsData) {
    try {
      this.cache.users[userId] = {
        agents: agentsData,
        updatedAt: new Date().toISOString(),
        createdAt: this.cache.users[userId]?.createdAt || new Date().toISOString()
      };

      this._saveData();
      return true;
    } catch (error) {
      console.error('[AgentRepository] 批量保存失败:', error);
      return false;
    }
  }

  /**
   * 删除用户的Agent
   * @param {string} userId - 用户ID
   * @param {string} agentId - Agent ID
   * @returns {boolean} 是否成功
   */
  deleteAgent(userId, agentId) {
    try {
      if (!this.cache.users[userId]) {
        return false;
      }

      const userData = this.cache.users[userId];
      const originalLength = userData.agents.length;

      userData.agents = userData.agents.filter(a => a.id !== agentId);

      if (userData.agents.length < originalLength) {
        userData.updatedAt = new Date().toISOString();
        this._saveData();
        return true;
      }

      return false;
    } catch (error) {
      console.error('[AgentRepository] 删除Agent失败:', error);
      return false;
    }
  }

  /**
   * 清空用户的所有Agent（测试用）
   * @param {string} userId - 用户ID
   */
  clearUserAgents(userId) {
    if (this.cache.users[userId]) {
      this.cache.users[userId].agents = [];
      this.cache.users[userId].updatedAt = new Date().toISOString();
      this._saveData();
    }
  }

  /**
   * 清空所有数据（测试用）
   */
  clearAll() {
    this.cache = { users: {}, version: '1.0' };
    this._saveData();
    console.log('[AgentRepository] 已清空所有数据');
  }

  /**
   * 获取统计信息
   * @returns {Object}
   */
  getStats() {
    const totalUsers = Object.keys(this.cache.users).length;
    let totalAgents = 0;

    for (const userId in this.cache.users) {
      totalAgents += this.cache.users[userId].agents.length;
    }

    return {
      totalUsers,
      totalAgents,
      dataFile: this.filePath,
      fileExists: fs.existsSync(this.filePath)
    };
  }
}

// 创建单例实例
export const agentRepository = new AgentRepository();

export default AgentRepository;
