/**
 * Agents用例
 * 实现数字员工相关的业务逻辑
 */
import { agentsApiService } from '../infrastructure/agents-api.service.js';
import { agentsStorageService } from '../infrastructure/agents-storage.service.js';
import { agentsEventHandler } from '../infrastructure/agents-event.handler.js';
import { eventBus } from '../../../shared/infrastructure/event-bus.js';

export class AgentsUseCase {
  constructor() {
    this.activeAgents = new Map();
    this.taskQueue = [];
    this.isProcessing = false;
  }

  /**
   * 获取Agent列表
   */
  async getAgents(projectId, status = null) {
    try {
      // 先从缓存获取
      const cachedAgents = agentsStorageService.getCachedAgent('agents_list');
      if (cachedAgents) {
        return cachedAgents;
      }

      // 从API获取
      const agents = await agentsApiService.getAgents(projectId, status);

      // 缓存结果
      agentsStorageService.cacheAgent('agents_list', agents);

      return agents;
    } catch (error) {
      console.error('[AgentsUseCase] 获取Agent列表失败:', error);
      throw new Error('无法获取Agent列表');
    }
  }

  /**
   * 获取Agent详情
   */
  async getAgent(agentId) {
    try {
      // 先从缓存获取
      const cachedAgent = agentsStorageService.getCachedAgent(agentId);
      if (cachedAgent) {
        return cachedAgent;
      }

      // 从API获取
      const agent = await agentsApiService.getAgent(agentId);

      // 缓存结果
      agentsStorageService.cacheAgent(agentId, agent);

      return agent;
    } catch (error) {
      console.error('[AgentsUseCase] 获取Agent详情失败:', error);
      throw new Error('无法获取Agent详情');
    }
  }

  /**
   * 创建Agent
   */
  async createAgent(agentData) {
    try {
      // 验证数据
      this.validateAgentData(agentData);

      // 创建Agent
      const agent = await agentsApiService.createAgent(agentData);

      // 清除缓存
      agentsStorageService.clearAgentCache('agents_list');

      // 触发事件
      agentsEventHandler.emit('agent:created', { agent });

      return agent;
    } catch (error) {
      console.error('[AgentsUseCase] 创建Agent失败:', error);
      throw new Error('无法创建Agent');
    }
  }

  /**
   * 更新Agent
   */
  async updateAgent(agentId, updateData) {
    try {
      const agent = await agentsApiService.updateAgent(agentId, updateData);

      // 更新缓存
      agentsStorageService.cacheAgent(agentId, agent);

      // 触发事件
      agentsEventHandler.emit('agent:updated', { agentId, agent });

      return agent;
    } catch (error) {
      console.error('[AgentsUseCase] 更新Agent失败:', error);
      throw new Error('无法更新Agent');
    }
  }

  /**
   * 删除Agent
   */
  async deleteAgent(agentId) {
    try {
      await agentsApiService.deleteAgent(agentId);

      // 清除缓存
      agentsStorageService.clearAgentCache(agentId);
      agentsStorageService.clearAgentCache('agents_list');

      // 如果删除的是活跃Agent，清除活跃Agent
      if (agentsStorageService.getActiveAgentId() === agentId) {
        agentsStorageService.clearActiveAgent();
      }

      // 触发事件
      agentsEventHandler.emit('agent:deleted', { agentId });

      return true;
    } catch (error) {
      console.error('[AgentsUseCase] 删除Agent失败:', error);
      throw new Error('无法删除Agent');
    }
  }

  /**
   * 启动Agent
   */
  async startAgent(agentId) {
    try {
      const result = await agentsApiService.startAgent(agentId);

      // 添加到活跃Agent列表
      this.activeAgents.set(agentId, {
        id: agentId,
        startedAt: new Date().toISOString(),
        status: 'running'
      });

      // 触发事件
      agentsEventHandler.emit('agent:statusChanged', {
        agentId,
        oldStatus: 'stopped',
        newStatus: 'running'
      });

      return result;
    } catch (error) {
      console.error('[AgentsUseCase] 启动Agent失败:', error);
      throw new Error('无法启动Agent');
    }
  }

  /**
   * 停止Agent
   */
  async stopAgent(agentId) {
    try {
      const result = await agentsApiService.stopAgent(agentId);

      // 从活跃Agent列表移除
      this.activeAgents.delete(agentId);

      // 触发事件
      agentsEventHandler.emit('agent:statusChanged', {
        agentId,
        oldStatus: 'running',
        newStatus: 'stopped'
      });

      return result;
    } catch (error) {
      console.error('[AgentsUseCase] 停止Agent失败:', error);
      throw new Error('无法停止Agent');
    }
  }

  /**
   * 重启Agent
   */
  async restartAgent(agentId) {
    try {
      // 先停止
      await this.stopAgent(agentId);

      // 等待一秒
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 再启动
      return await this.startAgent(agentId);
    } catch (error) {
      console.error('[AgentsUseCase] 重启Agent失败:', error);
      throw new Error('无法重启Agent');
    }
  }

  /**
   * 获取Agent状态
   */
  async getAgentStatus(agentId) {
    try {
      return await agentsApiService.getAgentStatus(agentId);
    } catch (error) {
      console.error('[AgentsUseCase] 获取Agent状态失败:', error);
      throw new Error('无法获取Agent状态');
    }
  }

  /**
   * 发送任务给Agent
   */
  async sendTask(agentId, task) {
    try {
      // 验证任务数据
      this.validateTaskData(task);

      // 发送任务
      const result = await agentsApiService.sendTask(agentId, task);

      // 添加到任务队列
      this.taskQueue.push({
        id: result.taskId,
        agentId,
        task,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // 开始处理任务队列
      this.processTaskQueue();

      // 触发事件
      agentsEventHandler.emit('agent:taskSent', {
        agentId,
        taskId: result.taskId,
        task
      });

      return result;
    } catch (error) {
      console.error('[AgentsUseCase] 发送任务失败:', error);
      throw new Error('无法发送任务');
    }
  }

  /**
   * 获取Agent任务列表
   */
  async getAgentTasks(agentId, status = null) {
    try {
      return await agentsApiService.getAgentTasks(agentId, status);
    } catch (error) {
      console.error('[AgentsUseCase] 获取Agent任务列表失败:', error);
      throw new Error('无法获取Agent任务列表');
    }
  }

  /**
   * 取消Agent任务
   */
  async cancelTask(agentId, taskId) {
    try {
      const result = await agentsApiService.cancelTask(agentId, taskId);

      // 从任务队列移除
      this.taskQueue = this.taskQueue.filter(t => t.id !== taskId);

      // 触发事件
      agentsEventHandler.emit('agent:taskCancelled', {
        agentId,
        taskId
      });

      return result;
    } catch (error) {
      console.error('[AgentsUseCase] 取消任务失败:', error);
      throw new Error('无法取消任务');
    }
  }

  /**
   * 多Agent协作
   */
  async collaborate(agentIds, task, collaborationType = 'parallel') {
    try {
      // 验证协作参数
      if (!agentIds || agentIds.length === 0) {
        throw new Error('至少需要选择一个Agent');
      }

      // 执行协作
      const results = await agentsApiService.collaborate(agentIds, task, collaborationType);

      // 保存协作历史
      agentsStorageService.saveCollaborationHistory({
        agentIds,
        task,
        collaborationType,
        results,
        timestamp: new Date().toISOString()
      });

      // 触发事件
      agentsEventHandler.emit('agent:collaboration', {
        agentIds,
        task,
        collaborationType,
        results
      });

      return results;
    } catch (error) {
      console.error('[AgentsUseCase] 多Agent协作失败:', error);
      throw new Error('无法执行多Agent协作');
    }
  }

  /**
   * 获取可用的Agent类型
   */
  async getAgentTypes() {
    try {
      // 先从缓存获取
      const cachedTypes = agentsStorageService.getCachedAgent('agent_types');
      if (cachedTypes) {
        return cachedTypes;
      }

      // 从API获取
      const types = await agentsApiService.getAgentTypes();

      // 缓存结果
      agentsStorageService.cacheAgent('agent_types', types);

      return types;
    } catch (error) {
      console.error('[AgentsUseCase] 获取Agent类型失败:', error);
      throw new Error('无法获取Agent类型');
    }
  }

  /**
   * 从模板创建Agent
   */
  async createAgentFromTemplate(templateId, config = {}) {
    try {
      const agent = await agentsApiService.createAgentFromTemplate(templateId, config);

      // 清除缓存
      agentsStorageService.clearAgentCache('agents_list');

      // 触发事件
      agentsEventHandler.emit('agent:createdFromTemplate', {
        templateId,
        agent
      });

      return agent;
    } catch (error) {
      console.error('[AgentsUseCase] 从模板创建Agent失败:', error);
      throw new Error('无法从模板创建Agent');
    }
  }

  /**
   * 获取Agent统计信息
   */
  async getAgentStats(agentId) {
    try {
      return await agentsApiService.getAgentStats(agentId);
    } catch (error) {
      console.error('[AgentsUseCase] 获取Agent统计信息失败:', error);
      throw new Error('无法获取Agent统计信息');
    }
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus() {
    try {
      return await agentsApiService.getSystemStatus();
    } catch (error) {
      console.error('[AgentsUseCase] 获取系统状态失败:', error);
      throw new Error('无法获取系统状态');
    }
  }

  /**
   * 处理任务队列
   */
  async processTaskQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.taskQueue.length > 0) {
      const task = this.taskQueue[0];

      try {
        // 更新任务状态
        task.status = 'processing';

        // 获取任务结果
        const taskResult = await agentsApiService.getTask(task.agentId, task.id);

        if (taskResult.status === 'completed') {
          // 任务完成
          task.status = 'completed';
          task.result = taskResult.result;
          task.completedAt = new Date().toISOString();

          // 触发事件
          agentsEventHandler.emit('agent:taskExecuted', {
            agentId: task.agentId,
            taskId: task.id,
            result: taskResult
          });

          // 从队列移除
          this.taskQueue.shift();
        } else if (taskResult.status === 'failed') {
          // 任务失败
          task.status = 'failed';
          task.error = taskResult.error;
          task.failedAt = new Date().toISOString();

          // 触发事件
          agentsEventHandler.emit('agent:error', {
            agentId: task.agentId,
            error: taskResult.error
          });

          // 从队列移除
          this.taskQueue.shift();
        } else {
          // 任务仍在处理中，等待下次检查
          break;
        }
      } catch (error) {
        console.error('[AgentsUseCase] 处理任务失败:', error);
        task.status = 'failed';
        task.error = error.message;
        task.failedAt = new Date().toISOString();

        // 从队列移除
        this.taskQueue.shift();
      }

      // 短暂延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;

    // 如果还有任务，继续处理
    if (this.taskQueue.length > 0) {
      setTimeout(() => this.processTaskQueue(), 5000);
    }
  }

  /**
   * 验证Agent数据
   */
  validateAgentData(agentData) {
    if (!agentData.name || agentData.name.trim().length === 0) {
      throw new Error('Agent名称不能为空');
    }

    if (!agentData.type) {
      throw new Error('Agent类型不能为空');
    }

    if (agentData.name.length > 100) {
      throw new Error('Agent名称不能超过100个字符');
    }

    if (agentData.description && agentData.description.length > 500) {
      throw new Error('Agent描述不能超过500个字符');
    }
  }

  /**
   * 验证任务数据
   */
  validateTaskData(taskData) {
    if (!taskData.type) {
      throw new Error('任务类型不能为空');
    }

    if (!taskData.content) {
      throw new Error('任务内容不能为空');
    }

    if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
      throw new Error('任务优先级必须是 low、medium 或 high');
    }
  }

  /**
   * 保存Agent偏好设置
   */
  saveAgentPreferences(agentId, preferences) {
    agentsStorageService.saveAgentPreferences(agentId, preferences);
  }

  /**
   * 获取Agent偏好设置
   */
  getAgentPreferences(agentId) {
    return agentsStorageService.getAgentPreferences(agentId);
  }

  /**
   * 设置活跃的Agent
   */
  setActiveAgent(agentId) {
    agentsStorageService.setActiveAgentId(agentId);
  }

  /**
   * 获取活跃的Agent
   */
  getActiveAgent() {
    return agentsStorageService.getActiveAgentId();
  }

  /**
   * 清除活跃的Agent
   */
  clearActiveAgent() {
    agentsStorageService.clearActiveAgent();
  }

  /**
   * 导出Agent数据
   */
  exportAgentData() {
    return agentsStorageService.exportAgentData();
  }

  /**
   * 导入Agent数据
   */
  importAgentData(data) {
    return agentsStorageService.importAgentData(data);
  }
}

// 创建用例实例
export const agentsUseCase = new AgentsUseCase();
