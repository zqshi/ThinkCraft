/**
 * Agent 实体（Entity）
 * 表示一个被雇佣的数字员工实例
 *
 * DDD 实体特点：
 * - 有唯一标识（id）
 * - 有生命周期（雇佣、工作、解雇）
 * - 可变状态（状态、任务、绩效）
 */

import { AgentType } from './valueObjects/AgentType.js';

/**
 * Agent 状态枚举
 */
export const AgentStatus = {
  IDLE: 'idle',           // 空闲
  WORKING: 'working',     // 工作中
  OFFLINE: 'offline'      // 离线
};

/**
 * Agent 实体类
 */
export class Agent {
  /**
   * 构造函数（私有 - 使用工厂方法创建实例）
   */
  constructor({
    id,
    userId,
    typeId,
    nickname,
    hiredAt,
    status = AgentStatus.IDLE,
    tasksCompleted = 0,
    performance = 100,
    currentTask = null,
    firedAt = null
  }) {
    this.id = id;
    this.userId = userId;
    this.typeId = typeId;
    this.nickname = nickname;
    this.hiredAt = hiredAt;
    this.status = status;
    this.tasksCompleted = tasksCompleted;
    this.performance = performance;
    this.currentTask = currentTask;
    this.firedAt = firedAt;
  }

  /**
   * 工厂方法：雇佣新Agent
   * @param {string} userId - 用户ID
   * @param {string} typeId - Agent类型ID
   * @param {string} nickname - 昵称（可选）
   * @returns {Agent|null} Agent实例或null（类型不存在时）
   */
  static hire(userId, typeId, nickname = null) {
    // 验证Agent类型是否存在
    const agentType = AgentType.getById(typeId);
    if (!agentType) {
      return null;
    }

    // 生成唯一ID
    const id = `${userId}_${typeId}_${Date.now()}`;

    // 创建Agent实例
    return new Agent({
      id,
      userId,
      typeId,
      nickname: nickname || agentType.name,
      hiredAt: new Date().toISOString(),
      status: AgentStatus.IDLE,
      tasksCompleted: 0,
      performance: 100
    });
  }

  /**
   * 工厂方法：从数据恢复Agent
   * @param {Object} data - Agent数据
   * @returns {Agent}
   */
  static fromData(data) {
    return new Agent(data);
  }

  /**
   * 获取Agent类型信息
   * @returns {Object} Agent类型配置
   */
  getType() {
    return AgentType.getById(this.typeId);
  }

  /**
   * 获取Agent薪资
   * @returns {number} 月薪
   */
  getSalary() {
    const type = this.getType();
    return type ? type.salary : 0;
  }

  /**
   * 获取Agent技能列表
   * @returns {Array<string>} 技能列表
   */
  getSkills() {
    const type = this.getType();
    return type ? type.skills : [];
  }

  /**
   * 检查Agent是否空闲
   * @returns {boolean}
   */
  isIdle() {
    return this.status === AgentStatus.IDLE;
  }

  /**
   * 检查Agent是否工作中
   * @returns {boolean}
   */
  isWorking() {
    return this.status === AgentStatus.WORKING;
  }

  /**
   * 检查Agent是否已被解雇
   * @returns {boolean}
   */
  isFired() {
    return this.firedAt !== null;
  }

  /**
   * 检查Agent是否可以接受新任务
   * @returns {boolean}
   */
  canAcceptTask() {
    return this.isIdle() && !this.isFired();
  }

  /**
   * 分配任务给Agent
   * @param {Object} task - 任务信息
   * @returns {boolean} 是否成功分配
   * @throws {Error} 如果Agent不可用
   */
  assignTask(task) {
    if (!this.canAcceptTask()) {
      throw new Error(`Agent ${this.nickname} 不可用（状态: ${this.status}, 已解雇: ${this.isFired()}）`);
    }

    this.status = AgentStatus.WORKING;
    this.currentTask = {
      ...task,
      assignedAt: new Date().toISOString()
    };

    return true;
  }

  /**
   * 完成任务
   * @param {Object} result - 任务结果
   * @returns {Object} 任务完成信息
   */
  completeTask(result = {}) {
    if (!this.isWorking()) {
      throw new Error(`Agent ${this.nickname} 当前没有工作中的任务`);
    }

    const completedTask = {
      ...this.currentTask,
      ...result,
      completedAt: new Date().toISOString()
    };

    // 更新状态
    this.status = AgentStatus.IDLE;
    this.tasksCompleted++;
    this.currentTask = null;

    // 轻微提升绩效（最高100）
    this.updatePerformance(1);

    return completedTask;
  }

  /**
   * 任务失败
   * @param {string} reason - 失败原因
   */
  failTask(reason) {
    if (!this.isWorking()) {
      throw new Error(`Agent ${this.nickname} 当前没有工作中的任务`);
    }

    // 降低绩效
    this.updatePerformance(-5);

    // 恢复空闲状态
    this.status = AgentStatus.IDLE;
    this.currentTask = null;
  }

  /**
   * 更新绩效
   * @param {number} delta - 绩效变化值（正数提升，负数降低）
   */
  updatePerformance(delta) {
    this.performance = Math.max(0, Math.min(100, this.performance + delta));
  }

  /**
   * 设置绩效
   * @param {number} value - 新的绩效值 (0-100)
   */
  setPerformance(value) {
    if (value < 0 || value > 100) {
      throw new Error('绩效值必须在 0-100 之间');
    }
    this.performance = value;
  }

  /**
   * 解雇Agent
   * @returns {boolean} 是否成功解雇
   */
  fire() {
    if (this.isFired()) {
      return false;
    }

    // 如果正在工作，先取消任务
    if (this.isWorking()) {
      this.currentTask = null;
    }

    this.status = AgentStatus.OFFLINE;
    this.firedAt = new Date().toISOString();

    return true;
  }

  /**
   * 获取工作时长（天）
   * @returns {number} 工作天数
   */
  getWorkingDays() {
    const endTime = this.firedAt ? new Date(this.firedAt) : new Date();
    const startTime = new Date(this.hiredAt);
    const diffMs = endTime - startTime;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * 获取平均每日任务完成数
   * @returns {number} 平均每日任务数
   */
  getAverageTasksPerDay() {
    const days = this.getWorkingDays();
    if (days === 0) return 0;
    return (this.tasksCompleted / days).toFixed(2);
  }

  /**
   * 获取Agent统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      id: this.id,
      nickname: this.nickname,
      typeId: this.typeId,
      status: this.status,
      tasksCompleted: this.tasksCompleted,
      performance: this.performance,
      workingDays: this.getWorkingDays(),
      averageTasksPerDay: this.getAverageTasksPerDay(),
      isWorking: this.isWorking(),
      isFired: this.isFired()
    };
  }

  /**
   * 转换为JSON对象（用于API响应）
   * @returns {Object} JSON对象
   */
  toJSON() {
    const type = this.getType();

    return {
      id: this.id,
      userId: this.userId,
      type: this.typeId,
      nickname: this.nickname,
      // 从AgentType获取的信息
      name: type?.name,
      emoji: type?.emoji,
      desc: type?.desc,
      skills: type?.skills,
      salary: type?.salary,
      level: type?.level,
      category: type?.category,
      // Agent实例信息
      hiredAt: this.hiredAt,
      status: this.status,
      tasksCompleted: this.tasksCompleted,
      performance: this.performance,
      currentTask: this.currentTask,
      firedAt: this.firedAt
    };
  }

  /**
   * 转换为存储格式（持久化）
   * @returns {Object} 存储对象
   */
  toPersistence() {
    return {
      id: this.id,
      userId: this.userId,
      typeId: this.typeId,
      nickname: this.nickname,
      hiredAt: this.hiredAt,
      status: this.status,
      tasksCompleted: this.tasksCompleted,
      performance: this.performance,
      currentTask: this.currentTask,
      firedAt: this.firedAt
    };
  }

  /**
   * 验证Agent数据是否有效
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.id) {
      errors.push('Agent ID不能为空');
    }

    if (!this.userId) {
      errors.push('用户ID不能为空');
    }

    if (!AgentType.exists(this.typeId)) {
      errors.push(`无效的Agent类型: ${this.typeId}`);
    }

    if (!Object.values(AgentStatus).includes(this.status)) {
      errors.push(`无效的Agent状态: ${this.status}`);
    }

    if (this.performance < 0 || this.performance > 100) {
      errors.push('绩效值必须在 0-100 之间');
    }

    if (this.tasksCompleted < 0) {
      errors.push('任务完成数不能为负数');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * 导出Agent状态枚举
 */
export default Agent;
