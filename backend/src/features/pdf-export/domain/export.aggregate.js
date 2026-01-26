/**
 * Export聚合根
 */
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base.js';
import { ExportId } from './value-objects/export-id.vo.js';
import { ExportFormat } from './value-objects/export-format.vo.js';
import { ExportStatus } from './value-objects/export-status.vo.js';
import { ExportOptions } from './value-objects/export-options.vo.js';
import { ExportCreatedEvent } from './events/export-created.event.js';
import { ExportProcessingStartedEvent } from './events/export-processing-started.event.js';
import { ExportCompletedEvent } from './events/export-completed.event.js';
import { ExportFailedEvent } from './events/export-failed.event.js';

export class Export extends AggregateRoot {
  constructor(id, props) {
    super(id, props);
  }

  get projectId() {
    return this.props.projectId;
  }

  get format() {
    return this.props.format;
  }

  get status() {
    return this.props.status;
  }

  get title() {
    return this.props.title;
  }

  get content() {
    return this.props.content;
  }

  get options() {
    return this.props.options;
  }

  get filePath() {
    return this.props.filePath;
  }

  get fileSize() {
    return this.props.fileSize;
  }

  get createdAt() {
    return this.props.createdAt;
  }

  get completedAt() {
    return this.props.completedAt;
  }

  static create(props) {
    const exportEntity = new Export(new ExportId(`export_${Date.now()}`), {
      ...props,
      status: new ExportStatus(ExportStatus.PENDING),
      options: props.options || new ExportOptions({}),
      filePath: null,
      fileSize: null,
      createdAt: new Date(),
      completedAt: null
    });

    exportEntity.addDomainEvent(
      new ExportCreatedEvent({
        exportId: exportEntity.id.value,
        projectId: props.projectId,
        format: props.format.value,
        title: props.title
      })
    );

    return exportEntity;
  }

  startProcessing() {
    if (!this.props.status.isPending()) {
      throw new Error('Export processing can only be started when status is PENDING');
    }

    this.props.status = new ExportStatus(ExportStatus.PROCESSING);
    this.touch();

    this.addDomainEvent(
      new ExportProcessingStartedEvent({
        exportId: this.id.value,
        projectId: this.props.projectId,
        format: this.props.format.value
      })
    );
  }

  complete(filePath, fileSize) {
    if (!this.props.status.isProcessing()) {
      throw new Error('Export can only be completed when status is PROCESSING');
    }

    this.props.status = new ExportStatus(ExportStatus.COMPLETED);
    this.props.filePath = filePath;
    this.props.fileSize = fileSize;
    this.props.completedAt = new Date();
    this.touch();

    this.addDomainEvent(
      new ExportCompletedEvent({
        exportId: this.id.value,
        projectId: this.props.projectId,
        format: this.props.format.value,
        filePath: filePath,
        fileSize: fileSize,
        completedAt: this.props.completedAt
      })
    );
  }

  fail(error) {
    this.props.status = new ExportStatus(ExportStatus.FAILED);
    this.props.error = error;
    this.props.completedAt = new Date();
    this.touch();

    this.addDomainEvent(
      new ExportFailedEvent({
        exportId: this.id.value,
        projectId: this.props.projectId,
        format: this.props.format.value,
        error: error.message || error
      })
    );
  }

  getDownloadUrl() {
    if (!this.props.status.isCompleted() || !this.props.filePath) {
      return null;
    }

    // 生成下载URL（实际实现需要根据存储服务调整）
    return `/api/exports/${this.id.value}/download`;
  }

  validate() {
    if (!this.props.projectId) {
      throw new Error('Project ID is required');
    }

    if (!(this.props.format instanceof ExportFormat)) {
      throw new Error('Format must be an ExportFormat instance');
    }

    if (!(this.props.status instanceof ExportStatus)) {
      throw new Error('Status must be an ExportStatus instance');
    }

    if (!(this.props.options instanceof ExportOptions)) {
      throw new Error('Options must be an ExportOptions instance');
    }

    if (!this.props.title || typeof this.props.title !== 'string') {
      throw new Error('Title must be a non-empty string');
    }

    if (!this.props.content || typeof this.props.content !== 'string') {
      throw new Error('Content must be a non-empty string');
    }

    if (this.props.filePath && typeof this.props.filePath !== 'string') {
      throw new Error('File path must be a string or null');
    }

    if (
      this.props.fileSize !== null &&
      (typeof this.props.fileSize !== 'number' || this.props.fileSize < 0)
    ) {
      throw new Error('File size must be a non-negative number or null');
    }

    if (!(this.props.createdAt instanceof Date)) {
      throw new Error('Created at must be a Date instance');
    }

    if (this.props.completedAt && !(this.props.completedAt instanceof Date)) {
      throw new Error('Completed at must be a Date instance or null');
    }
  }
}
