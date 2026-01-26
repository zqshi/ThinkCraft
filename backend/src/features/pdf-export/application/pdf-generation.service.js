/**
 * PDF生成服务
 * 处理PDF文件的生成
 */
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

export class PdfGenerationService {
  constructor() {
    this.tempDir = '/tmp/exports';
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  /**
   * 生成PDF文件
   */
  async generatePdf(exportEntity) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();

      // 设置页面内容
      const htmlContent = this.buildHtmlContent(exportEntity);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // 设置PDF选项
      const pdfOptions = this.buildPdfOptions(exportEntity);

      // 生成PDF
      const pdfBuffer = await page.pdf(pdfOptions);

      // 保存PDF文件
      const fileName = `${exportEntity.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const exportDir = path.join(this.tempDir, exportEntity.id.value);
      await fs.mkdir(exportDir, { recursive: true });
      const filePath = path.join(exportDir, fileName);

      await fs.writeFile(filePath, pdfBuffer);

      return {
        filePath,
        fileSize: pdfBuffer.length
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * 构建HTML内容
   */
  buildHtmlContent(exportEntity) {
    const options = exportEntity.options.value;
    const content = JSON.parse(exportEntity.content);

    let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${exportEntity.title}</title>
                <style>
                    body {
                        font-family: 'Arial', sans-serif;
                        line-height: 1.6;
                        color: #333;
                        margin: 0;
                        padding: 20px;
                    }
                    h1 {
                        color: #2c3e50;
                        border-bottom: 2px solid #3498db;
                        padding-bottom: 10px;
                    }
                    h2 {
                        color: #34495e;
                        margin-top: 30px;
                    }
                    p {
                        margin-bottom: 15px;
                        text-align: justify;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    .toc {
                        page-break-after: always;
                    }
                    .toc ul {
                        list-style: none;
                        padding-left: 0;
                    }
                    .toc li {
                        margin: 10px 0;
                        padding-left: 20px;
                    }
                    .toc a {
                        text-decoration: none;
                        color: #3498db;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 12px;
                        text-align: left;
                    }
                    th {
                        background-color: #f8f9fa;
                        font-weight: bold;
                    }
                    @media print {
                        .page-break {
                            page-break-before: always;
                        }
                    }
                </style>
            </head>
            <body>
        `;

    // 添加目录（如果启用）
    if (options.includeTableOfContents) {
      html += '<div class="toc"><h1>目录</h1><ul>';
      content.forEach((section, index) => {
        html += `<li><a href="#section-${index}">${section.title}</a></li>`;
      });
      html += '</ul></div>';
    }

    // 添加内容
    content.forEach((section, index) => {
      if (index > 0 && options.pageBreaks) {
        html += '<div class="page-break"></div>';
      }
      html += `<h1 id="section-${index}">${section.title}</h1>`;
      html += `<div>${section.content}</div>`;
    });

    html += '</body></html>';
    return html;
  }

  /**
   * 构建PDF选项
   */
  buildPdfOptions(exportEntity) {
    const options = exportEntity.options.value;
    const margins = options.margins;

    return {
      format: options.pageSize || 'A4',
      landscape: options.orientation === 'landscape',
      margin: {
        top: `${margins.top}mm`,
        bottom: `${margins.bottom}mm`,
        left: `${margins.left}mm`,
        right: `${margins.right}mm`
      },
      printBackground: true,
      displayHeaderFooter: false,
      headerTemplate: '',
      footerTemplate: ''
    };
  }

  /**
   * 生成带封面的PDF
   */
  async generatePdfWithCover(exportEntity, coverData) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const pages = [];

      // 生成封面
      if (coverData) {
        const coverPage = await this.generateCoverPage(coverData);
        pages.push(coverPage);
      }

      // 生成内容页
      const contentPage = this.buildHtmlContent(exportEntity);
      pages.push(contentPage);

      // 合并所有页面
      const combinedHtml = pages.join('<div class="page-break"></div>');

      const page = await browser.newPage();
      await page.setContent(combinedHtml, { waitUntil: 'networkidle0' });

      const pdfOptions = this.buildPdfOptions(exportEntity);
      const pdfBuffer = await page.pdf(pdfOptions);

      // 保存文件
      const fileName = `${exportEntity.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const exportDir = path.join(this.tempDir, exportEntity.id.value);
      await fs.mkdir(exportDir, { recursive: true });
      const filePath = path.join(exportDir, fileName);

      await fs.writeFile(filePath, pdfBuffer);

      return {
        filePath,
        fileSize: pdfBuffer.length
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * 生成封面页
   */
  async generateCoverPage(coverData) {
    return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        font-family: Arial, sans-serif;
                    }
                    .cover {
                        text-align: center;
                        color: white;
                        padding: 40px;
                    }
                    .title {
                        font-size: 48px;
                        margin-bottom: 20px;
                        font-weight: bold;
                    }
                    .subtitle {
                        font-size: 24px;
                        margin-bottom: 40px;
                        opacity: 0.9;
                    }
                    .info {
                        font-size: 18px;
                        opacity: 0.8;
                    }
                    .date {
                        margin-top: 60px;
                        font-size: 16px;
                        opacity: 0.7;
                    }
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

  /**
   * 清理临时文件
   */
  async cleanup(exportId) {
    try {
      const exportDir = path.join(this.tempDir, exportId);
      await fs.rm(exportDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup export directory:', error);
    }
  }
}

export default PdfGenerationService;
