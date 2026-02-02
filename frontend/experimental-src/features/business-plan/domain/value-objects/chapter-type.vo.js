/**
 * 章节类型值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ChapterType extends ValueObject {
  static EXECUTIVE_SUMMARY = new ChapterType('EXECUTIVE_SUMMARY');
  static MARKET_ANALYSIS = new ChapterType('MARKET_ANALYSIS');
  static PRODUCT_SERVICE = new ChapterType('PRODUCT_SERVICE');
  static BUSINESS_MODEL = new ChapterType('BUSINESS_MODEL');
  static MARKETING_STRATEGY = new ChapterType('MARKETING_STRATEGY');
  static OPERATIONS_PLAN = new ChapterType('OPERATIONS_PLAN');
  static MANAGEMENT_TEAM = new ChapterType('MANAGEMENT_TEAM');
  static FINANCIAL_PLAN = new ChapterType('FINANCIAL_PLAN');
  static RISK_ANALYSIS = new ChapterType('RISK_ANALYSIS');
  static CONCLUSION = new ChapterType('CONCLUSION');

  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建
   */
  static fromString(value) {
    const type = this[value.toUpperCase()];
    if (!type) {
      throw new Error(`无效的章节类型: ${value}`);
    }
    return type;
  }

  /**
   * 获取所有有效类型
   */
  static getValidTypes() {
    return [
      'EXECUTIVE_SUMMARY',
      'MARKET_ANALYSIS',
      'PRODUCT_SERVICE',
      'BUSINESS_MODEL',
      'MARKETING_STRATEGY',
      'OPERATIONS_PLAN',
      'MANAGEMENT_TEAM',
      'FINANCIAL_PLAN',
      'RISK_ANALYSIS',
      'CONCLUSION'
    ];
  }

  /**
   * 验证类型
   */
  validate() {
    const validTypes = ChapterType.getValidTypes();
    if (!validTypes.includes(this._value)) {
      throw new Error(`无效的章节类型: ${this._value}`);
    }
  }

  /**
   * 获取显示名称
   */
  getDisplayName() {
    const displayNames = {
      EXECUTIVE_SUMMARY: '执行摘要',
      MARKET_ANALYSIS: '市场分析',
      PRODUCT_SERVICE: '产品服务',
      BUSINESS_MODEL: '商业模式',
      MARKETING_STRATEGY: '营销策略',
      OPERATIONS_PLAN: '运营计划',
      MANAGEMENT_TEAM: '管理团队',
      FINANCIAL_PLAN: '财务计划',
      RISK_ANALYSIS: '风险分析',
      CONCLUSION: '结论'
    };
    return displayNames[this._value] || this._value;
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ChapterType)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}
