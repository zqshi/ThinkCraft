import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

export const pdfGenerationApplicationMethods = {
  async generateReportPDF(reportData, title = '创意分析报告') {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
      const page = await browser.newPage();
      const htmlContent = this.buildReportHtmlContent(reportData, title);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      return await page.pdf({
        format: 'A4',
        landscape: false,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '20mm',
          right: '20mm'
        },
        printBackground: true,
        displayHeaderFooter: false
      });
    } finally {
      await browser.close();
    }
  },

  async generateBusinessPlanPDF(chapters, title = '商业计划书') {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
      const page = await browser.newPage();
      const htmlContent = this.buildBusinessPlanHtmlContent(chapters, title);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      return await page.pdf({
        format: 'A4',
        landscape: false,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '20mm',
          right: '20mm'
        },
        printBackground: true,
        displayHeaderFooter: false
      });
    } finally {
      await browser.close();
    }
  },

  async generatePdf(exportEntity) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
      const page = await browser.newPage();
      const htmlContent = this.buildHtmlContent(exportEntity);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf(this.buildPdfOptions(exportEntity));

      const fileName = `${exportEntity.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const exportDir = path.join(this.tempDir, exportEntity.id.value);
      await fs.mkdir(exportDir, { recursive: true });
      const filePath = path.join(exportDir, fileName);
      await fs.writeFile(filePath, pdfBuffer);

      return { filePath, fileSize: pdfBuffer.length };
    } finally {
      await browser.close();
    }
  },

  async generatePdfWithCover(exportEntity, coverData) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
      const pages = [];
      if (coverData) {
        pages.push(await this.generateCoverPage(coverData));
      }
      pages.push(this.buildHtmlContent(exportEntity));
      const combinedHtml = pages.join('<div class="page-break"></div>');

      const page = await browser.newPage();
      await page.setContent(combinedHtml, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf(this.buildPdfOptions(exportEntity));

      const fileName = `${exportEntity.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const exportDir = path.join(this.tempDir, exportEntity.id.value);
      await fs.mkdir(exportDir, { recursive: true });
      const filePath = path.join(exportDir, fileName);
      await fs.writeFile(filePath, pdfBuffer);

      return { filePath, fileSize: pdfBuffer.length };
    } finally {
      await browser.close();
    }
  },

  async generateCoverPage(coverData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: Arial, sans-serif; }
          .cover { text-align: center; color: white; padding: 40px; }
          .title { font-size: 48px; margin-bottom: 20px; font-weight: bold; }
          .subtitle { font-size: 24px; margin-bottom: 40px; opacity: 0.9; }
          .info { font-size: 18px; opacity: 0.8; }
          .date { margin-top: 60px; font-size: 16px; opacity: 0.7; }
        </style>
      </head>
      <body>
        <div class="cover">
          <h1 class="title">${coverData.title || 'Export Document'}</h1>
          <p class="subtitle">${coverData.subtitle || ''}</p>
          <p class="info">${coverData.description || ''}</p>
          <p class="date">${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
  }
};
