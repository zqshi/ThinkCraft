/**
 * PDFExport领域模块统一导出
 */

import { PDFExportService, pdfExportService } from './services/PDFExportService.js';
import { PdfExportRepository, pdfExportRepository } from './repositories/PdfExportRepository.js';

export { PDFExportService, pdfExportService };
export { PdfExportRepository, pdfExportRepository };
export default {
  service: pdfExportService,
  repository: pdfExportRepository
};
