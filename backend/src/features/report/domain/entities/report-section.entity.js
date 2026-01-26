/**
 * 报告章节实体
 */
import { Entity } from '../../../../shared/domain/entity.base.js';

export class ReportSection extends Entity {
  constructor(id, props) {
    super(id, props);
  }

  get title() {
    return this.props.title;
  }

  get content() {
    return this.props.content;
  }

  get order() {
    return this.props.order;
  }

  get type() {
    return this.props.type;
  }

  get metadata() {
    return this.props.metadata;
  }

  updateContent(newContent) {
    this.props.content = newContent;
    this.touch();
  }

  updateTitle(newTitle) {
    this.props.title = newTitle;
    this.touch();
  }

  updateOrder(newOrder) {
    this.props.order = newOrder;
    this.touch();
  }

  updateMetadata(newMetadata) {
    this.props.metadata = { ...this.props.metadata, ...newMetadata };
    this.touch();
  }

  validate() {
    if (!this.props.title || typeof this.props.title !== 'string') {
      throw new Error('Section title must be a non-empty string');
    }

    if (!this.props.content || typeof this.props.content !== 'string') {
      throw new Error('Section content must be a non-empty string');
    }

    if (typeof this.props.order !== 'number' || this.props.order < 0) {
      throw new Error('Section order must be a non-negative number');
    }

    if (!this.props.type || typeof this.props.type !== 'string') {
      throw new Error('Section type must be a non-empty string');
    }

    if (this.props.metadata && typeof this.props.metadata !== 'object') {
      throw new Error('Section metadata must be an object');
    }
  }
}
