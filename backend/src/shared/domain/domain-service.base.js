/**
 * 领域服务接口基类
 * 领域服务用于处理跨实体的业务逻辑
 */
export class IDomainService {
  /**
   * 执行领域服务
   * @param {Object} params - 服务参数
   */
  async execute(params) {
    throw new Error('必须实现execute方法');
  }
}

/**
 * 领域服务基类
 */
export class DomainService extends IDomainService {
  constructor() {
    super();
    this._name = this.constructor.name;
  }

  /**
   * 获取服务名称
   */
  get name() {
    return this._name;
  }

  /**
   * 验证参数
   * @param {Object} params
   */
  validateParams(params) {
    if (!params) {
      throw new Error('参数不能为空');
    }
  }

  /**
   * 检查业务规则
   * @param {boolean} condition
   * @param {string} message
   */
  checkRule(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }
}
