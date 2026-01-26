import { DomainEvent } from '../../../../shared/domain/domain-event.base.js';

/**
 * PDF导出创建事件
 */
export class PdfExportCreatedEvent extends DomainEvent {
  constructor(pdfExportId, exportType, userId) {
    super();
    this.pdfExportId = pdfExportId;
    this.exportType = exportType;
    this.userId = userId;
    this.occurredOn = new Date();
  }

  getEventName() {
    return 'pdf-export.created';
  }

  getAggregateId() {
    return this.pdfExportId;
  }
}
