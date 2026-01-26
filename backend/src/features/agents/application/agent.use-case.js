/**
 * Agent用例服务
 * 协调领域层和基础设施层，实现具体的业务用例
 */
import { v4 as uuidv4 } from 'uuid';
import { AgentService } from '../domain/agent.service.js';
import {
  CreateAgentDTO,
  UpdateAgentDTO,
  AgentResponseDTO,
  AgentListResponseDTO
} from './agent.dto.js';
import { InMemoryAgentRepository } from '../infrastructure/agent-inmemory.repository.js';
import { agentScopeProxy } from '../infrastructure/agent-scope-adapter.js';

export class AgentUseCase {
  constructor(repository = null) {
    this._repository = repository || new InMemoryAgentRepository();
    this._agentService = new AgentService();
    this._agentScopeInitialized = false;
  }

  /**
   * 初始化AgentScope框架
   */
  async initializeAgentScope(config = {}) {
    if (this._agentScopeInitialized) {
      return;
    }

    try {
      await agentScopeProxy.initialize(config);
      this._agentScopeInitialized = true;
    } catch (error) {
      console.error('[AgentUseCase] AgentScope初始化失败:', error);
      throw new Error(`AgentScope初始化失败: ${error.message}`);
    }
  }

  /**
   * 创建新的Agent
   */
  async createAgent(createAgentDTO) {
    try {
      // 验证DTO
      createAgentDTO.validate();

      // 确保AgentScope已初始化
      await this.initializeAgentScope();

      // 生成Agent ID
      const agentId = uuidv4();

      // 使用领域服务创建Agent
      const agent = await this._agentService.createAgent(
        agentId,
        createAgentDTO.name,
        createAgentDTO.description,
        createAgentDTO.type,
        createAgentDTO.capabilities,
        createAgentDTO.config
      );

      // 在AgentScope中注册Agent
      const agentScopeId = await agentScopeProxy.registerAgent({
        id: agentId,
        name: agent.name,
        description: agent.description,
        type: agent.type.value,
        capabilities: agent.capabilities.map(cap => cap.value),
        config: agent.config
      });

      // 保存到仓库
      await this._repository.save(agent);

      // 返回响应DTO
      return new AgentResponseDTO(agent);
    } catch (error) {
      throw new Error(`创建Agent失败: ${error.message}`);
    }
  }

  /**
   * 获取Agent详情
   */
  async getAgent(agentId) {
    try {
      const agent = await this._repository.findById(agentId);
      if (!agent) {
        throw new Error('Agent不存在');
      }

      // 获取AgentScope中的状态
      const scopeStatus = agentScopeProxy.getAgentStatus(agentId);
      if (scopeStatus) {
        // 同步状态
        if (agent.status.value !== scopeStatus.status) {
          // 这里可以添加状态同步逻辑
        }
      }

      return new AgentResponseDTO(agent);
    } catch (error) {
      throw new Error(`获取Agent详情失败: ${error.message}`);
    }
  }

  /**
   * 获取Agent列表
   */
  async getAgentList(page = 1, pageSize = 20, filters = {}) {
    try {
      let agents = [];

      // 根据筛选条件获取Agent
      if (filters.type) {
        agents = await this._repository.findByType(filters.type);
      } else if (filters.status) {
        agents = await this._repository.findByStatus(filters.status);
      } else if (filters.capabilities && filters.capabilities.length > 0) {
        agents = await this._repository.findByCapabilities(filters.capabilities);
      } else {
        agents = await this._repository.findAll();
      }

      // 排序（按更新时间倒序）
      agents.sort((a, b) => b.updatedAt - a.updatedAt);

      // 分页
      const totalCount = agents.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedAgents = agents.slice(startIndex, endIndex);

      return new AgentListResponseDTO(paginatedAgents, totalCount, page, pageSize);
    } catch (error) {
      throw new Error(`获取Agent列表失败: ${error.message}`);
    }
  }

  /**
   * 更新Agent
   */
  async updateAgent(agentId, updateAgentDTO) {
    try {
      // 验证DTO
      updateAgentDTO.validate();

      // 查找Agent
      const agent = await this._repository.findById(agentId);
      if (!agent) {
        throw new Error('Agent不存在');
      }

      // 使用领域服务更新Agent
      const updatedAgent = await this._agentService.updateAgent(agent, updateAgentDTO);

      // 保存到仓库
      await this._repository.save(updatedAgent);

      return new AgentResponseDTO(updatedAgent);
    } catch (error) {
      throw new Error(`更新Agent失败: ${error.message}`);
    }
  }

  /**
   * 删除Agent
   */
  async deleteAgent(agentId) {
    try {
      const agent = await this._repository.findById(agentId);
      if (!agent) {
        throw new Error('Agent不存在');
      }

      // 从AgentScope注销
      await agentScopeProxy.unregisterAgent(agentId);

      // 从仓库删除
      await this._repository.delete(agentId);

      return true;
    } catch (error) {
      throw new Error(`删除Agent失败: ${error.message}`);
    }
  }

  /**
   * 激活Agent
   */
  async activateAgent(agentId) {
    try {
      const agent = await this._repository.findById(agentId);
      if (!agent) {
        throw new Error('Agent不存在');
      }

      const activatedAgent = await this._agentService.activateAgent(agent);
      await this._repository.save(activatedAgent);

      return new AgentResponseDTO(activatedAgent);
    } catch (error) {
      throw new Error(`激活Agent失败: ${error.message}`);
    }
  }

  /**
   * 停用Agent
   */
  async deactivateAgent(agentId) {
    try {
      const agent = await this._repository.findById(agentId);
      if (!agent) {
        throw new Error('Agent不存在');
      }

      const deactivatedAgent = await this._agentService.deactivateAgent(agent);
      await this._repository.save(deactivatedAgent);

      return new AgentResponseDTO(deactivatedAgent);
    } catch (error) {
      throw new Error(`停用Agent失败: ${error.message}`);
    }
  }

  /**
   * 发送消息给Agent
   */
  async sendMessageToAgent(agentId, message) {
    try {
      const agent = await this._repository.findById(agentId);
      if (!agent) {
        throw new Error('Agent不存在');
      }

      if (!agent.status.canExecuteTask) {
        throw new Error('Agent当前状态无法执行任务');
      }

      // 使用AgentScope发送消息
      const response = await agentScopeProxy.sendMessage(agentId, message);

      // 记录任务执行
      agent.recordTaskExecution(
        `task_${Date.now()}`,
        'message_handling',
        { success: true, response: response },
        0
      );

      await this._repository.save(agent);

      return response;
    } catch (error) {
      throw new Error(`发送消息失败: ${error.message}`);
    }
  }

  /**
   * 分配任务给Agent
   */
  async assignTask(agentId, task) {
    try {
      const agent = await this._repository.findById(agentId);
      if (!agent) {
        throw new Error('Agent不存在');
      }

      if (!agent.supportsTask(task.type)) {
        throw new Error(`Agent不支持任务类型: ${task.type}`);
      }

      if (!agent.status.canExecuteTask) {
        throw new Error('Agent当前状态无法执行任务');
      }

      // 使用AgentScope执行任务
      const result = await agentScopeProxy.executeTask(agentId, task);

      // 记录任务执行
      agent.recordTaskExecution(
        task.id || `task_${Date.now()}`,
        task.type,
        result.result,
        result.duration
      );

      await this._repository.save(agent);

      return result;
    } catch (error) {
      throw new Error(`分配任务失败: ${error.message}`);
    }
  }

  /**
   * 多Agent协作
   */
  async collaborate(agentIds, task, collaborationType = 'parallel') {
    try {
      // 验证所有Agent存在且状态正常
      for (const agentId of agentIds) {
        const agent = await this._repository.findById(agentId);
        if (!agent) {
          throw new Error(`Agent不存在: ${agentId}`);
        }
        if (!agent.status.canExecuteTask) {
          throw new Error(`Agent ${agentId} 当前状态无法执行任务`);
        }
      }

      // 使用AgentScope进行协作
      const results = await agentScopeProxy.collaborate(agentIds, task, collaborationType);

      // 更新所有Agent的任务执行记录
      for (let i = 0; i < agentIds.length; i++) {
        const agentId = agentIds[i];
        const agent = await this._repository.findById(agentId);
        const result = results[i];

        if (result && result.success) {
          agent.recordTaskExecution(
            task.id || `task_${Date.now()}_${i}`,
            task.type,
            result.result,
            result.duration
          );
          await this._repository.save(agent);
        }
      }

      return results;
    } catch (error) {
      throw new Error(`多Agent协作失败: ${error.message}`);
    }
  }

  /**
   * 获取Agent类型列表
   */
  async getAgentTypes() {
    try {
      return await this._agentService.getAgentTypes();
    } catch (error) {
      throw new Error(`获取Agent类型列表失败: ${error.message}`);
    }
  }

  /**
   * 获取Agent能力列表
   */
  async getAgentCapabilities() {
    try {
      return await this._agentService.getAgentCapabilities();
    } catch (error) {
      throw new Error(`获取Agent能力列表失败: ${error.message}`);
    }
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus() {
    try {
      const agents = await this._repository.findAll();
      const scopeStatus = agentScopeProxy.getSystemStatus();

      return {
        totalAgents: agents.length,
        agentsByStatus: {
          idle: agents.filter(a => a.status.isIdle).length,
          active: agents.filter(a => a.status.isActive).length,
          busy: agents.filter(a => a.status.isBusy).length,
          inactive: agents.filter(a => a.status.isInactive).length,
          error: agents.filter(a => a.status.isError).length
        },
        agentScopeStatus: scopeStatus,
        recentActivities: await this._getRecentActivities(10)
      };
    } catch (error) {
      throw new Error(`获取系统状态失败: ${error.message}`);
    }
  }

  /**
   * 获取最近的活动
   */
  async _getRecentActivities(limit) {
    // 这里可以从事件存储中获取最近的活动
    // 简化实现：返回模拟数据
    return [
      {
        id: 'act_001',
        type: 'task_executed',
        agentId: 'agent_001',
        description: '任务执行完成',
        timestamp: new Date(Date.now() - 60000)
      },
      {
        id: 'act_002',
        type: 'agent_created',
        agentId: 'agent_002',
        description: '新Agent创建',
        timestamp: new Date(Date.now() - 300000)
      }
    ].slice(0, limit);
  }

  /**
   * 广播消息给所有Agent
   */
  async broadcastMessage(message) {
    try {
      await this.initializeAgentScope();
      const responses = await agentScopeProxy.broadcastMessage(message);
      return responses;
    } catch (error) {
      throw new Error(`广播消息失败: ${error.message}`);
    }
  }
}

// 导出单例实例
export const agentUseCase = new AgentUseCase();
