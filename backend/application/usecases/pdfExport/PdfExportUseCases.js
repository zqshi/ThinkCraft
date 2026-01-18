import fs from 'fs';
import { DomainEvent } from '../../../domains/shared/events/DomainEvent.js';
import { EVENT_TYPES } from '../../../domains/shared/events/EventTypes.js';

export class PdfExportUseCases {
  constructor({ pdfExportService, eventBus }) {
    this.pdfExportService = pdfExportService;
    this.eventBus = eventBus;
  }

  async exportPdf({ title, chapters }) {
    if (!title || !chapters || !Array.isArray(chapters)) {
      return {
        success: false,
        error: '缺少必要参数: title和chapters'
      };
    }

    const result = await this.pdfExportService.exportToPDF(title, chapters);

    this.eventBus.publish(new DomainEvent(EVENT_TYPES.PDF_EXPORTED, {
      filename: result.filename
    }));

    return {
      success: true,
      data: {
        filename: result.filename,
        downloadUrl: `/api/pdf/download/${result.filename}`
      }
    };
  }

  getDownloadPath({ filename }) {
    const filepath = `./temp/${filename}`;

    if (!fs.existsSync(filepath)) {
      return {
        success: false,
        error: 'PDF文件不存在'
      };
    }

    return {
      success: true,
      path: filepath
    };
  }

  cleanupFile({ filepath }) {
    setTimeout(() => {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }, 1000);
  }
}

export default PdfExportUseCases;
