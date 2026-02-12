import { pdfGenerationHtmlBaseMethods } from './pdf-generation-domain-html-base.js';
import { pdfGenerationHtmlReportMethods } from './pdf-generation-domain-html-report.js';
import { pdfGenerationHtmlBusinessMethods } from './pdf-generation-domain-html-business.js';

export const pdfGenerationHtmlDomainMethods = Object.assign({},
  pdfGenerationHtmlBaseMethods,
  pdfGenerationHtmlReportMethods,
  pdfGenerationHtmlBusinessMethods
);
