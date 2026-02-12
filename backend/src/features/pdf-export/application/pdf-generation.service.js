/**
 * PDF生成服务
 * 处理PDF文件的生成
 */

import { pdfGenerationDomainMethods } from './pdf-generation/domain/pdf-generation-domain.js';
import { pdfGenerationApplicationMethods } from './pdf-generation/application/pdf-generation-application.js';
import { pdfGenerationInfrastructureMethods } from './pdf-generation/infrastructure/pdf-generation-infrastructure.js';

class PdfGenerationService {
  constructor() {
    this.tempDir = '/tmp/exports';
    this.ensureTempDir();
  }

}

Object.assign(PdfGenerationService.prototype,
  pdfGenerationDomainMethods,
  pdfGenerationApplicationMethods,
  pdfGenerationInfrastructureMethods
);

export { PdfGenerationService };
