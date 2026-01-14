/**
 * CollaborationExecutionService
 * 协同执行服务 - 工作流执行引擎
 *
 * 职责：
 * 1. 执行工作流（按依赖关系顺序）
 * 2. 调用TaskAssignmentService执行单个Agent任务
 * 3. 管理执行状态和进度
 * 4. 处理执行失败和重试
 */

import { WorkflowStep, StepStatus } from '../models/valueObjects/WorkflowStep.js';

/**
 * CollaborationExecutionService 类
 */
export class CollaborationExecutionService {
  /**
   * 构造函数
   * @param {Object} collaborationPlanningService - 协同规划服务
   * @param {Object} taskAssignmentService - 任务分配服务
   */
  constructor(collaborationPlanningService, taskAssignmentService) {
    this.planningService = collaborationPlanningService;
    this.taskAssignmentService = taskAssignmentService;
  }

  /**
   * 执行协同计划
   * @param {string} planId - 协同计划ID
   * @param {string} executionMode - 执行模式 'workflow' | 'task_decomposition'
   * @param {Function} onProgress - 进度回调函数（可选）
   * @returns {Promise<Object>} 执行结果
   */
  async execute(planId, executionMode = 'workflow', onProgress = null) {
    console.log(`[CollaborationExecution] 开始执行协同: planId=${planId}, mode=${executionMode}`);

    const plan = this.planningService.getPlan(planId);
    if (!plan) {
      throw new Error(`协同计划不存在: ${planId}`);
    }

    // 获取协同计划实例（用于状态更新）
    const planInstance = this.planningService.plans.get(planId);

    try {
      // 标记为执行中
      planInstance.startExecution();

      let result;

      if (executionMode === 'workflow') {
        result = await this._executeWorkflow(plan, onProgress);
      } else if (executionMode === 'task_decomposition') {
        result = await this._executeTaskDecomposition(plan, onProgress);
      } else {
        throw new Error(`不支持的执行模式: ${executionMode}`);
      }

      // 标记为完成
      planInstance.completeExecution(result);

      console.log('[CollaborationExecution] 执行完成');
      return result;

    } catch (error) {
      console.error('[CollaborationExecution] 执行失败:', error.message);
      planInstance.failExecution(error.message);
      throw error;
    }
  }

  /**
   * 执行工作流模式
   * @param {Object} plan - 协同计划
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Object>}
   * @private
   */
  async _executeWorkflow(plan, onProgress) {
    const workflow = plan.workflowOrchestration;
    if (!workflow || !workflow.steps || workflow.steps.length === 0) {
      throw new Error('工作流未定义或为空');
    }

    console.log(`[CollaborationExecution] 工作流包含 ${workflow.steps.length} 个步骤`);

    // 创建步骤实例（可变状态）
    const stepInstances = workflow.steps.map(s => WorkflowStep.create(s));
    const completedSteps = [];
    const stepResults = {};

    const totalSteps = stepInstances.length;
    let currentStep = 0;

    // 执行每个步骤
    for (const step of stepInstances) {
      // 检查依赖是否满足
      if (!step.areDependenciesMet(completedSteps.map(s => s.stepId))) {
        throw new Error(`步骤 ${step.stepId} 的依赖未满足`);
      }

      currentStep++;

      // 通知进度
      if (onProgress) {
        onProgress({
          status: 'running',
          stepId: step.stepId,
          agentName: step.agentName,
          task: step.task,
          progress: Math.floor((currentStep / totalSteps) * 100),
          current: currentStep,
          total: totalSteps
        });
      }

      console.log(`[CollaborationExecution] 执行步骤 ${currentStep}/${totalSteps}: ${step.agentName} - ${step.task}`);

      try {
        // 更新步骤状态为执行中
        const runningStep = step.markAsRunning();

        // 调用TaskAssignmentService执行任务
        const result = await this.taskAssignmentService.assignTask(
          plan.userId,
          step.agentId,
          step.task,
          step.context
        );

        // 更新步骤状态为完成
        const completedStep = runningStep.markAsCompleted(result.result);
        stepResults[step.stepId] = result.result;
        completedSteps.push(completedStep);

        console.log(`[CollaborationExecution] 步骤完成: ${step.stepId}`);

      } catch (error) {
        console.error(`[CollaborationExecution] 步骤失败: ${step.stepId}`, error.message);

        // 更新步骤状态为失败
        const failedStep = step.markAsFailed(error.message);

        // 通知失败
        if (onProgress) {
          onProgress({
            status: 'failed',
            stepId: step.stepId,
            error: error.message
          });
        }

        throw new Error(`工作流执行失败: 步骤 ${step.stepId} (${step.agentName}) 失败 - ${error.message}`);
      }
    }

    // 汇总结果
    const summary = this._summarizeResults(stepResults);

    return {
      executionMode: 'workflow',
      totalSteps,
      completedSteps: completedSteps.length,
      stepResults,
      summary,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * 执行任务分解模式
   * @param {Object} plan - 协同计划
   * @param {Function} onProgress - 进度回调
   * @returns {Promise<Object>}
   * @private
   */
  async _executeTaskDecomposition(plan, onProgress) {
    const taskDec = plan.taskDecomposition;
    if (!taskDec || !taskDec.mainTasks || taskDec.mainTasks.length === 0) {
      throw new Error('任务分解未定义或为空');
    }

    console.log(`[CollaborationExecution] 任务分解包含 ${taskDec.mainTasks.length} 个主要任务`);

    const taskResults = {};
    const totalTasks = taskDec.mainTasks.length;
    let currentTask = 0;

    // 执行每个主要任务
    for (const task of taskDec.mainTasks) {
      currentTask++;

      // 通知进度
      if (onProgress) {
        onProgress({
          status: 'running',
          taskId: task.taskId,
          title: task.title,
          agentName: task.assignedAgent.agentName,
          progress: Math.floor((currentTask / totalTasks) * 100),
          current: currentTask,
          total: totalTasks
        });
      }

      console.log(`[CollaborationExecution] 执行任务 ${currentTask}/${totalTasks}: ${task.title}`);

      try {
        // 调用TaskAssignmentService执行任务
        const result = await this.taskAssignmentService.assignTask(
          plan.userId,
          task.assignedAgent.agentId,
          `${task.title}\n\n${task.description}\n\n子任务:\n${task.subtasks.join('\n')}`,
          null
        );

        taskResults[task.taskId] = {
          title: task.title,
          result: result.result,
          agent: task.assignedAgent,
          deliverables: task.deliverables
        };

        console.log(`[CollaborationExecution] 任务完成: ${task.taskId}`);

      } catch (error) {
        console.error(`[CollaborationExecution] 任务失败: ${task.taskId}`, error.message);

        // 通知失败
        if (onProgress) {
          onProgress({
            status: 'failed',
            taskId: task.taskId,
            error: error.message
          });
        }

        throw new Error(`任务执行失败: ${task.title} - ${error.message}`);
      }
    }

    // 汇总结果
    const summary = this._summarizeResults(taskResults);

    return {
      executionMode: 'task_decomposition',
      totalTasks,
      completedTasks: taskDec.mainTasks.length,
      taskResults,
      summary,
      completedAt: new Date().toISOString()
    };
  }

  /**
   * 汇总执行结果
   * @param {Object} results - 步骤/任务结果
   * @returns {string} 汇总文本
   * @private
   */
  _summarizeResults(results) {
    const entries = Object.entries(results);
    if (entries.length === 0) {
      return '无执行结果';
    }

    let summary = '协同执行完成，以下是各Agent的输出汇总：\n\n';

    for (const [id, result] of entries) {
      const content = typeof result === 'object' ? result.result || result.content : result;
      summary += `【${id}】\n${content}\n\n`;
    }

    return summary;
  }

  /**
   * 获取执行进度（如果支持）
   * @param {string} planId - 协同计划ID
   * @returns {Object|null} 进度信息
   */
  getExecutionProgress(planId) {
    // 这里可以实现更复杂的进度追踪逻辑
    const plan = this.planningService.getPlan(planId);
    if (!plan) {
      return null;
    }

    return {
      planId,
      status: plan.status,
      executionResult: plan.executionResult
    };
  }
}

export default CollaborationExecutionService;
