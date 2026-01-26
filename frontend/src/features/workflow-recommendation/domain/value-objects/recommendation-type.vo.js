import { ValueObject } from '../../../../shared/domain/value-object.base.js';

/**
 * 推荐类型枚举
 */
export class RecommendationType extends ValueObject {
  static WORKFLOW = 'workflow';
  static AGENT = 'agent';
  static TOOL = 'tool';
  static PROCESS = 'process';
  static STRATEGY = 'strategy';

  constructor(value) {
    super(value);
    this._validate();
  }

  _validate() {
    const validTypes = [
      RecommendationType.WORKFLOW,
      RecommendationType.AGENT,
      RecommendationType.TOOL,
      RecommendationType.PROCESS,
      RecommendationType.STRATEGY
    ];

    if (!validTypes.includes(this.value)) {
      throw new Error(`无效的推荐类型: ${this.value}`);
    }
  }

  static create(value) {
    return new RecommendationType(value);
  }

  /**
   * 获取类型的显示名称
   */
  getDisplayName() {
    const displayNames = {
      [RecommendationType.WORKFLOW]: '工作流推荐',
      [RecommendationType.AGENT]: '智能体推荐',
      [RecommendationType.TOOL]: '工具推荐',
      [RecommendationType.PROCESS]: '流程推荐',
      [RecommendationType.STRATEGY]: '策略推荐'
    };

    return displayNames[this.value] || this.value;
  }

  /**
   * 获取类型的图标
   */
  getIcon() {
    const icons = {
      [RecommendationType.WORKFLOW]: '🔄',
      [RecommendationType.AGENT]: '🤖',
      [RecommendationType.TOOL]: '🛠️',
      [RecommendationType.PROCESS]: '📋',
      [RecommendationType.STRATEGY]: '🎯'
    };

    return icons[this.value] || '💡';
  }

  /**
   * 获取类型的描述
   */
  getDescription() {
    const descriptions = {
      [RecommendationType.WORKFLOW]: '基于项目特点推荐最适合的工作流程',
      [RecommendationType.AGENT]: '推荐能够提升效率的智能助手',
      [RecommendationType.TOOL]: '推荐项目所需的工具和技术栈',
      [RecommendationType.PROCESS]: '推荐优化的业务流程方案',
      [RecommendationType.STRATEGY]: '推荐项目执行的最佳策略'
    };

    return descriptions[this.value] || '';
  }

  toString() {
    return this.value;
  }
}
