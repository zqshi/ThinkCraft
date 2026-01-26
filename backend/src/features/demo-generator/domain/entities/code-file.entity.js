/**
 * 代码文件实体
 */
import { Entity } from '../../../../shared/domain/entity.base.js';

export class CodeFile extends Entity {
  constructor(id, props) {
    super(id, props);
  }

  get filename() {
    return this.props.filename;
  }

  get content() {
    return this.props.content;
  }

  get language() {
    return this.props.language;
  }

  get size() {
    return this.props.size;
  }

  updateContent(newContent) {
    this.props.content = newContent;
    this.props.size = newContent.length;
    this.touch();
  }

  validate() {
    if (!this.props.filename || typeof this.props.filename !== 'string') {
      throw new Error('Filename must be a non-empty string');
    }

    if (!this.props.content || typeof this.props.content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    if (!this.props.language || typeof this.props.language !== 'string') {
      throw new Error('Language must be a non-empty string');
    }

    if (typeof this.props.size !== 'number' || this.props.size < 0) {
      throw new Error('Size must be a non-negative number');
    }
  }
}
