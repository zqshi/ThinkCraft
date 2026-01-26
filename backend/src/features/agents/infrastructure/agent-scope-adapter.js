/**
 * AgentScope适配器
 * 集成AgentScope框架，提供多智能体协作能力
 */

/**
 * AgentScope代理类
 * 封装AgentScope的核心功能
 */
export class AgentScopeProxy {
    constructor() {
        this._agents = new Map();
        this._isInitialized = false;
        this._messageBus = null;
    }

    /**
     * 初始化AgentScope
     */
    async initialize(config = {}) {
        if (this._isInitialized) {
            return;
        }

        try {
            // 模拟AgentScope初始化
            // 创建消息总线
            this._messageBus = new MessageBus();

            // 设置配置
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

    /**
     * 注册Agent
     */
    async registerAgent(agentConfig) {
        this._ensureInitialized();

        try {
            const agentId = agentConfig.id || this._generateAgentId();

            // 创建AgentScope Agent实例
            const agentScopeAgent = new AgentScopeAgent({
                id: agentId,
                name: agentConfig.name,
                type: agentConfig.type,
                capabilities: agentConfig.capabilities,
                config: agentConfig.config
            });

            // 注册到消息总线
            this._messageBus.registerAgent(agentScopeAgent);

            // 保存引用
            this._agents.set(agentId, agentScopeAgent);

            return agentId;
        } catch (error) {
            console.error('[AgentScope] 注册Agent失败:', error);
            throw new Error(`注册Agent失败: ${error.message}`);
        }
    }

    /**
     * 注销Agent
     */
    async unregisterAgent(agentId) {
        this._ensureInitialized();

        try {
            const agent = this._agents.get(agentId);
            if (!agent) {
                throw new Error(`Agent不存在: ${agentId}`);
            }

            // 从消息总线注销
            this._messageBus.unregisterAgent(agent);

            // 删除引用
            this._agents.delete(agentId);

            return true;
        } catch (error) {
            console.error('[AgentScope] 注销Agent失败:', error);
            throw new Error(`注销Agent失败: ${error.message}`);
        }
    }

    /**
     * 获取Agent
     */
    getAgent(agentId) {
        this._ensureInitialized();
        return this._agents.get(agentId);
    }

    /**
     * 获取所有Agent
     */
    getAllAgents() {
        this._ensureInitialized();
        return Array.from(this._agents.values());
    }

    /**
     * 发送消息给Agent
     */
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

    /**
     * 广播消息给所有Agent
     */
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

    /**
     * 执行任务
     */
    async executeTask(agentId, task) {
        this._ensureInitialized();

        try {
            const agent = this._agents.get(agentId);
            if (!agent) {
                throw new Error(`Agent不存在: ${agentId}`);
            }

            // 检查Agent是否支持任务类型
            if (!agent.supportsTask(task.type)) {
                throw new Error(`Agent不支持任务类型: ${task.type}`);
            }

            // 设置Agent状态为忙碌
            agent.setStatus('busy');

            // 执行任务
            const startTime = Date.now();
            const result = await agent.executeTask(task);
            const duration = Date.now() - startTime;

            // 恢复Agent状态
            agent.setStatus('idle');

            `);

            return {
                success: true,
                result: result,
                duration: duration
            };
        } catch (error) {
            // 设置错误状态
            const agent = this._agents.get(agentId);
            if (agent) {
                agent.setStatus('error');
            }

            console.error('[AgentScope] 任务执行失败:', error);
            throw new Error(`任务执行失败: ${error.message}`);
        }
    }

    /**
     * 多Agent协作
     */
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

    /**
     * 并行执行
     */
    async _executeParallel(agents, task) {
        const promises = agents.map(agent => this.executeTask(agent.id, task));
        return await Promise.allSettled(promises);
    }

    /**
     * 顺序执行
     */
    async _executeSequential(agents, task) {
        const results = [];

        for (const agent of agents) {
            const result = await this.executeTask(agent.id, task);
            results.push(result);

            // 将前一个结果传递给下一个任务
            if (result.success && result.result) {
                task.context = { ...task.context, previousResult: result.result };
            }
        }

        return results;
    }

    /**
     * 分层执行（主从模式）
     */
    async _executeHierarchical(agents, task) {
        if (agents.length === 0) {
            return [];
        }

        // 第一个Agent作为主Agent
        const masterAgent = agents[0];
        const slaveAgents = agents.slice(1);

        // 主Agent分解任务
        const subTasks = await masterAgent.decomposeTask(task);

        // 分配子任务给从Agent
        const taskPromises = subTasks.map((subTask, index) => {
            const slaveAgent = slaveAgents[index % slaveAgents.length];
            return this.executeTask(slaveAgent.id, subTask);
        });

        // 并行执行子任务
        const slaveResults = await Promise.allSettled(taskPromises);

        // 主Agent汇总结果
        const finalResult = await masterAgent.aggregateResults(slaveResults);

        return [finalResult];
    }

    /**
     * 获取Agent状态
     */
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

    /**
     * 获取系统状态
     */
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

    /**
     * 确保已初始化
     */
    _ensureInitialized() {
        if (!this._isInitialized) {
            throw new Error('AgentScope未初始化，请先调用initialize方法');
        }
    }

    /**
     * 生成Agent ID
     */
    _generateAgentId() {
        return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

/**
 * 消息总线
 * 处理Agent间的消息传递
 */
class MessageBus {
    constructor() {
        this._agents = new Map();
        this._messageQueue = [];
        this._subscribers = new Map();
    }

    /**
     * 注册Agent
     */
    registerAgent(agent) {
        this._agents.set(agent.id, agent);

        // 设置消息处理器
        agent.onMessage = (message) => this._handleMessage(agent.id, message);
    }

    /**
     * 注销Agent
     */
    unregisterAgent(agent) {
        this._agents.delete(agent.id);
        this._subscribers.delete(agent.id);
    }

    /**
     * 发送消息
     */
    async sendMessage(targetAgent, message) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('消息发送超时'));
            }, 30000);

            const responseHandler = (response) => {
                clearTimeout(timeout);
                resolve(response);
            };

            // 发送消息
            targetAgent.receiveMessage(message, responseHandler);
        });
    }

    /**
     * 广播消息
     */
    async broadcastMessage(message) {
        const promises = [];

        for (const agent of this._agents.values()) {
            promises.push(this.sendMessage(agent, message));
        }

        return await Promise.allSettled(promises);
    }

    /**
     * 处理消息
     */
    _handleMessage(senderId, message) {
        // 这里可以实现更复杂的消息路由逻辑
        }

    /**
     * 获取队列大小
     */
    getQueueSize() {
        return this._messageQueue.length;
    }
}

/**
 * AgentScope Agent类
 * 封装AgentScope框架中的Agent实现
 */
class AgentScopeAgent {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.type = config.type;
        this.capabilities = config.capabilities || [];
        this.config = config.config || {};
        this.status = 'idle';
        this.currentTask = null;
        this.lastActiveAt = null;
    }

    /**
     * 设置状态
     */
    setStatus(status) {
        this.status = status;
        this.lastActiveAt = new Date();
    }

    /**
     * 接收消息
     */
    receiveMessage(message, callback) {
        // 模拟消息处理
        setTimeout(() => {
            const response = {
                id: `resp_${Date.now()}`,
                content: `收到消息: ${message.content}`,
                timestamp: new Date()
            };
            callback(response);
        }, 100);
    }

    /**
     * 执行任务
     */
    async executeTask(task) {
        this.currentTask = task;
        this.setStatus('busy');

        // 模拟任务执行
        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = {
            success: true,
            output: `任务 ${task.type} 执行完成`,
            metadata: { duration: 1000 }
        };

        this.currentTask = null;
        this.setStatus('idle');

        return result;
    }

    /**
     * 检查是否支持任务
     */
    supportsTask(taskType) {
        // 简化实现：假设所有Agent都支持基本任务
        const basicTasks = ['conversation', 'question_answering', 'information_retrieval'];
        return basicTasks.includes(taskType) || this.capabilities.includes(taskType);
    }

    /**
     * 分解任务
     */
    async decomposeTask(task) {
        // 模拟任务分解
        return [
            { type: 'subtask_1', content: task.content + ' - 子任务1' },
            { type: 'subtask_2', content: task.content + ' - 子任务2' }
        ];
    }

    /**
     * 汇总结果
     */
    async aggregateResults(results) {
        // 模拟结果汇总
        return {
            success: true,
            output: '所有子任务已完成并汇总',
            subResults: results
        };
    }
}

// 导出单例实例
export const agentScopeProxy = new AgentScopeProxy();