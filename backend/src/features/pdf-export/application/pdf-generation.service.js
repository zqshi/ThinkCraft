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
   * 生成报告PDF（直接返回buffer，不保存文件）
   */
  async generateReportPDF(reportData, title = '创意分析报告') {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();

      // 构建报告HTML内容
      const htmlContent = this.buildReportHtmlContent(reportData, title);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // 生成PDF
      const pdfBuffer = await page.pdf({
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

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * 生成商业计划书/产品立项材料PDF
   */
  async generateBusinessPlanPDF(chapters, title = '商业计划书') {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      const htmlContent = this.buildBusinessPlanHtmlContent(chapters, title);
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
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

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  buildBusinessPlanHtmlContent(chapters, title) {
    const escapeHtml = value => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const formatContent = value => escapeHtml(value).replace(/\n/g, '<br>');

    const chapterHtml = chapters.map((chapter, index) => `
      <div class="chapter">
        <h1>${escapeHtml(chapter.title || `章节 ${index + 1}`)}</h1>
        <div class="chapter-meta">
          ${chapter.agent ? `<span>作者：${escapeHtml(chapter.agent)}</span>` : ''}
        </div>
        <div class="chapter-content">
          ${formatContent(chapter.content || '')}
        </div>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: 'PingFang SC', 'Microsoft YaHei', 'Arial', sans-serif; line-height: 1.8; color: #111; }
    h1 { font-size: 20px; margin: 24px 0 12px; }
    .title { font-size: 28px; font-weight: 700; margin-bottom: 12px; }
    .subtitle { font-size: 14px; color: #666; margin-bottom: 24px; }
    .chapter { page-break-after: always; }
    .chapter:last-child { page-break-after: auto; }
    .chapter-meta { font-size: 12px; color: #666; margin-bottom: 12px; }
    .chapter-content { font-size: 14px; }
  </style>
</head>
<body>
  <div class="title">${escapeHtml(title)}</div>
  <div class="subtitle">生成时间：${new Date().toLocaleDateString()}</div>
  ${chapterHtml}
</body>
</html>
`;
  }

  /**
   * 构建报告HTML内容
   */
  buildReportHtmlContent(reportData, title) {
    const chapters = reportData.chapters || {};

    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body {
            font-family: 'PingFang SC', 'Microsoft YaHei', 'Arial', sans-serif;
            line-height: 1.8;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .cover {
            text-align: center;
            padding: 100px 40px;
            page-break-after: always;
        }
        .cover h1 {
            font-size: 36px;
            color: #2c3e50;
            margin-bottom: 30px;
        }
        .cover .meta {
            font-size: 16px;
            color: #7f8c8d;
            margin: 10px 0;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-top: 40px;
            font-size: 28px;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
            font-size: 22px;
        }
        h3 {
            color: #555;
            margin-top: 20px;
            font-size: 18px;
        }
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        li {
            margin: 8px 0;
        }
        .chapter {
            page-break-before: always;
            padding-top: 20px;
        }
        .summary-box {
            background: #f8f9fa;
            border-left: 4px solid #3498db;
            padding: 15px 20px;
            margin: 20px 0;
        }
        .summary-box h3 {
            margin-top: 0;
            color: #3498db;
        }
        .stage-item {
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        .stage-item h4 {
            color: #3498db;
            margin-top: 0;
        }
        .question-item {
            background: #fff;
            border-left: 3px solid #e74c3c;
            padding: 12px 15px;
            margin: 12px 0;
        }
        .action-list {
            background: #e8f5e9;
            border-radius: 4px;
            padding: 15px 20px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <!-- 封面 -->
    <div class="cover">
        <h1>${title}</h1>
        <div class="meta">生成时间：${new Date().toLocaleString('zh-CN')}</div>
        ${reportData.coreDefinition ? `<div class="meta" style="margin-top: 40px; font-size: 18px; color: #2c3e50;">${reportData.coreDefinition}</div>` : ''}
    </div>

    <!-- 核心概要 -->
    ${reportData.initialIdea || reportData.problem || reportData.solution ? `
    <div class="summary-box">
        <h3>核心概要</h3>
        ${reportData.initialIdea ? `<p><strong>初始创意：</strong>${reportData.initialIdea}</p>` : ''}
        ${reportData.problem ? `<p><strong>解决问题：</strong>${reportData.problem}</p>` : ''}
        ${reportData.solution ? `<p><strong>独特价值：</strong>${reportData.solution}</p>` : ''}
        ${reportData.targetUser ? `<p><strong>目标用户：</strong>${reportData.targetUser}</p>` : ''}
    </div>
    ` : ''}
`;

    // 第1章：创意定义与演化
    if (chapters.chapter1) {
      const ch1 = chapters.chapter1;
      html += `
    <div class="chapter">
        <h1>${ch1.title || '创意定义与演化'}</h1>
        ${ch1.originalIdea ? `
        <h2>原始创意</h2>
        <p>${ch1.originalIdea}</p>
        ` : ''}
        ${ch1.evolution ? `
        <h2>演化过程</h2>
        <p>${ch1.evolution}</p>
        ` : ''}
    </div>
`;
    }

    // 第2章：核心洞察与根本假设
    if (chapters.chapter2) {
      const ch2 = chapters.chapter2;
      html += `
    <div class="chapter">
        <h1>${ch2.title || '核心洞察与根本假设'}</h1>
        ${ch2.surfaceNeed ? `
        <h2>表层需求</h2>
        <p>${ch2.surfaceNeed}</p>
        ` : ''}
        ${ch2.deepMotivation ? `
        <h2>深层动力</h2>
        <p>${ch2.deepMotivation}</p>
        ` : ''}
        ${ch2.assumptions && ch2.assumptions.length > 0 ? `
        <h2>根本假设</h2>
        <ul>
            ${ch2.assumptions.map(a => `<li>${a}</li>`).join('')}
        </ul>
        ` : ''}
    </div>
`;
    }

    // 第3章：边界条件与应用场景
    if (chapters.chapter3) {
      const ch3 = chapters.chapter3;
      html += `
    <div class="chapter">
        <h1>${ch3.title || '边界条件与应用场景'}</h1>
        ${ch3.idealScenario ? `
        <h2>理想应用场景</h2>
        <p>${ch3.idealScenario}</p>
        ` : ''}
        ${ch3.limitations && ch3.limitations.length > 0 ? `
        <h2>限制条件</h2>
        <ul>
            ${ch3.limitations.map(l => `<li>${l}</li>`).join('')}
        </ul>
        ` : ''}
        ${ch3.prerequisites ? `
        <h2>前置要求</h2>
        ${ch3.prerequisites.technical ? `<p><strong>技术基础：</strong>${ch3.prerequisites.technical}</p>` : ''}
        ${ch3.prerequisites.resources ? `<p><strong>资源要求：</strong>${ch3.prerequisites.resources}</p>` : ''}
        ${ch3.prerequisites.partnerships ? `<p><strong>合作基础：</strong>${ch3.prerequisites.partnerships}</p>` : ''}
        ` : ''}
    </div>
`;
    }

    // 第4章：可行性分析与关键挑战
    if (chapters.chapter4) {
      const ch4 = chapters.chapter4;
      html += `
    <div class="chapter">
        <h1>${ch4.title || '可行性分析与关键挑战'}</h1>
        ${ch4.stages && ch4.stages.length > 0 ? `
        <h2>实施阶段</h2>
        ${ch4.stages.map(stage => `
        <div class="stage-item">
            <h4>${stage.stage || '阶段'}</h4>
            ${stage.goal ? `<p><strong>目标：</strong>${stage.goal}</p>` : ''}
            ${stage.tasks ? `<p><strong>关键任务：</strong>${stage.tasks}</p>` : ''}
        </div>
        `).join('')}
        ` : ''}
        ${ch4.biggestRisk ? `
        <h2>最大风险</h2>
        <p>${ch4.biggestRisk}</p>
        ` : ''}
        ${ch4.mitigation ? `
        <h2>预防措施</h2>
        <p>${ch4.mitigation}</p>
        ` : ''}
    </div>
`;
    }

    // 第5章：思维盲点与待探索问题
    if (chapters.chapter5) {
      const ch5 = chapters.chapter5;
      html += `
    <div class="chapter">
        <h1>${ch5.title || '思维盲点与待探索问题'}</h1>
        ${ch5.blindSpots && ch5.blindSpots.length > 0 ? `
        <h2>思维盲点</h2>
        <ul>
            ${ch5.blindSpots.map(b => `<li>${b}</li>`).join('')}
        </ul>
        ` : ''}
        ${ch5.keyQuestions && ch5.keyQuestions.length > 0 ? `
        <h2>关键问题</h2>
        ${ch5.keyQuestions.map(q => `
        <div class="question-item">
            ${q.category ? `<strong>${q.category}：</strong>` : ''}
            ${q.question ? `<p>${q.question}</p>` : ''}
            ${q.validation ? `<p style="color: #7f8c8d; font-size: 14px;">验证方法：${q.validation}</p>` : ''}
            ${q.why ? `<p style="color: #7f8c8d; font-size: 14px;">为什么重要：${q.why}</p>` : ''}
        </div>
        `).join('')}
        ` : ''}
    </div>
`;
    }

    // 第6章：下一步行动建议
    if (chapters.chapter6) {
      const ch6 = chapters.chapter6;
      html += `
    <div class="chapter">
        <h1>${ch6.title || '下一步行动建议'}</h1>
        ${ch6.immediateActions && ch6.immediateActions.length > 0 ? `
        <div class="action-list">
            <h2>立即行动</h2>
            <ol>
                ${ch6.immediateActions.map(a => `<li>${a}</li>`).join('')}
            </ol>
        </div>
        ` : ''}
        ${ch6.validationMethods && ch6.validationMethods.length > 0 ? `
        <h2>验证方法</h2>
        <ul>
            ${ch6.validationMethods.map(v => `<li>${v}</li>`).join('')}
        </ul>
        ` : ''}
        ${ch6.successMetrics && ch6.successMetrics.length > 0 ? `
        <h2>成功指标</h2>
        <ul>
            ${ch6.successMetrics.map(m => `<li>${m}</li>`).join('')}
        </ul>
        ` : ''}
    </div>
`;
    }

    html += `
</body>
</html>
`;

    return html;
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
