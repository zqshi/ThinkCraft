import { pdfGenerationHtmlDomainMethods } from './pdf-generation-domain-html.js';
import { pdfGenerationOptionDomainMethods } from './pdf-generation-domain-options.js';
import { pdfGenerationNormalizeDomainMethods } from './pdf-generation-domain-normalize.js';

export const pdfGenerationDomainMethods = Object.assign({},
  pdfGenerationHtmlDomainMethods,
  pdfGenerationOptionDomainMethods,
  pdfGenerationNormalizeDomainMethods
);
