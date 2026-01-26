/**
 * Agents存储服务
 * 处理数字员工数据的本地存储
 */
import { storageService } from '../../../shared/infrastructure/storage.service.js';

const AGENTS_STORAGE_KEYS = {
  ACTIVE_AGENT: 'agents:active',
  AGENT_PREFERENCES: 'agents:preferences',
  AGENT_TEMPLATES: 'agents:templates',
  AGENT_CACHE: 'agents:cache',
  TASK_CACHE: 'agents:tasks:cache',
  COLLABORATION_HISTORY: 'agents:collaboration:history'
};

export class AgentsStorageService {
  constructor() {
    this.storage = storageService;
  }

  /**
   * 保存活跃的Agent ID
   */
  setActiveAgentId(agentId) {
    this.storage.set(AGENTS_STORAGE_KEYS.ACTIVE_AGENT, agentId);
  }

  /**
   * 获取活跃的Agent ID
   */
  getActiveAgentId() {
    return this.storage.get(AGENTS_STORAGE_KEYS.ACTIVE_AGENT);
  }

  /**
   * 清除活跃的Agent
   */
  clearActiveAgent() {
    this.storage.remove(AGENTS_STORAGE_KEYS.ACTIVE_AGENT);
  }

  /**
   * 保存Agent偏好设置
   */
  saveAgentPreferences(agentId, preferences) {
    const allPreferences = this.getAllAgentPreferences();
    allPreferences[agentId] = {
      ...preferences,
      updatedAt: new Date().toISOString()
    };
    this.storage.set(AGENTS_STORAGE_KEYS.AGENT_PREFERENCES, allPreferences);
  }

  /**
   * 获取Agent偏好设置
   */
  getAgentPreferences(agentId) {
    const allPreferences = this.getAllAgentPreferences();
    return allPreferences[agentId] || this.getDefaultPreferences();
  }

  /**
   * 获取所有Agent偏好设置
   */
  getAllAgentPreferences() {
    return this.storage.get(AGENTS_STORAGE_KEYS.AGENT_PREFERENCES) || {};
  }

  /**
   * 获取默认偏好设置
   */
  getDefaultPreferences() {
    return {
      autoStart: false,
      notifications: true,
      soundEnabled: true,
      theme: 'light',
      language: 'zh-CN',
      timezone: 'Asia/Shanghai',
      workHours: {
        start: '09:00',
        end: '18:00'
      },
      maxConcurrentTasks: 3,
      retryAttempts: 3,
      timeout: 30000
    };
  }

  /**
   * 保存Agent模板
   */
  saveAgentTemplates(templates) {
    this.storage.set(AGENTS_STORAGE_KEYS.AGENT_TEMPLATES, {
      templates,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 获取Agent模板
   */
  getAgentTemplates() {
    const data = this.storage.get(AGENTS_STORAGE_KEYS.AGENT_TEMPLATES);
    return data ? data.templates : [];
  }

  /**
   * 缓存Agent数据
   */
  cacheAgent(agentId, agentData) {
    const cache = this.getAgentCache();
    cache[agentId] = {
      data: agentData,
      timestamp: new Date().toISOString()
    };
    this.storage.set(AGENTS_STORAGE_KEYS.AGENT_CACHE, cache);
  }

  /**
   * 获取缓存的Agent数据
   */
  getCachedAgent(agentId) {
    const cache = this.getAgentCache();
    const cached = cache[agentId];

    // 检查缓存是否过期（5分钟）
    if (cached && cached.timestamp) {
      const cacheTime = new Date(cached.timestamp).getTime();
      const now = new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - cacheTime < fiveMinutes) {
        return cached.data;
      }
    }

    return null;
  }

  /**
   * 获取所有Agent缓存
   */
  getAgentCache() {
    return this.storage.get(AGENTS_STORAGE_KEYS.AGENT_CACHE) || {};
  }

  /**
   * 清除Agent缓存
   */
  clearAgentCache(agentId) {
    const cache = this.getAgentCache();
    delete cache[agentId];
    this.storage.set(AGENTS_STORAGE_KEYS.AGENT_CACHE, cache);
  }

  /**
   * 缓存任务数据
   */
  cacheTask(taskId, taskData) {
    const cache = this.getTaskCache();
    cache[taskId] = {
      data: taskData,
      timestamp: new Date().toISOString()
    };
    this.storage.set(AGENTS_STORAGE_KEYS.TASK_CACHE, cache);
  }

  /**
   * 获取缓存的任务数据
   */
  getCachedTask(taskId) {
    const cache = this.getTaskCache();
    const cached = cache[taskId];

    // 检查缓存是否过期（2分钟）
    if (cached && cached.timestamp) {
      const cacheTime = new Date(cached.timestamp).getTime();
      const now = new Date().getTime();
      const twoMinutes = 2 * 60 * 1000;

      if (now - cacheTime < twoMinutes) {
        return cached.data;
      }
    }

    return null;
  }

  /**
   * 获取所有任务缓存
   */
  getTaskCache() {
    return this.storage.get(AGENTS_STORAGE_KEYS.TASK_CACHE) || {};
  }

  /**
   * 保存协作历史
   */
  saveCollaborationHistory(history) {
    const allHistory = this.getCollaborationHistory();
    allHistory.push({
      ...history,
      timestamp: new Date().toISOString()
    });

    // 只保留最近100条记录
    if (allHistory.length > 100) {
      allHistory.splice(0, allHistory.length - 100);
    }

    this.storage.set(AGENTS_STORAGE_KEYS.COLLABORATION_HISTORY, allHistory);
  }

  /**
   * 获取协作历史
   */
  getCollaborationHistory() {
    return this.storage.get(AGENTS_STORAGE_KEYS.COLLABORATION_HISTORY) || [];
  }

  /**
   * 清除所有Agent相关数据
   */
  clearAll() {
    Object.values(AGENTS_STORAGE_KEYS).forEach(key => {
      this.storage.remove(key);
    });
  }

  /**
   * 导出Agent数据
   */
  exportAgentData() {
    return {
      preferences: this.getAllAgentPreferences(),
      templates: this.getAgentTemplates(),
      cache: this.getAgentCache(),
      collaborationHistory: this.getCollaborationHistory(),
      exportTime: new Date().toISOString()
    };
  }

  /**
   * 导入Agent数据
   */
  importAgentData(data) {
    if (!data) {
      return false;
    }

    try {
      if (data.preferences) {
        this.storage.set(AGENTS_STORAGE_KEYS.AGENT_PREFERENCES, data.preferences);
      }
      if (data.templates) {
        this.saveAgentTemplates(data.templates);
      }
      if (data.cache) {
        this.storage.set(AGENTS_STORAGE_KEYS.AGENT_CACHE, data.cache);
      }
      if (data.collaborationHistory) {
        this.storage.set(AGENTS_STORAGE_KEYS.COLLABORATION_HISTORY, data.collaborationHistory);
      }

      return true;
    } catch (error) {
      console.error('导入Agent数据失败:', error);
      return false;
    }
  }
}

// 创建单例实例
export const agentsStorageService = new AgentsStorageService();
