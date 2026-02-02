/**
 * 报告状态值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ReportStatus extends ValueObject {
  static DRAFT = new ReportStatus('DRAFT');
  static GENERATED = new ReportStatus('GENERATED');
  static PUBLISHED = new ReportStatus('PUBLISHED');
  static ARCHIVED = new ReportStatus('ARCHIVED');
  static REVISION = new ReportStatus('REVISION');

  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 从字符串创建状态
   */
  static fromString(value) {
    const status = this[value.toUpperCase()];
    if (!status) {
      throw new Error(`无效的报告状态: ${value}`);
    }
    return status;
  }

  /**
   * 获取所有有效状态
   */
  static getValidStatuses() {
    return ['DRAFT', 'GENERATED', 'PUBLISHED', 'ARCHIVED', 'REVISION'];
  }

  /**
   * 验证状态值
   */
  validate() {
    const validStatuses = ReportStatus.getValidStatuses();
    if (!validStatuses.includes(this._value)) {
      throw new Error(`无效的报告状态: ${this._value}`);
    }
  }

  /**
   * 是否草稿
   */
  isDraft() {
    return this._value === 'DRAFT';
  }

  /**
   * 是否已生成
   */
  isGenerated() {
    return this._value === 'GENERATED';
  }

  /**
   * 是否已发布
   */
  isPublished() {
    return this._value === 'PUBLISHED';
  }

  /**
   * 是否已归档
   */
  isArchived() {
    return this._value === 'ARCHIVED';
  }

  /**
   * 是否修订中
   */
  isRevision() {
    return this._value === 'REVISION';
  }

  /**
   * 是否可以编辑
   */
  canEdit() {
    return ['DRAFT', 'REVISION'].includes(this._value);
  }

  /**
   * 是否可以生成
   */
  canGenerate() {
    return ['DRAFT', 'REVISION'].includes(this._value);
  }

  /**
   * 是否可以发布
   */
  canPublish() {
    return this._value === 'GENERATED';
  }

  /**
   * 是否可以归档
   */
  canArchive() {
    return ['GENERATED', 'PUBLISHED'].includes(this._value);
  }

  /**
   * 获取显示文本
   */
  getDisplayName() {
    const statusMap = {
      DRAFT: '草稿',
      GENERATED: '已生成',
      PUBLISHED: '已发布',
      ARCHIVED: '已归档',
      REVISION: '修订中'
    };
    return statusMap[this._value] || this._value;
  }

  /**
   * 获取状态颜色
   */
  getStatusColor() {
    const colorMap = {
      DRAFT: 'gray',
      GENERATED: 'blue',
      PUBLISHED: 'green',
      ARCHIVED: 'orange',
      REVISION: 'purple'
    };
    return colorMap[this._value] || 'default';
  }

  /**
   * 获取状态图标
   */
  getStatusIcon() {
    const iconMap = {
      DRAFT: '✏️',
      GENERATED: '⚙️',
      PUBLISHED: '📤',
      ARCHIVED: '📦',
      REVISION: '🔄'
    };
    return iconMap[this._value] || '❓';
  }

  /**
   * 获取下一个可能的状态
   */
  getNextPossibleStatuses() {
    const transitions = {
      DRAFT: ['GENERATED'],
      GENERATED: ['PUBLISHED', 'REVISION'],
      PUBLISHED: ['ARCHIVED', 'REVISION'],
      ARCHIVED: [],
      REVISION: ['GENERATED']
    };
    return transitions[this._value] || [];
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof ReportStatus)) {
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
