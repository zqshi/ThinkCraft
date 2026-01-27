/**
 * 多智能体编排器
 * 协调多个Agent的执行流程
 */
import { AgentExecutor } from '../infrastructure/agent-executor.js';
import { ContextManager } from '../infrastructure/context-manager.js';
import { TaskDecompositionStrategy } from '../domain/strategies/task-decomposition.strategy.js';
import {
  ParallelExecutionStrategy,
  SequentialExecutionStrategy,
  HierarchicalExecutionStrategy
} from '../domain/strategies/execution-strategies.js';
import { Task } from '../domain/task.entity.js';
import { TaskPromptTemplates } from '../infrastructure/prompt-templates/task-prompts.js';
import { callDeepSeekAPI } from '../../../infrastructure/ai/deepseek-client.js';
import { logger } from '../../../../middleware/logger.js';

export class MultiAgentOrchestrator {
  constructor() {
    this.contextManager = new ContextManager();
    this.taskDecomposer = new TaskDecompositionStrategy();
  }

  /**
   * 多Agent协作执行任务
   * @param {Array<Object>} agents - Agent列表
   * @param {Object} task - 任务对象
   * @param {string} collaborationType - 协作类型 (parallel/sequential/hierarchical)
   * @returns {Promise<Object>} 执行结果
   */
  async collaborate(agents, task, collaborationType = 'parallel') {
    if (!agents || agents.length === 0) {
      throw new Error('至少需要一个Agent');
    }

    logger.info(`[MultiAgentOrchestrator] 开始${collaborationType}协作，Agent数量: ${agents.length}`);

    switch (collaborationType) {
    case 'parallel':
      return await this._executeParallel(agents, task);
    case 'sequential':
      return await this._executeSequential(agents, task);
    case 'hierarchical':
      return await this._executeHierarchical(agents, task);
    default:
      throw new Error(`不支持的协作类型: ${collaborationType}`);
    }
  }

  /**
   * 并行执行
   * @param {Array<Object>} agents - Agent列表
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>} 执行结果
   */
  async _executeParallel(agents, task) {
    try {
      // 1. 任务分解
      const capabilities = agents.flatMap(agent =>
        agent.capabilities.map(c => c.value)
      );

      const subTasks = await this.taskDecomposer.decompose(task.content, capabilities);

      // 2. 分配任务给Agent
      const assignments = this._assignTasks(subTasks, agents);

      // 3. 并行执行
      const strategy = new ParallelExecutionStrategy();
      const results = await strategy.execute(assignments);

      // 4. 结果汇总
      const aggregatedResult = await this._aggregateResults(results, task.content);

      return {
        success: true,
        output: aggregatedResult.output,
        subResults: results,
        executionMode: 'parallel',
        agentCount: agents.length,
        taskCount: subTasks.length
      };
    } catch (error) {
      logger.error('[MultiAgentOrchestrator] 并行执行失败:', error);
      throw error;
    }
  }

  /**
   * 串行执行
   * @param {Array<Object>} agents - Agent列表
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>} 执行结果
   */
  async _executeSequential(agents, task) {
    try {
      // 为每个Agent创建执行器
      const assignments = agents.map(agent => ({
        agent,
        task: Task.create(task.type || 'general', task.content),
        executor: new AgentExecutor(agent, this.contextManager)
      }));

      // 串行执行
      const strategy = new SequentialExecutionStrategy();
      const results = await strategy.execute(assignments);

      // 最后一个Agent的输出作为最终结果
      const finalResult = results[results.length - 1];

      return {
        success: finalResult.success !== false,
        output: finalResult.output,
        subResults: results,
        executionMode: 'sequential',
        agentCount: agents.length
      };
    } catch (error) {
      logger.error('[MultiAgentOrchestrator] 串行执行失败:', error);
      throw error;
    }
  }

  /**
   * 分层执行
   * @param {Array<Object>} agents - Agent列表
   * @param {Object} task - 任务对象
   * @returns {Promise<Object>} 执行结果
   */
  async _executeHierarchical(agents, task) {
    try {
      if (agents.length < 2) {
        throw new Error('分层执行至少需要2个Agent（1个Master + 1个Worker）');
      }

      // 第一个Agent作为Master，其余作为Workers
      const [masterAgent, ...workerAgents] = agents;

      const masterExecutor = new AgentExecutor(masterAgent, this.contextManager);
      const workerExecutors = workerAgents.map(agent =>
        new AgentExecutor(agent, this.contextManager)
      );

      // 分层执行
      const strategy = new HierarchicalExecutionStrategy();
      const result = await strategy.execute(
        masterAgent,
        masterExecutor,
        workerAgents,
        workerExecutors,
        task,
        this.taskDecomposer
      );

      return {
        ...result,
        success: true,
        agentCount: agents.length,
        masterAgent: masterAgent.name,
        workerCount: workerAgents.length
      };
    } catch (error) {
      logger.error('[MultiAgentOrchestrator] 分层执行失败:', error);
      throw error;
    }
  }

  /**
   * 分配任务给Agent
   * @param {Array<Task>} tasks - 任务列表
   * @param {Array<Object>} agents - Agent列表
   * @returns {Array<Object>} 任务分配
   */
  _assignTasks(tasks, agents) {
    const assignments = [];

    for (let i = 0; i < Math.min(tasks.length, agents.length); i++) {
      const agent = agents[i];
      const task = tasks[i];
      const executor = new AgentExecutor(agent, this.contextManager);

      assignments.push({ agent, task, executor });
    }

    return assignments;
  }

  /**
   * 汇总结果
   * @param {Array<Object>} results - 执行结果列表
   * @param {string} originalTask - 原始任务内容
   * @returns {Promise<Object>} 汇总结果
   */
  async _aggregateResults(results, originalTask) {
    try {
      const prompt = TaskPromptTemplates.getAggregationPrompt(originalTask, results);

      const response = await callDeepSeekAPI(
        [{ role: 'user', content: prompt }],
        '你是一个结果汇总专家，擅长整合多个来源的信息并生成连贯的总结。',
        {
          temperature: 0.5,
          max_tokens: 2000,
          retry: 3
        }
      );

      return {
        output: response.content,
        usage: response.usage
      };
    } catch (error) {
      logger.error('[MultiAgentOrchestrator] 结果汇总失败:', error);

      // 如果汇总失败，返回简单拼接的结果
      const fallbackOutput = results
        .map((r, i) => `【${r.agentName || `Agent ${i + 1}`}】\n${r.output}`)
        .join('\n\n');

      return {
        output: fallbackOutput,
        fallback: true
      };
    }
  }

  /**
   * 清除所有上下文
   */
  clearAllContexts() {
    this.contextManager.clearAll();
  }

  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return this.contextManager.getStats();
  }
}
