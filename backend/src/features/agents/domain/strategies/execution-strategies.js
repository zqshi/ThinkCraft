/**
 * 执行策略
 * 定义不同的Agent协作执行模式
 */
import { logger } from '../../../../middleware/logger.js';

/**
 * 并行执行策略
 * 多个Agent同时执行不同的子任务
 */
export class ParallelExecutionStrategy {
  /**
   * 并行执行任务
   * @param {Array<Object>} assignments - 任务分配 [{agent, task, executor}]
   * @returns {Promise<Array<Object>>} 执行结果
   */
  async execute(assignments) {
    logger.info(`[ParallelExecution] 开始并行执行 ${assignments.length} 个任务`);

    try {
      const results = await Promise.all(
        assignments.map(async ({ agent, task, executor }) => {
          try {
            task.markInProgress();
            const result = await executor.executeTask(task);
            task.markCompleted(result);
            return result;
          } catch (error) {
            task.markFailed(error);
            logger.error(`[ParallelExecution] Agent ${agent.name} 执行失败:`, error);
            // 返回错误结果而不是抛出异常，允许其他任务继续
            return {
              success: false,
              error: error.message,
              agentId: agent.id.value,
              agentName: agent.name
            };
          }
        })
      );

      logger.info('[ParallelExecution] 并行执行完成');
      return results;
    } catch (error) {
      logger.error('[ParallelExecution] 并行执行失败:', error);
      throw error;
    }
  }
}

/**
 * 串行执行策略
 * Agent依次执行任务，前一个的输出作为后一个的输入
 */
export class SequentialExecutionStrategy {
  /**
   * 串行执行任务
   * @param {Array<Object>} assignments - 任务分配 [{agent, task, executor}]
   * @returns {Promise<Array<Object>>} 执行结果
   */
  async execute(assignments) {
    logger.info(`[SequentialExecution] 开始串行执行 ${assignments.length} 个任务`);

    const results = [];
    let currentContext = null;

    try {
      for (const { agent, task, executor } of assignments) {
        logger.info(`[SequentialExecution] Agent ${agent.name} 开始执行`);

        // 将前序结果添加到任务上下文
        if (currentContext) {
          task.previousResults = results;
          task.context = currentContext;
        }

        task.markInProgress();

        try {
          const result = await executor.executeTask(task);
          task.markCompleted(result);
          results.push(result);

          // 更新上下文为当前输出
          currentContext = result.output;

          logger.info(`[SequentialExecution] Agent ${agent.name} 执行完成`);
        } catch (error) {
          task.markFailed(error);
          logger.error(`[SequentialExecution] Agent ${agent.name} 执行失败:`, error);

          // 串行执行中，如果一个失败，后续任务无法继续
          results.push({
            success: false,
            error: error.message,
            agentId: agent.id.value,
            agentName: agent.name
          });

          break; // 停止后续执行
        }
      }

      logger.info('[SequentialExecution] 串行执行完成');
      return results;
    } catch (error) {
      logger.error('[SequentialExecution] 串行执行失败:', error);
      throw error;
    }
  }
}

/**
 * 分层执行策略
 * Master Agent分解任务，Worker Agents并行执行，Master汇总结果
 */
export class HierarchicalExecutionStrategy {
  /**
   * 分层执行任务
   * @param {Object} masterAgent - Master Agent
   * @param {Object} masterExecutor - Master Executor
   * @param {Array<Object>} workerAgents - Worker Agents
   * @param {Array<Object>} workerExecutors - Worker Executors
   * @param {Object} task - 原始任务
   * @param {Object} taskDecomposer - 任务分解器
   * @returns {Promise<Object>} 执行结果
   */
  async execute(masterAgent, masterExecutor, workerAgents, workerExecutors, task, taskDecomposer) {
    logger.info('[HierarchicalExecution] 开始分层执行');

    try {
      // 阶段1: Master分解任务
      logger.info('[HierarchicalExecution] Master Agent 分解任务');

      const capabilities = workerAgents.flatMap(agent =>
        agent.capabilities.map(c => c.value)
      );

      const subTasks = await taskDecomposer.decompose(task.content, capabilities);

      logger.info(`[HierarchicalExecution] 任务已分解为 ${subTasks.length} 个子任务`);

      // 阶段2: Workers并行执行
      logger.info('[HierarchicalExecution] Worker Agents 并行执行子任务');

      const parallelStrategy = new ParallelExecutionStrategy();

      // 分配子任务给Workers
      const assignments = subTasks.slice(0, workerAgents.length).map((subTask, index) => ({
        agent: workerAgents[index],
        task: subTask,
        executor: workerExecutors[index]
      }));

      const workerResults = await parallelStrategy.execute(assignments);

      // 阶段3: Master汇总结果
      logger.info('[HierarchicalExecution] Master Agent 汇总结果');

      const aggregationTask = {
        type: 'result_aggregation',
        content: task.content,
        previousResults: workerResults
      };

      const finalResult = await masterExecutor.executeTask(aggregationTask);

      logger.info('[HierarchicalExecution] 分层执行完成');

      return {
        ...finalResult,
        subResults: workerResults,
        executionMode: 'hierarchical'
      };
    } catch (error) {
      logger.error('[HierarchicalExecution] 分层执行失败:', error);
      throw error;
    }
  }
}
