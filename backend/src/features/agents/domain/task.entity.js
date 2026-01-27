/**
 * 任务实体
 * 表示Agent需要执行的任务
 */

export class Task {
  constructor(id, type, content, options = {}) {
    this.id = id;
    this.type = type;
    this.content = content;
    this.context = options.context || null;
    this.requirements = options.requirements || [];
    this.dependencies = options.dependencies || [];
    this.previousResults = options.previousResults || [];
    this.status = 'pending'; // pending, in_progress, completed, failed
    this.result = null;
    this.error = null;
    this.createdAt = Date.now();
    this.completedAt = null;
  }

  /**
   * 创建任务
   * @param {string} type - 任务类型
   * @param {string} content - 任务内容
   * @param {Object} options - 可选配置
   * @returns {Task} 任务实例
   */
  static create(type, content, options = {}) {
    const id = options.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new Task(id, type, content, options);
  }

  /**
   * 标记任务为进行中
   */
  markInProgress() {
    this.status = 'in_progress';
  }

  /**
   * 标记任务为完成
   * @param {Object} result - 执行结果
   */
  markCompleted(result) {
    this.status = 'completed';
    this.result = result;
    this.completedAt = Date.now();
  }

  /**
   * 标记任务为失败
   * @param {Error} error - 错误信息
   */
  markFailed(error) {
    this.status = 'failed';
    this.error = error.message || error;
    this.completedAt = Date.now();
  }

  /**
   * 检查任务是否可以执行
   * @param {Array<Task>} allTasks - 所有任务列表
   * @returns {boolean} 是否可以执行
   */
  canExecute(allTasks) {
    if (this.status !== 'pending') {
      return false;
    }

    // 检查依赖任务是否都已完成
    for (const depId of this.dependencies) {
      const depTask = allTasks.find(t => t.id === depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取依赖任务的结果
   * @param {Array<Task>} allTasks - 所有任务列表
   * @returns {Array<Object>} 依赖任务的结果
   */
  getDependencyResults(allTasks) {
    return this.dependencies
      .map(depId => allTasks.find(t => t.id === depId))
      .filter(task => task && task.result)
      .map(task => task.result);
  }

  /**
   * 获取任务信息
   * @returns {Object} 任务信息
   */
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      content: this.content,
      status: this.status,
      dependencies: this.dependencies,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      result: this.result,
      error: this.error
    };
  }
}
