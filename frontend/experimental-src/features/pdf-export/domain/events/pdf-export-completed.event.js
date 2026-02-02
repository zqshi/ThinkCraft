import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

/**
 * PDF导出完成事件
 */
export class PdfExportCompletedEvent extends DomainEvent {
  constructor(pdfExportId, fileUrl, fileSize) {
    super();
    this.pdfExportId = pdfExportId;
    this.fileUrl = fileUrl;
    this.fileSize = fileSize;
    this.occurredOn = new Date();
  }

  getEventName() {
    return 'pdf-export.completed';
  }

  getAggregateId() {
    return this.pdfExportId;
  }
}
