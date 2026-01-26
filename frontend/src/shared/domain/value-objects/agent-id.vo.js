import { ValueObject } from '../value-object.base.js';

/**
 * Agent ID值对象
 */
export class AgentId extends ValueObject {
  constructor(value) {
    super(value);
    this._validate();
  }

  /**
   * 验证Agent ID格式
   */
  _validate() {
    if (!this.value || typeof this.value !== 'string') {
      throw new Error('Agent ID必须是字符串');
    }

    if (this.value.length < 1 || this.value.length > 100) {
      throw new Error('Agent ID长度必须在1-100之间');
    }
  }

  /**
   * 创建Agent ID
   */
  static create(value) {
    return new AgentId(value);
  }

  /**
   * 生成新的Agent ID
   */
  static generate() {
    return new AgentId(`agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  /**
   * 获取字符串表示
   */
  toString() {
    return this.value;
  }
}
