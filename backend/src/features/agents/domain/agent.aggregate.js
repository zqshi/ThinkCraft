/**
 * 数字员工聚合根
 * 集成AgentScope框架，支持多智能体协作
 */
import { AggregateRoot } from '../../../shared/domain/index.js';
import { AgentStatus } from './agent-status.vo.js';
import { AgentType } from './agent-type.vo.js';
import { AgentCapability } from './agent-capability.vo.js';
import { AgentCreatedEvent } from './events/agent-created.event.js';
import { AgentStatusChangedEvent } from './events/agent-status-changed.event.js';
import { AgentTaskExecutedEvent } from './events/agent-task-executed.event.js';

export class Agent extends AggregateRoot {
  /**
   * @param {string} id - Agent ID
   * @param {string} name - Agent名称
   * @param {string} description - Agent描述
   * @param {AgentType} type - Agent类型
   * @param {AgentStatus} status - Agent状态
   * @param {AgentCapability[]} capabilities - Agent能力列表
   * @param {Object} config - Agent配置
   * @param {Object} metadata - 元数据
   * @param {Date} lastActiveAt - 最后活跃时间
   * @param {Date} createdAt - 创建时间
   * @param {Date} updatedAt - 更新时间
   */
  constructor(
    id,
    name,
    description,
    type,
    status = AgentStatus.IDLE,
    capabilities = [],
    config = {},
    metadata = {},
    lastActiveAt = null,
    createdAt = new Date(),
    updatedAt = new Date()
  ) {
    super(id);
    this._name = name;
    this._description = description;
    this._type = type;
    this._status = status;
    this._capabilities = capabilities;
    this._config = config;
    this._metadata = metadata;
    this._lastActiveAt = lastActiveAt;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;

    this.validate();
  }

  /**
   * 创建新的Agent
   */
  static create(id, name, description, type, capabilities = [], config = {}) {
    const agent = new Agent(id, name, description, type, AgentStatus.IDLE, capabilities, config);

    // 添加领域事件
    agent.addDomainEvent(
      new AgentCreatedEvent({
        agentId: id,
        name: name,
        type: type.value,
        capabilities: capabilities.map(cap => cap.value),
        timestamp: new Date()
      })
    );

    return agent;
  }

  /**
   * 激活Agent
   */
  activate() {
    if (this._status.equals(AgentStatus.ACTIVE)) {
      return this;
    }

    const oldStatus = this._status;
    this._status = AgentStatus.ACTIVE;
    this._lastActiveAt = new Date();
    this.updateTimestamp();

    this.addDomainEvent(
      new AgentStatusChangedEvent({
        agentId: this._id,
        oldStatus: oldStatus.value,
        newStatus: AgentStatus.ACTIVE.value,
        timestamp: new Date()
      })
    );

    return this;
  }

  /**
   * 停用Agent
   */
  deactivate() {
    if (this._status.equals(AgentStatus.INACTIVE)) {
      return this;
    }

    const oldStatus = this._status;
    this._status = AgentStatus.INACTIVE;
    this.updateTimestamp();

    this.addDomainEvent(
      new AgentStatusChangedEvent({
        agentId: this._id,
        oldStatus: oldStatus.value,
        newStatus: AgentStatus.INACTIVE.value,
        timestamp: new Date()
      })
    );

    return this;
  }

  /**
   * 设置忙碌状态
   */
  setBusy() {
    const oldStatus = this._status;
    this._status = AgentStatus.BUSY;
    this._lastActiveAt = new Date();
    this.updateTimestamp();

    this.addDomainEvent(
      new AgentStatusChangedEvent({
        agentId: this._id,
        oldStatus: oldStatus.value,
        newStatus: AgentStatus.BUSY.value,
        timestamp: new Date()
      })
    );

    return this;
  }

  /**
   * 设置空闲状态
   */
  setIdle() {
    const oldStatus = this._status;
    this._status = AgentStatus.IDLE;
    this._lastActiveAt = new Date();
    this.updateTimestamp();

    this.addDomainEvent(
      new AgentStatusChangedEvent({
        agentId: this._id,
        oldStatus: oldStatus.value,
        newStatus: AgentStatus.IDLE.value,
        timestamp: new Date()
      })
    );

    return this;
  }

  /**
   * 添加能力
   */
  addCapability(capability) {
    if (!(capability instanceof AgentCapability)) {
      throw new Error('能力必须是AgentCapability类型');
    }

    const exists = this._capabilities.some(cap => cap.equals(capability));
    if (!exists) {
      this._capabilities.push(capability);
      this.updateTimestamp();
    }

    return this;
  }

  /**
   * 移除能力
   */
  removeCapability(capability) {
    this._capabilities = this._capabilities.filter(cap => !cap.equals(capability));
    this.updateTimestamp();
    return this;
  }

  /**
   * 更新配置
   */
  updateConfig(config) {
    if (typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('配置必须是对象');
    }

    this._config = { ...this._config, ...config };
    this.updateTimestamp();
    return this;
  }

  /**
   * 添加元数据
   */
  addMetadata(key, value) {
    this._metadata[key] = value;
    this.updateTimestamp();
    return this;
  }

  /**
   * 记录任务执行
   */
  recordTaskExecution(taskId, taskType, result, duration = 0) {
    this._lastActiveAt = new Date();
    this.updateTimestamp();

    this.addDomainEvent(
      new AgentTaskExecutedEvent({
        agentId: this._id,
        taskId: taskId,
        taskType: taskType,
        result: result,
        duration: duration,
        timestamp: new Date()
      })
    );

    return this;
  }

  /**
   * 检查是否具备某种能力
   */
  hasCapability(capability) {
    return this._capabilities.some(cap => cap.equals(capability));
  }

  /**
   * 检查是否支持某种任务类型
   */
  supportsTask(taskType) {
    return this._capabilities.some(cap => cap.supportsTask(taskType));
  }

  /**
   * 获取AgentScope配置
   */
  getAgentScopeConfig() {
    return {
      name: this._name,
      type: this._type.value,
      capabilities: this._capabilities.map(cap => cap.value),
      config: this._config,
      metadata: this._metadata
    };
  }

  /**
   * 验证Agent的有效性
   */
  validate() {
    if (!this._id || typeof this._id !== 'string') {
      throw new Error('Agent ID必须是字符串');
    }

    if (!this._name || typeof this._name !== 'string') {
      throw new Error('Agent名称不能为空且必须是字符串');
    }

    if (this._name.length > 100) {
      throw new Error('Agent名称不能超过100个字符');
    }

    if (!this._description || typeof this._description !== 'string') {
      throw new Error('Agent描述不能为空且必须是字符串');
    }

    if (!(this._type instanceof AgentType)) {
      throw new Error('Agent类型必须是AgentType类型');
    }

    if (!(this._status instanceof AgentStatus)) {
      throw new Error('Agent状态必须是AgentStatus类型');
    }

    if (!Array.isArray(this._capabilities)) {
      throw new Error('能力列表必须是数组');
    }

    for (const capability of this._capabilities) {
      if (!(capability instanceof AgentCapability)) {
        throw new Error('所有能力必须是AgentCapability类型');
      }
    }

    if (typeof this._config !== 'object' || Array.isArray(this._config)) {
      throw new Error('配置必须是对象');
    }

    if (typeof this._metadata !== 'object' || Array.isArray(this._metadata)) {
      throw new Error('元数据必须是对象');
    }
  }

  // Getters
  get name() {
    return this._name;
  }
  get description() {
    return this._description;
  }
  get type() {
    return this._type;
  }
  get status() {
    return this._status;
  }
  get capabilities() {
    return [...this._capabilities];
  }
  get config() {
    return { ...this._config };
  }
  get metadata() {
    return { ...this._metadata };
  }
  get lastActiveAt() {
    return this._lastActiveAt;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }

  /**
   * 从JSON创建Agent
   */
  static fromJSON(json) {
    const capabilities = json.capabilities
      ? json.capabilities.map(cap => AgentCapability.create(cap))
      : [];
    const type = AgentType.create(json.type);
    const status = AgentStatus.create(json.status);

    return new Agent(
      json.id,
      json.name,
      json.description,
      type,
      status,
      capabilities,
      json.config || {},
      json.metadata || {},
      json.lastActiveAt ? new Date(json.lastActiveAt) : null,
      new Date(json.createdAt),
      new Date(json.updatedAt)
    );
  }

  /**
   * 转换为JSON
   */
  toJSON() {
    const base = super.toJSON();
    return {
      ...base,
      name: this._name,
      description: this._description,
      type: this._type.value,
      status: this._status.value,
      capabilities: this._capabilities.map(cap => cap.value),
      config: this._config,
      metadata: this._metadata,
      lastActiveAt: this._lastActiveAt,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}
