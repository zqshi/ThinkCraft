/**
 * Agent用例服务
 * 协调领域层和基础设施层，实现具体的业务用例
 */
import { v4 as uuidv4 } from 'uuid';
import { AgentService } from '../domain/agent.service.js';
import {
  AgentResponseDTO,
  AgentListResponseDTO
} from './agent.dto.js';
import { InMemoryAgentRepository } from '../infrastructure/agent-inmemory.repository.js';
import { MultiAgentOrchestrator } from './multi-agent-orchestrator.js';
import { AgentExecutor } from '../infrastructure/agent-executor.js';
import { ContextManager } from '../infrastructure/context-manager.js';
import { Task } from '../domain/task.entity.js';
import { agentScopeProxy } from '../infrastructure/agent-scope-adapter.js';

export class AgentUseCase {
  constructor(repository = null) {
    this._repository = repository || new InMemoryAgentRepository();
    this._agentService = new AgentService();
    this._orchestrator = new MultiAgentOrchestrator();
    this._contextManager = new ContextManager();
  }

  async initializeAgentScope() {
    if (!this._agentScopeInitialized) {
      await agentScopeProxy.initialize();
      this._agentScopeInitialized = true;
    }
  }

  /**
   * 创建新的Agent
   */
  async createAgent(createAgentDTO) {
    try {
      // 验证DTO
      createAgentDTO.validate();

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

      return new AgentResponseDTO(agent);
    } catch (error) {
      throw new Error(`获取Agent失败: ${error.message}`);
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

      // 清除Agent的上下文
      this._contextManager.clearContext(agentId);

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

      // 创建Agent执行器
      const executor = new AgentExecutor(agent, this._contextManager);

      // 创建任务
      const task = Task.create('message_handling', message);

      // 执行任务
      const response = await executor.executeTask(task);

      // 记录任务执行
      agent.recordTaskExecution(
        task.id,
        'message_handling',
        { success: true, response: response.output },
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

      // 创建Agent执行器
      const executor = new AgentExecutor(agent, this._contextManager);

      // 创建任务实体
      const taskEntity = Task.create(task.type, task.content, {
        id: task.id,
        context: task.context,
        requirements: task.requirements
      });

      // 执行任务
      const startTime = Date.now();
      const result = await executor.executeTask(taskEntity);
      const duration = Date.now() - startTime;

      // 记录任务执行
      agent.recordTaskExecution(
        taskEntity.id,
        task.type,
        result,
        duration
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
      const agents = [];
      for (const agentId of agentIds) {
        const agent = await this._repository.findById(agentId);
        if (!agent) {
          throw new Error(`Agent不存在: ${agentId}`);
        }
        if (!agent.status.canExecuteTask) {
          throw new Error(`Agent ${agentId} 当前状态无法执行任务`);
        }
        agents.push(agent);
      }

      // 创建任务实体
      const taskEntity = Task.create(task.type || 'general', task.content, {
        id: task.id,
        context: task.context,
        requirements: task.requirements
      });

      // 使用编排器进行协作
      const startTime = Date.now();
      const result = await this._orchestrator.collaborate(agents, taskEntity, collaborationType);
      const duration = Date.now() - startTime;

      // 更新所有Agent的任务执行记录
      for (const agent of agents) {
        agent.recordTaskExecution(
          taskEntity.id,
          task.type || 'general',
          { success: result.success, output: result.output },
          duration
        );
        await this._repository.save(agent);
      }

      return result;
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
