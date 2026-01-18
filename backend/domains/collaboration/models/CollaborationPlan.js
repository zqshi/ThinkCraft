/**
 * CollaborationPlan 聚合根
 * 协同计划的核心实体，管理整个智能协同的生命周期
 *
 * DDD聚合根特点：
 * - 有唯一标识（id）
 * - 管理生命周期（创建、分析、生成、执行、完成）
 * - 维护不变量（状态一致性）
 */

/**
 * 协同计划状态枚举
 */
export const CollaborationStatus = {
  DRAFT: 'draft',           // 草稿：刚创建
  ANALYZING: 'analyzing',   // 分析中：AI正在分析能力
  READY: 'ready',           // 就绪：能力满足，可以执行
  EXECUTING: 'executing',   // 执行中：工作流正在执行
  COMPLETED: 'completed',   // 已完成
  FAILED: 'failed'          // 失败
};

/**
 * CollaborationPlan 聚合根类
 */
export class CollaborationPlan {
  constructor({
    id,
    userId,
    projectId = null, // 项目ID（可选）
    goal,
    createdAt,
    status = CollaborationStatus.DRAFT,

    // 能力分析结果
    capabilityAnalysis = null,

    // 三种协同模式（同时存在）
    roleRecommendation = null,
    workflowOrchestration = null,
    taskDecomposition = null,

    // 执行结果
    executionResult = null,

    // 版本控制
    version = 1,
    adjustmentHistory = []
  }) {
    this.id = id;
    this.userId = userId;
    this.projectId = projectId; // 项目ID
    this.goal = goal;
    this.createdAt = createdAt;
    this.status = status;

    this.capabilityAnalysis = capabilityAnalysis;
    this.roleRecommendation = roleRecommendation;
    this.workflowOrchestration = workflowOrchestration;
    this.taskDecomposition = taskDecomposition;

    this.executionResult = executionResult;
    this.version = version;
    this.adjustmentHistory = adjustmentHistory;
  }

  /**
   * 工厂方法：创建新协同计划
   * @param {string} userId - 用户ID
   * @param {string} goal - 协同目标
   * @param {string} projectId - 项目ID（可选）
   * @returns {CollaborationPlan}
   */
  static create(userId, goal, projectId = null) {
    if (!userId || !goal) {
      throw new Error('用户ID和协同目标不能为空');
    }

    if (goal.trim().length < 10) {
      throw new Error('协同目标至少需要10个字符');
    }

    return new CollaborationPlan({
      id: `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      projectId, // 项目ID
      goal: goal.trim(),
      createdAt: new Date().toISOString(),
      status: CollaborationStatus.DRAFT
    });
  }

  /**
   * 工厂方法：从数据恢复
   * @param {Object} data - 协同计划数据
   * @returns {CollaborationPlan}
   */
  static fromData(data) {
    return new CollaborationPlan(data);
  }

  /**
   * 设置能力分析结果
   * @param {Object} analysis - 能力分析结果
   */
  setCapabilityAnalysis(analysis) {
    if (this.status !== CollaborationStatus.DRAFT && this.status !== CollaborationStatus.ANALYZING) {
      throw new Error('只有草稿或分析中状态才能设置能力分析结果');
    }

    this.capabilityAnalysis = analysis;

    // 根据能力是否满足更新状态
    this.status = analysis.isSufficient
      ? CollaborationStatus.READY
      : CollaborationStatus.DRAFT;

    console.log(`[CollaborationPlan] 能力分析完成: ${analysis.isSufficient ? '满足' : '不足'}`);
  }

  /**
   * 设置协同模式（三种同时设置）
   * @param {Object} roleRec - 角色推荐
   * @param {Object} workflow - 工作流编排
   * @param {Object} taskDec - 任务分解
   */
  setCollaborationModes(roleRec, workflow, taskDec) {
    if (this.status !== CollaborationStatus.READY) {
      throw new Error('只有就绪状态才能设置协同模式');
    }

    this.roleRecommendation = roleRec;
    this.workflowOrchestration = workflow;
    this.taskDecomposition = taskDec;

    console.log('[CollaborationPlan] 协同模式已生成');
  }

  /**
   * 记录调整操作
   * @param {string} adjustmentType - 调整类型
   * @param {Object} adjustmentData - 调整数据
   * @param {Object} aiSuggestion - AI建议
   */
  recordAdjustment(adjustmentType, adjustmentData, aiSuggestion) {
    this.version++;
    this.adjustmentHistory.push({
      version: this.version,
      timestamp: new Date().toISOString(),
      type: adjustmentType,
      data: adjustmentData,
      aiSuggestion
    });

    console.log(`[CollaborationPlan] 记录调整: 版本 ${this.version}`);
  }

  /**
   * 开始执行
   */
  startExecution() {
    if (this.status !== CollaborationStatus.READY) {
      throw new Error('协同计划未就绪，无法执行');
    }

    if (!this.workflowOrchestration || !this.workflowOrchestration.steps) {
      throw new Error('工作流未定义');
    }

    this.status = CollaborationStatus.EXECUTING;
    console.log('[CollaborationPlan] 开始执行协同');
  }

  /**
   * 完成执行
   * @param {Object} result - 执行结果
   */
  completeExecution(result) {
    if (this.status !== CollaborationStatus.EXECUTING) {
      throw new Error('协同计划未在执行中');
    }

    this.status = CollaborationStatus.COMPLETED;
    this.executionResult = {
      ...result,
      completedAt: new Date().toISOString()
    };

    console.log('[CollaborationPlan] 执行完成');
  }

  /**
   * 执行失败
   * @param {string} error - 错误信息
   */
  failExecution(error) {
    this.status = CollaborationStatus.FAILED;
    this.executionResult = {
      error,
      failedAt: new Date().toISOString()
    };

    console.error(`[CollaborationPlan] 执行失败: ${error}`);
  }

  /**
   * 检查是否可以执行
   * @returns {boolean}
   */
  canExecute() {
    return this.status === CollaborationStatus.READY &&
           this.workflowOrchestration &&
           this.workflowOrchestration.steps &&
           this.workflowOrchestration.steps.length > 0;
  }

  /**
   * 检查是否已完成
   * @returns {boolean}
   */
  isCompleted() {
    return this.status === CollaborationStatus.COMPLETED;
  }

  /**
   * 检查是否失败
   * @returns {boolean}
   */
  isFailed() {
    return this.status === CollaborationStatus.FAILED;
  }

  /**
   * 转换为JSON对象
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      goal: this.goal,
      createdAt: this.createdAt,
      status: this.status,
      capabilityAnalysis: this.capabilityAnalysis,
      roleRecommendation: this.roleRecommendation,
      workflowOrchestration: this.workflowOrchestration,
      taskDecomposition: this.taskDecomposition,
      executionResult: this.executionResult,
      version: this.version,
      adjustmentHistory: this.adjustmentHistory
    };
  }

  /**
   * 验证数据有效性
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.id) {
      errors.push('协同计划ID不能为空');
    }

    if (!this.userId) {
      errors.push('用户ID不能为空');
    }

    if (!this.goal || this.goal.trim().length < 10) {
      errors.push('协同目标至少需要10个字符');
    }

    if (!Object.values(CollaborationStatus).includes(this.status)) {
      errors.push(`无效的协同状态: ${this.status}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default CollaborationPlan;
