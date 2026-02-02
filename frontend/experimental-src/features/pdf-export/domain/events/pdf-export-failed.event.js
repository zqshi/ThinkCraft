import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

/**
 * PDF导出失败事件
 */
export class PdfExportFailedEvent extends DomainEvent {
  constructor(pdfExportId, errorCode, errorMessage) {
    super();
    this.pdfExportId = pdfExportId;
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.occurredOn = new Date();
  }

  getEventName() {
    return 'pdf-export.failed';
  }

  getAggregateId() {
    return this.pdfExportId;
  }
}
