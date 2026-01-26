/**
 * PDF导出聚合根
 */
import { AggregateRoot } from '../../../../shared/domain/aggregate-root.base.js';
import { ExportId } from '../value-objects/export-id.vo.js';
import { ExportFormat } from '../value-objects/export-format.vo.js';
import { ExportStatus } from '../value-objects/export-status.vo.js';
import { ExportOptions } from '../value-objects/export-options.vo.js';
import { ExportCreatedEvent } from '../events/export-created.event.js';
import { ExportStartedEvent } from '../events/export-started.event.js';
import { ExportCompletedEvent } from '../events/export-completed.event.js';
import { ExportFailedEvent } from '../events/export-failed.event.js';

export class PdfExport extends AggregateRoot {
  constructor(id) {
    super(id);
    this._projectId = null;
    this._format = null;
    this._title = '';
    this._content = '';
    this._options = null;
    this._status = null;
    this._filePath = null;
    this._fileSize = 0;
    this._startedAt = null;
    this._completedAt = null;
    this._error = null;
  }

  // 工厂方法
  static create(props) {
    const exportId = new ExportId();
    const pdfExport = new PdfExport(exportId);

    pdfExport._projectId = props.projectId;
    pdfExport._format = props.format || new ExportFormat('pdf');
    pdfExport._title = props.title || 'Untitled Export';
    pdfExport._content = props.content || '';
    pdfExport._options = props.options || new ExportOptions({});
    pdfExport._status = new ExportStatus('pending');
    pdfExport._createdAt = new Date();

    // 添加领域事件
    pdfExport.addDomainEvent(
      new ExportCreatedEvent({
        exportId: exportId.value,
        projectId: props.projectId,
        format: pdfExport._format.value,
        title: pdfExport._title
      })
    );

    return pdfExport;
  }

  // 开始处理
  startProcessing() {
    if (!this._status.isPending()) {
      throw new Error('Export can only be started when status is PENDING');
    }

    this._status = new ExportStatus('processing');
    this._startedAt = new Date();

    this.addDomainEvent(
      new ExportStartedEvent({
        exportId: this.id.value,
        projectId: this._projectId,
        startedAt: this._startedAt
      })
    );
  }

  // 完成导出
  complete(filePath, fileSize) {
    if (!this._status.isProcessing()) {
      throw new Error('Export can only be completed when status is PROCESSING');
    }

    this._status = new ExportStatus('completed');
    this._filePath = filePath;
    this._fileSize = fileSize || 0;
    this._completedAt = new Date();
    this._error = null;

    this.addDomainEvent(
      new ExportCompletedEvent({
        exportId: this.id.value,
        projectId: this._projectId,
        filePath: this._filePath,
        fileSize: this._fileSize,
        completedAt: this._completedAt
      })
    );
  }

  // 失败处理
  fail(error) {
    this._status = new ExportStatus('failed');
    this._error = error.message || error.toString();
    this._completedAt = new Date();

    this.addDomainEvent(
      new ExportFailedEvent({
        exportId: this.id.value,
        projectId: this._projectId,
        error: this._error,
        failedAt: this._completedAt
      })
    );
  }

  // 获取导出信息
  getExportInfo() {
    return {
      id: this.id.value,
      projectId: this._projectId,
      format: this._format.value,
      title: this._title,
      status: this._status.value,
      filePath: this._filePath,
      fileSize: this._fileSize,
      createdAt: this._createdAt,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      error: this._error
    };
  }

  // 属性访问器
  get projectId() {
    return this._projectId;
  }
  get format() {
    return this._format;
  }
  get title() {
    return this._title;
  }
  get content() {
    return this._content;
  }
  get options() {
    return this._options;
  }
  get status() {
    return this._status;
  }
  get filePath() {
    return this._filePath;
  }
  get fileSize() {
    return this._fileSize;
  }
  get startedAt() {
    return this._startedAt;
  }
  get completedAt() {
    return this._completedAt;
  }
  get error() {
    return this._error;
  }

  // 状态检查方法
  isPending() {
    return this._status.isPending();
  }
  isProcessing() {
    return this._status.isProcessing();
  }
  isCompleted() {
    return this._status.isCompleted();
  }
  isFailed() {
    return this._status.isFailed();
  }
}
