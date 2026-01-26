import { ValueObject } from '../../../../shared/domain/value-object.base.js';

/**
 * 推荐置信度值对象
 */
export class RecommendationConfidence extends ValueObject {
  constructor(value) {
    super(value);
    this._validate();
  }

  _validate() {
    if (typeof this.value !== 'number') {
      throw new Error('置信度必须是数字');
    }

    if (this.value < 0 || this.value > 1) {
      throw new Error('置信度必须在0-1之间');
    }
  }

  static create(value) {
    return new RecommendationConfidence(value);
  }

  /**
   * 获取置信度等级
   */
  getLevel() {
    if (this.value >= 0.9) {
      return 'very_high';
    }
    if (this.value >= 0.8) {
      return 'high';
    }
    if (this.value >= 0.6) {
      return 'medium';
    }
    if (this.value >= 0.4) {
      return 'low';
    }
    return 'very_low';
  }

  /**
   * 获取置信度显示文本
   */
  getDisplayText() {
    const levels = {
      very_high: '非常高',
      high: '高',
      medium: '中等',
      low: '低',
      very_low: '非常低'
    };

    return levels[this.getLevel()];
  }

  /**
   * 获取置信度颜色
   */
  getColor() {
    const colors = {
      very_high: 'green',
      high: 'lightgreen',
      medium: 'orange',
      low: 'red',
      very_low: 'darkred'
    };

    return colors[this.getLevel()];
  }

  /**
   * 转换为百分比
   */
  toPercentage() {
    return Math.round(this.value * 100);
  }

  toString() {
    return `${(this.value * 100).toFixed(1)}%`;
  }
}
