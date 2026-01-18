/**
 * WorkflowStep 值对象
 * 工作流步骤，不可变对象
 *
 * DDD值对象特点：
 * - 不可变（immutable）
 * - 描述工作流中的单个执行步骤
 */

/**
 * 步骤状态枚举
 */
export const StepStatus = {
  PENDING: 'pending',       // 待执行
  RUNNING: 'running',       // 执行中
  COMPLETED: 'completed',   // 已完成
  FAILED: 'failed'          // 失败
};

/**
 * WorkflowStep 值对象类
 */
export class WorkflowStep {
  constructor({
    stepId,                  // 步骤ID
    agentId,                 // 执行该步骤的Agent ID
    agentName,               // Agent昵称
    agentType,               // Agent类型ID
    task,                    // 具体任务描述

    dependencies = [],       // 依赖的步骤ID数组 ['step_1', 'step_2']
    estimatedDuration,       // 预估耗时（秒）
    priority = 'medium',     // 优先级 'high' | 'medium' | 'low'

    context = null,          // 上下文信息（可选）
    outputFormat = null,     // 输出格式要求（可选）

    // 执行状态
    status = StepStatus.PENDING,      // 'pending' | 'running' | 'completed' | 'failed'
    result = null,           // 执行结果
    error = null,            // 错误信息
    startedAt = null,        // 开始时间
    completedAt = null       // 完成时间
  }) {
    this.stepId = stepId;
    this.agentId = agentId;
    this.agentName = agentName;
    this.agentType = agentType;
    this.task = task;
    this.dependencies = dependencies;
    this.estimatedDuration = estimatedDuration;
    this.priority = priority;
    this.context = context;
    this.outputFormat = outputFormat;
    this.status = status;
    this.result = result;
    this.error = error;
    this.startedAt = startedAt;
    this.completedAt = completedAt;
  }

  /**
   * 创建工作流步骤
   * @param {Object} params - 步骤参数
   * @returns {WorkflowStep}
   */
  static create(params) {
    if (!params.stepId || !params.agentId || !params.task) {
      throw new Error('stepId, agentId和task是必需的');
    }

    return new WorkflowStep(params);
  }

  /**
   * 检查依赖是否满足
   * @param {Array<string>} completedSteps - 已完成的步骤ID数组
   * @returns {boolean}
   */
  areDependenciesMet(completedSteps) {
    if (!this.dependencies || this.dependencies.length === 0) {
      return true;
    }
    return this.dependencies.every(dep => completedSteps.includes(dep));
  }

  /**
   * 标记为正在执行
   * @returns {WorkflowStep} 新的WorkflowStep实例（不可变）
   */
  markAsRunning() {
    return new WorkflowStep({
      ...this,
      status: StepStatus.RUNNING,
      startedAt: new Date().toISOString()
    });
  }

  /**
   * 标记为完成
   * @param {Object} result - 执行结果
   * @returns {WorkflowStep} 新的WorkflowStep实例（不可变）
   */
  markAsCompleted(result) {
    return new WorkflowStep({
      ...this,
      status: StepStatus.COMPLETED,
      result,
      completedAt: new Date().toISOString()
    });
  }

  /**
   * 标记为失败
   * @param {string} error - 错误信息
   * @returns {WorkflowStep} 新的WorkflowStep实例（不可变）
   */
  markAsFailed(error) {
    return new WorkflowStep({
      ...this,
      status: StepStatus.FAILED,
      error,
      completedAt: new Date().toISOString()
    });
  }

  /**
   * 检查是否待执行
   * @returns {boolean}
   */
  isPending() {
    return this.status === StepStatus.PENDING;
  }

  /**
   * 检查是否正在执行
   * @returns {boolean}
   */
  isRunning() {
    return this.status === StepStatus.RUNNING;
  }

  /**
   * 检查是否已完成
   * @returns {boolean}
   */
  isCompleted() {
    return this.status === StepStatus.COMPLETED;
  }

  /**
   * 检查是否失败
   * @returns {boolean}
   */
  isFailed() {
    return this.status === StepStatus.FAILED;
  }

  /**
   * 获取实际执行时长（秒）
   * @returns {number|null}
   */
  getActualDuration() {
    if (!this.startedAt || !this.completedAt) {
      return null;
    }
    const start = new Date(this.startedAt);
    const end = new Date(this.completedAt);
    return Math.floor((end - start) / 1000);
  }

  /**
   * 转换为JSON对象
   * @returns {Object}
   */
  toJSON() {
    return {
      stepId: this.stepId,
      agentId: this.agentId,
      agentName: this.agentName,
      agentType: this.agentType,
      task: this.task,
      dependencies: this.dependencies,
      estimatedDuration: this.estimatedDuration,
      priority: this.priority,
      context: this.context,
      outputFormat: this.outputFormat,
      status: this.status,
      result: this.result,
      error: this.error,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      actualDuration: this.getActualDuration()
    };
  }

  /**
   * 验证数据有效性
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.stepId) {
      errors.push('步骤ID不能为空');
    }

    if (!this.agentId) {
      errors.push('Agent ID不能为空');
    }

    if (!this.task || this.task.trim().length === 0) {
      errors.push('任务描述不能为空');
    }

    if (!Array.isArray(this.dependencies)) {
      errors.push('依赖必须是数组');
    }

    if (!Object.values(StepStatus).includes(this.status)) {
      errors.push(`无效的步骤状态: ${this.status}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default WorkflowStep;
