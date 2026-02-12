/**
 * Report状态 值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class ReportStatus extends ValueObject {
  static DRAFT = 'draft';
  static GENERATING = 'generating';
  static COMPLETED = 'completed';
  static FAILED = 'failed';
  static ARCHIVED = 'archived';

  constructor(value) {
    super({ value });
  }

  get value() {
    return this.props.value;
  }

  validate() {
    const validStatuses = [
      ReportStatus.DRAFT,
      ReportStatus.GENERATING,
      ReportStatus.COMPLETED,
      ReportStatus.FAILED,
      ReportStatus.ARCHIVED
    ];

    if (!validStatuses.includes(this.props.value)) {
      throw new Error(
        `Invalid report status: ${this.props.value}. Must be one of: ${validStatuses.join(', ')}`
      );
    }
  }

  isDraft() {
    return this.props.value === ReportStatus.DRAFT;
  }

  isGenerating() {
    return this.props.value === ReportStatus.GENERATING;
  }

  isCompleted() {
    return this.props.value === ReportStatus.COMPLETED;
  }

  isFailed() {
    return this.props.value === ReportStatus.FAILED;
  }

  isArchived() {
    return this.props.value === ReportStatus.ARCHIVED;
  }

  canEdit() {
    return this.isDraft() || this.isFailed() || this.isGenerating();
  }

  canGenerate() {
    return this.isDraft() || this.isFailed();
  }

  canArchive() {
    return this.isCompleted();
  }
}
