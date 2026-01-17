/**
 * AgentService - 前端数字员工管理服务
 *
 * 职责：
 * 1. 与后端/api/agents接口通信
 * 2. 管理数字员工聘用和解雇
 * 3. 处理员工任务分配
 */

import { apiClient } from '../core/api-client.js';

export class AgentService {
  constructor() {
    this.agents = [];
  }

  /**
   * 初始化Service
   */
  async init() {
    console.log('[AgentService] 初始化完成');
  }

  /**
   * 获取可用的员工类型
   * @returns {Promise<Array>} 员工类型列表
   */
  async getAgentTypes() {
    try {
      const response = await apiClient.get('/api/agents/types');

      if (response.code === 0) {
        console.log('[AgentService] 获取员工类型成功', response.data.length);
        return response.data;
      } else {
        throw new Error(response.error || '获取员工类型失败');
      }
    } catch (error) {
      console.error('[AgentService] 获取员工类型失败:', error);
      throw error;
    }
  }

  /**
   * 聘用员工
   * @param {string} agentType - 员工类型
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 聘用的员工
   */
  async hireAgent(agentType, config = {}) {
    try {
      const userId = this._getCurrentUserId();

      console.log('[AgentService] 聘用员工', agentType);

      const response = await apiClient.post('/api/agents/hire', {
        userId,
        agentType,
        config
      });

      if (response.code === 0) {
        const agent = response.data;
        this.agents.push(agent);

        console.log('[AgentService] 聘用员工成功', agent.id);
        return agent;
      } else {
        throw new Error(response.error || '聘用员工失败');
      }
    } catch (error) {
      console.error('[AgentService] 聘用员工失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的员工列表
   * @returns {Promise<Array>} 员工列表
   */
  async getUserAgents() {
    try {
      const userId = this._getCurrentUserId();

      const response = await apiClient.get(`/api/agents/user/${userId}`);

      if (response.code === 0) {
        this.agents = response.data;
        console.log('[AgentService] 获取员工列表成功', this.agents.length);
        return this.agents;
      } else {
        throw new Error(response.error || '获取员工列表失败');
      }
    } catch (error) {
      console.error('[AgentService] 获取员工列表失败:', error);
      throw error;
    }
  }

  /**
   * 解雇员工
   * @param {string} agentId - 员工ID
   * @returns {Promise<boolean>} 是否成功
   */
  async fireAgent(agentId) {
    try {
      const userId = this._getCurrentUserId();

      const response = await apiClient.post('/api/agents/fire', {
        userId,
        agentId
      });

      if (response.code === 0) {
        // 从本地列表移除
        this.agents = this.agents.filter(a => a.id !== agentId);

        console.log('[AgentService] 解雇员工成功', agentId);
        return true;
      } else {
        throw new Error(response.error || '解雇员工失败');
      }
    } catch (error) {
      console.error('[AgentService] 解雇员工失败:', error);
      throw error;
    }
  }

  /**
   * 分配任务给员工
   * @param {string} agentId - 员工ID
   * @param {string} taskType - 任务类型
   * @param {Object} taskData - 任务数据
   * @returns {Promise<Object>} 任务结果
   */
  async assignTask(agentId, taskType, taskData) {
    try {
      console.log('[AgentService] 分配任务', { agentId, taskType });

      const response = await apiClient.post('/api/agents/assign-task', {
        agentId,
        taskType,
        taskData
      });

      if (response.code === 0) {
        console.log('[AgentService] 任务分配成功');
        return response.data;
      } else {
        throw new Error(response.error || '任务分配失败');
      }
    } catch (error) {
      console.error('[AgentService] 任务分配失败:', error);
      throw error;
    }
  }

  /**
   * 获取员工的任务历史
   * @param {string} agentId - 员工ID
   * @returns {Promise<Array>} 任务列表
   */
  async getAgentTasks(agentId) {
    try {
      const response = await apiClient.get(`/api/agents/${agentId}/tasks`);

      if (response.code === 0) {
        console.log('[AgentService] 获取任务历史成功', response.data.length);
        return response.data;
      } else {
        throw new Error(response.error || '获取任务历史失败');
      }
    } catch (error) {
      console.error('[AgentService] 获取任务历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取员工统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const response = await apiClient.get('/api/agents/stats/summary');

      if (response.code === 0) {
        return response.data;
      } else {
        throw new Error(response.error || '获取统计信息失败');
      }
    } catch (error) {
      console.error('[AgentService] 获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 渲染员工卡片
   * @param {Object} agent - 员工对象
   * @param {HTMLElement} container - 容器元素
   */
  renderAgentCard(agent, container) {
    if (!agent || !container) {
      console.error('[AgentService] 渲染员工卡片失败：参数无效');
      return;
    }

    const cardHTML = `
      <div class="agent-card" data-agent-id="${agent.id}">
        <div class="agent-header">
          <div class="agent-icon">${agent.icon || '👨‍💼'}</div>
          <div class="agent-info">
            <h3>${agent.name || agent.agentType}</h3>
            <p class="agent-type">${agent.agentType}</p>
          </div>
        </div>
        <div class="agent-stats">
          <div class="stat">
            <span class="stat-label">已完成</span>
            <span class="stat-value">${agent.completedTasks || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">进行中</span>
            <span class="stat-value">${agent.runningTasks || 0}</span>
          </div>
        </div>
        <div class="agent-actions">
          <button class="btn-assign" onclick="window.agentService.openAssignTaskModal('${agent.id}')">
            分配任务
          </button>
          <button class="btn-fire" onclick="window.agentService.confirmFireAgent('${agent.id}')">
            解雇
          </button>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', cardHTML);
  }

  /**
   * 打开任务分配弹窗
   * @param {string} agentId - 员工ID
   */
  openAssignTaskModal(agentId) {
    console.log('[AgentService] 打开任务分配弹窗', agentId);
    // TODO: 实现任务分配弹窗
    alert('任务分配功能开发中...');
  }

  /**
   * 确认解雇员工
   * @param {string} agentId - 员工ID
   */
  async confirmFireAgent(agentId) {
    if (confirm('确定要解雇这个员工吗？')) {
      try {
        await this.fireAgent(agentId);
        alert('员工已解雇');

        // 移除卡片
        const card = document.querySelector(`[data-agent-id="${agentId}"]`);
        if (card) {
          card.remove();
        }
      } catch (error) {
        alert('解雇失败：' + error.message);
      }
    }
  }

  /**
   * 获取当前用户ID
   * @private
   * @returns {string} 用户ID
   */
  _getCurrentUserId() {
    const username = localStorage.getItem('thinkcraft_username') || 'default_user';
    return `user_${username}`;
  }
}

// 创建单例实例
export const agentService = new AgentService();

// 暴露到全局（供HTML内联事件使用）
window.agentService = agentService;

export default AgentService;
