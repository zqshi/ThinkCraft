/**
 * Agent状态值对象
 */
import { ValueObject } from '../../../shared/domain/index.js';

export class AgentStatus extends ValueObject {
  /**
   * Agent状态枚举
   */
  static get IDLE() {
    return new AgentStatus({ value: 'idle' });
  }

  static get ACTIVE() {
    return new AgentStatus({ value: 'active' });
  }

  static get BUSY() {
    return new AgentStatus({ value: 'busy' });
  }

  static get INACTIVE() {
    return new AgentStatus({ value: 'inactive' });
  }

  static get ERROR() {
    return new AgentStatus({ value: 'error' });
  }

  /**
   * 创建Agent状态
   */
  static create(value) {
    switch (value) {
    case 'idle':
      return AgentStatus.IDLE;
    case 'active':
      return AgentStatus.ACTIVE;
    case 'busy':
      return AgentStatus.BUSY;
    case 'inactive':
      return AgentStatus.INACTIVE;
    case 'error':
      return AgentStatus.ERROR;
    default:
      throw new Error(`无效的Agent状态: ${value}`);
    }
  }

  /**
   * 获取状态值
   */
  get value() {
    return this.props.value;
  }

  /**
   * 验证状态值
   */
  validate() {
    const validValues = ['idle', 'active', 'busy', 'inactive', 'error'];
    if (!validValues.includes(this.props.value)) {
      throw new Error(`Agent状态必须是以下值之一: ${validValues.join(', ')}`);
    }
  }

  /**
   * 检查是否为空闲状态
   */
  get isIdle() {
    return this.props.value === 'idle';
  }

  /**
   * 检查是否为活跃状态
   */
  get isActive() {
    return this.props.value === 'active';
  }

  /**
   * 检查是否为忙碌状态
   */
  get isBusy() {
    return this.props.value === 'busy';
  }

  /**
   * 检查是否为非活跃状态
   */
  get isInactive() {
    return this.props.value === 'inactive';
  }

  /**
   * 检查是否为错误状态
   */
  get isError() {
    return this.props.value === 'error';
  }

  /**
   * 检查是否可执行任务
   */
  get canExecuteTask() {
    return ['idle', 'active'].includes(this.props.value);
  }
}
