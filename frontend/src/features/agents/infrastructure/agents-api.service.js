/**
 * Agents API服务
 * 提供数字员工相关的API调用接口
 */
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class AgentsApiService {
  constructor() {
    this.basePath = '/agents';
  }

  /**
   * 获取Agent列表
   */
  async getAgents(projectId, status = null) {
    const params = { projectId };
    if (status) {
      params.status = status;
    }

    return apiClient.get(this.basePath, params);
  }

  /**
   * 获取Agent详情
   */
  async getAgent(agentId) {
    return apiClient.get(`${this.basePath}/${agentId}`);
  }

  /**
   * 创建Agent
   */
  async createAgent(agentData) {
    return apiClient.post(this.basePath, agentData);
  }

  /**
   * 更新Agent
   */
  async updateAgent(agentId, updateData) {
    return apiClient.put(`${this.basePath}/${agentId}`, updateData);
  }

  /**
   * 删除Agent
   */
  async deleteAgent(agentId) {
    return apiClient.delete(`${this.basePath}/${agentId}`);
  }

  /**
   * 启动Agent
   */
  async startAgent(agentId) {
    return apiClient.post(`${this.basePath}/${agentId}/start`);
  }

  /**
   * 停止Agent
   */
  async stopAgent(agentId) {
    return apiClient.post(`${this.basePath}/${agentId}/stop`);
  }

  /**
   * 重启Agent
   */
  async restartAgent(agentId) {
    return apiClient.post(`${this.basePath}/${agentId}/restart`);
  }

  /**
   * 获取Agent状态
   */
  async getAgentStatus(agentId) {
    return apiClient.get(`${this.basePath}/${agentId}/status`);
  }

  /**
   * 获取Agent日志
   */
  async getAgentLogs(agentId, limit = 100, offset = 0) {
    return apiClient.get(`${this.basePath}/${agentId}/logs`, { limit, offset });
  }

  /**
   * 发送任务给Agent
   */
  async sendTask(agentId, task) {
    return apiClient.post(`${this.basePath}/${agentId}/tasks`, task);
  }

  /**
   * 获取Agent任务列表
   */
  async getAgentTasks(agentId, status = null) {
    const params = {};
    if (status) {
      params.status = status;
    }
    return apiClient.get(`${this.basePath}/${agentId}/tasks`, params);
  }

  /**
   * 获取Agent任务详情
   */
  async getTask(agentId, taskId) {
    return apiClient.get(`${this.basePath}/${agentId}/tasks/${taskId}`);
  }

  /**
   * 取消Agent任务
   */
  async cancelTask(agentId, taskId) {
    return apiClient.post(`${this.basePath}/${agentId}/tasks/${taskId}/cancel`);
  }

  /**
   * 获取可用的Agent类型
   */
  async getAgentTypes() {
    return apiClient.get(`${this.basePath}/types`);
  }

  /**
   * 获取Agent能力列表
   */
  async getAgentCapabilities(agentId) {
    return apiClient.get(`${this.basePath}/${agentId}/capabilities`);
  }

  /**
   * 更新Agent能力
   */
  async updateAgentCapabilities(agentId, capabilities) {
    return apiClient.put(`${this.basePath}/${agentId}/capabilities`, { capabilities });
  }

  /**
   * 获取Agent配置
   */
  async getAgentConfig(agentId) {
    return apiClient.get(`${this.basePath}/${agentId}/config`);
  }

  /**
   * 更新Agent配置
   */
  async updateAgentConfig(agentId, config) {
    return apiClient.put(`${this.basePath}/${agentId}/config`, config);
  }

  /**
   * 获取Agent统计信息
   */
  async getAgentStats(agentId) {
    return apiClient.get(`${this.basePath}/${agentId}/stats`);
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus() {
    return apiClient.get(`${this.basePath}/system/status`);
  }

  /**
   * 广播消息给所有Agent
   */
  async broadcastMessage(message) {
    return apiClient.post(`${this.basePath}/broadcast`, { message });
  }

  /**
   * 多Agent协作
   */
  async collaborate(agentIds, task, collaborationType = 'parallel') {
    return apiClient.post(`${this.basePath}/collaborate`, {
      agentIds,
      task,
      collaborationType
    });
  }

  /**
   * 获取Agent模板
   */
  async getAgentTemplates() {
    return apiClient.get(`${this.basePath}/templates`);
  }

  /**
   * 从模板创建Agent
   */
  async createAgentFromTemplate(templateId, config = {}) {
    return apiClient.post(`${this.basePath}/templates/${templateId}/create`, config);
  }

  /**
   * 导出Agent配置
   */
  async exportAgentConfig(agentId) {
    return apiClient.get(`${this.basePath}/${agentId}/export`);
  }

  /**
   * 导入Agent配置
   */
  async importAgentConfig(config) {
    return apiClient.post(`${this.basePath}/import`, config);
  }
}

// 创建单例实例
export const agentsApiService = new AgentsApiService();
