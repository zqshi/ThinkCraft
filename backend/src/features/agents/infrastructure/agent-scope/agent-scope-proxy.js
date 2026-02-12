import { AgentScopeAgent } from './agent-scope-agent.js';
import { MessageBus } from './message-bus.js';

export class AgentScopeProxy {
  constructor() {
    this._agents = new Map();
    this._isInitialized = false;
    this._messageBus = null;
  }

  async initialize(config = {}) {
    if (this._isInitialized) {
      return;
    }

    try {
      this._messageBus = new MessageBus();

      this._config = {
        maxAgents: config.maxAgents || 100,
        messageTimeout: config.messageTimeout || 30000,
        enableLogging: config.enableLogging !== false,
        ...config
      };

      this._isInitialized = true;
    } catch (error) {
      console.error('[AgentScope] 初始化失败:', error);
      throw new Error(`AgentScope初始化失败: ${error.message}`);
    }
  }

  async registerAgent(agentConfig) {
    this._ensureInitialized();

    try {
      const agentId = agentConfig.id || this._generateAgentId();

      const agentScopeAgent = new AgentScopeAgent({
        id: agentId,
        name: agentConfig.name,
        type: agentConfig.type,
        capabilities: agentConfig.capabilities,
        config: agentConfig.config
      });

      this._messageBus.registerAgent(agentScopeAgent);

      this._agents.set(agentId, agentScopeAgent);

      return agentId;
    } catch (error) {
      console.error('[AgentScope] 注册Agent失败:', error);
      throw new Error(`注册Agent失败: ${error.message}`);
    }
  }

  async unregisterAgent(agentId) {
    this._ensureInitialized();

    try {
      const agent = this._agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent不存在: ${agentId}`);
      }

      this._messageBus.unregisterAgent(agent);

      this._agents.delete(agentId);

      return true;
    } catch (error) {
      console.error('[AgentScope] 注销Agent失败:', error);
      throw new Error(`注销Agent失败: ${error.message}`);
    }
  }

  getAgent(agentId) {
    this._ensureInitialized();
    return this._agents.get(agentId);
  }

  getAllAgents() {
    this._ensureInitialized();
    return Array.from(this._agents.values());
  }

  async sendMessage(agentId, message) {
    this._ensureInitialized();

    try {
      const agent = this._agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent不存在: ${agentId}`);
      }

      const response = await this._messageBus.sendMessage(agent, message);
      return response;
    } catch (error) {
      console.error('[AgentScope] 发送消息失败:', error);
      throw new Error(`发送消息失败: ${error.message}`);
    }
  }

  async broadcastMessage(message) {
    this._ensureInitialized();

    try {
      const responses = await this._messageBus.broadcastMessage(message);
      return responses;
    } catch (error) {
      console.error('[AgentScope] 广播消息失败:', error);
      throw new Error(`广播消息失败: ${error.message}`);
    }
  }

  async executeTask(agentId, task) {
    this._ensureInitialized();

    try {
      const agent = this._agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent不存在: ${agentId}`);
      }

      if (!agent.supportsTask(task.type)) {
        throw new Error(`Agent不支持任务类型: ${task.type}`);
      }

      agent.setStatus('busy');

      const startTime = Date.now();
      const result = await agent.executeTask(task);
      const duration = Date.now() - startTime;

      agent.setStatus('idle');

      return {
        success: true,
        result: result,
        duration: duration
      };
    } catch (error) {
      const agent = this._agents.get(agentId);
      if (agent) {
        agent.setStatus('error');
      }

      console.error('[AgentScope] 任务执行失败:', error);
      throw new Error(`任务执行失败: ${error.message}`);
    }
  }

  async collaborate(agentIds, task, collaborationType = 'parallel') {
    this._ensureInitialized();

    try {
      const agents = agentIds.map(id => {
        const agent = this._agents.get(id);
        if (!agent) {
          throw new Error(`Agent不存在: ${id}`);
        }
        return agent;
      });

      let results;

      switch (collaborationType) {
      case 'parallel':
        results = await this._executeParallel(agents, task);
        break;
      case 'sequential':
        results = await this._executeSequential(agents, task);
        break;
      case 'hierarchical':
        results = await this._executeHierarchical(agents, task);
        break;
      default:
        throw new Error(`不支持的协作类型: ${collaborationType}`);
      }

      return results;
    } catch (error) {
      console.error('[AgentScope] 协作执行失败:', error);
      throw new Error(`协作执行失败: ${error.message}`);
    }
  }

  async _executeParallel(agents, task) {
    const promises = agents.map(agent => this.executeTask(agent.id, task));
    return await Promise.allSettled(promises);
  }

  async _executeSequential(agents, task) {
    const results = [];

    for (const agent of agents) {
      const result = await this.executeTask(agent.id, task);
      results.push(result);

      if (result.success && result.result) {
        task.context = { ...task.context, previousResult: result.result };
      }
    }

    return results;
  }

  async _executeHierarchical(agents, task) {
    if (agents.length === 0) {
      return [];
    }

    const masterAgent = agents[0];
    const slaveAgents = agents.slice(1);

    const subTasks = await masterAgent.decomposeTask(task);

    const taskPromises = subTasks.map((subTask, index) => {
      const slaveAgent = slaveAgents[index % slaveAgents.length];
      return this.executeTask(slaveAgent.id, subTask);
    });

    const slaveResults = await Promise.allSettled(taskPromises);

    const finalResult = await masterAgent.aggregateResults(slaveResults);

    return [finalResult];
  }

  getAgentStatus(agentId) {
    this._ensureInitialized();

    const agent = this._agents.get(agentId);
    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      lastActiveAt: agent.lastActiveAt,
      currentTask: agent.currentTask
    };
  }

  getSystemStatus() {
    this._ensureInitialized();

    const agents = Array.from(this._agents.values());
    const statusCount = {
      idle: 0,
      active: 0,
      busy: 0,
      inactive: 0,
      error: 0
    };

    agents.forEach(agent => {
      statusCount[agent.status]++;
    });

    return {
      totalAgents: agents.length,
      statusCount: statusCount,
      isInitialized: this._isInitialized,
      messageQueueSize: this._messageBus ? this._messageBus.getQueueSize() : 0
    };
  }

  _ensureInitialized() {
    if (!this._isInitialized) {
      throw new Error('AgentScope未初始化，请先调用initialize方法');
    }
  }

  _generateAgentId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
