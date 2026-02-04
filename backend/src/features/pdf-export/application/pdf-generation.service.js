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

    const normalizeMarkdownForPdfHtml = value => {
      if (!value) return '';
      const lines = String(value).split(/\r?\n/);
      const normalized = lines.map(line => {
        if (line.includes('|') || line.includes('\t')) {
          return line; // keep table-like lines intact
        }
        let text = line;
        text = text.replace(/\s*(#{1,6})\s+/g, '\n$1 ');
        text = text.replace(/\s*(\d+[\.\、])\s+/g, '\n$1 ');
        text = text.replace(/\s*([一二三四五六七八九十]+、)\s+/g, '\n$1 ');
        text = text.replace(/\s*(第[一二三四五六七八九十]+[章节篇部分])\s*/g, '\n$1 ');
        text = text.replace(/\s*(行动建议\s*\d+[\.\、]?)\s*/g, '\n$1 ');
        text = text.replace(/\s*(关键结论\s*\d+[\.\、]?)\s*/g, '\n$1 ');
        text = text.replace(/\s*([*-])\s+/g, '\n- ');
        text = text.replace(/([。！？；:：\?])\s*(#{1,6}\s+)/g, '$1\n$2');
        text = text.replace(/([。！？；:：\?])\s*(\d+[\.\、])/g, '$1\n$2');
        text = text.replace(/([。！？；:：\?])\s*([一二三四五六七八九十]+、)/g, '$1\n$2');
        text = text.replace(/([。！？；:：\?])\s*(第[一二三四五六七八九十]+[章节篇部分])/g, '$1\n$2');
        text = text.replace(/([。！？；:：\?])\s*(行动建议\s*\d+[\.\、])/g, '$1\n$2');
        text = text.replace(/([。！？；:：\?])\s*(关键结论\s*\d+[\.\、])/g, '$1\n$2');
        return text;
      });
      return normalized.join('\n');
    };

    const renderInline = (value) => {
      let text = String(value || '');
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
      return text;
    };

    const renderMarkdown = (value) => {
      const raw = String(value || '');
      if (!raw) return '';
      const normalized = normalizeMarkdownForPdfHtml(raw);
      const escaped = escapeHtml(normalized);
      const segments = escaped.split(/```/g);
      const htmlParts = segments.map((segment, idx) => {
        if (idx % 2 === 1) {
          return `<pre><code>${segment}</code></pre>`;
        }
        const lines = segment.split(/\r?\n/);
        const out = [];
        let listType = null;
        let paragraph = [];

        const flushParagraph = () => {
          if (paragraph.length) {
            out.push(`<p>${renderInline(paragraph.join('<br>'))}</p>`);
            paragraph = [];
          }
        };
        const closeList = () => {
          if (listType) {
            out.push(listType === 'ol' ? '</ol>' : '</ul>');
            listType = null;
          }
        };

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) {
            flushParagraph();
            closeList();
            return;
          }

          const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
          if (headingMatch) {
            flushParagraph();
            closeList();
            const level = headingMatch[1].length;
            out.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
            return;
          }

          const listMatch = trimmed.match(/^(\d+\.)\s+(.+)$/) || trimmed.match(/^[-*+]\s+(.+)$/);
          if (listMatch) {
            flushParagraph();
            const isOrdered = /\d+\./.test(listMatch[1]);
            const targetType = isOrdered ? 'ol' : 'ul';
            if (listType !== targetType) {
              closeList();
              out.push(isOrdered ? '<ol>' : '<ul>');
              listType = targetType;
            }
            const content = isOrdered ? listMatch[2] : listMatch[1];
            out.push(`<li>${renderInline(content)}</li>`);
            return;
          }

          const quoteMatch = trimmed.match(/^>\s+(.+)$/);
          if (quoteMatch) {
            flushParagraph();
            closeList();
            out.push(`<blockquote>${renderInline(quoteMatch[1])}</blockquote>`);
            return;
          }

          paragraph.push(trimmed);
        });

        flushParagraph();
        closeList();
        return out.join('');
      });
      return htmlParts.join('');
    };

    const chapterHtml = chapters.map((chapter, index) => `
      <div class="chapter">
        <h1>${renderInline(escapeHtml(chapter.title || `章节 ${index + 1}`))}</h1>
        <div class="chapter-meta">
          ${chapter.agent ? `<span>作者：${escapeHtml(chapter.agent)}</span>` : ''}
        </div>
        <div class="chapter-content">
          ${renderMarkdown(chapter.content || '')}
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

  normalizeMarkdownForPdfText(markdown) {
    if (!markdown) return '';
    const lines = String(markdown).split(/\r?\n/);
    const output = [];
    let inCode = false;

    const isSeparatorLine = line => {
      const normalized = line.replace(/\t/g, '|').replace(/\s+/g, '');
      if (!normalized.includes('-')) return false;
      return /^\|?[:\-|]+\|?$/.test(normalized);
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (line.trim().startsWith('```')) {
        inCode = !inCode;
        continue;
      }
      if (inCode) {
        output.push(line);
        continue;
      }

      if (isSeparatorLine(line)) {
        continue;
      }

      let text = line;
      if (/\t/.test(text) && !/\|/.test(text)) {
        const cells = text.split('\t').map(cell => cell.trim()).filter(Boolean);
        if (cells.length) {
          output.push(cells.join(' | '));
          continue;
        }
      }

      if (/\|/.test(text)) {
        const cells = text
          .split('|')
          .map(cell => cell.trim())
          .filter(Boolean);
        if (cells.length > 1) {
          output.push(cells.join(' | '));
          continue;
        }
      }

      text = text.replace(/^(#{1,6})\s+/g, '');
      text = text.replace(/^>\s+/g, '');
      text = text.replace(/^[-*+]\s+/g, '- ');
      text = text.replace(/^\d+\.\s+/g, match => match.trim() + ' ');
      text = text.replace(/\*\*(.+?)\*\*/g, '$1');
      text = text.replace(/__(.+?)__/g, '$1');
      text = text.replace(/\*(.+?)\*/g, '$1');
      text = text.replace(/_(.+?)_/g, '$1');
      text = text.replace(/`([^`]+)`/g, '$1');

      output.push(text);
    }

    return output.join('\n').trim();
  }

  /**
   * 构建报告HTML内容
   */
  buildReportHtmlContent(reportData, title) {
    const chapters = reportData.chapters || {};
    const escapeHtml = value => String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const renderInline = (value) => {
      let text = String(value || '');
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
      return text;
    };
    const renderMarkdown = (value) => {
      const raw = String(value || '');
      if (!raw) return '';
      const escaped = escapeHtml(raw);
      const segments = escaped.split(/```/g);
      const htmlParts = segments.map((segment, idx) => {
        if (idx % 2 === 1) {
          return `<pre><code>${segment}</code></pre>`;
        }
        const lines = segment.split(/\r?\n/);
        const out = [];
        let listType = null;
        let paragraph = [];

        const flushParagraph = () => {
          if (paragraph.length) {
            out.push(`<p>${renderInline(paragraph.join('<br>'))}</p>`);
            paragraph = [];
          }
        };
        const closeList = () => {
          if (listType) {
            out.push(listType === 'ol' ? '</ol>' : '</ul>');
            listType = null;
          }
        };

        lines.forEach(line => {
          const trimmed = line.trim();
          if (!trimmed) {
            flushParagraph();
            closeList();
            return;
          }

          const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
          if (headingMatch) {
            flushParagraph();
            closeList();
            const level = headingMatch[1].length;
            out.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
            return;
          }

          const listMatch = trimmed.match(/^(\d+\.)\s+(.+)$/) || trimmed.match(/^[-*+]\s+(.+)$/);
          if (listMatch) {
            flushParagraph();
            const isOrdered = /\d+\./.test(listMatch[1]);
            const targetType = isOrdered ? 'ol' : 'ul';
            if (listType !== targetType) {
              closeList();
              out.push(isOrdered ? '<ol>' : '<ul>');
              listType = targetType;
            }
            const content = isOrdered ? listMatch[2] : listMatch[1];
            out.push(`<li>${renderInline(content)}</li>`);
            return;
          }

          const quoteMatch = trimmed.match(/^>\s+(.+)$/);
          if (quoteMatch) {
            flushParagraph();
            closeList();
            out.push(`<blockquote>${renderInline(quoteMatch[1])}</blockquote>`);
            return;
          }

          paragraph.push(trimmed);
        });

        flushParagraph();
        closeList();
        return out.join('');
      });
      return htmlParts.join('');
    };
    const getChapterFallbackContent = (chapter) => {
      if (!chapter) return '';
      if (typeof chapter === 'string') return chapter;
      if (typeof chapter.content === 'string') return chapter.content;
      return '';
    };

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
        ${reportData.coreDefinition ? `<div class="meta" style="margin-top: 40px; font-size: 18px; color: #2c3e50;">${renderMarkdown(reportData.coreDefinition)}</div>` : ''}
    </div>

    <!-- 核心概要 -->
    ${reportData.initialIdea || reportData.problem || reportData.solution ? `
    <div class="summary-box">
        <h3>核心概要</h3>
        ${reportData.initialIdea ? `<p><strong>初始创意：</strong>${renderMarkdown(reportData.initialIdea)}</p>` : ''}
        ${reportData.problem ? `<p><strong>解决问题：</strong>${renderMarkdown(reportData.problem)}</p>` : ''}
        ${reportData.solution ? `<p><strong>独特价值：</strong>${renderMarkdown(reportData.solution)}</p>` : ''}
        ${reportData.targetUser ? `<p><strong>目标用户：</strong>${renderMarkdown(reportData.targetUser)}</p>` : ''}
    </div>
    ` : ''}
`;

    // 第1章：创意定义与演化
    if (chapters.chapter1) {
      const ch1 = chapters.chapter1;
      let hasContent = false;
      html += `
    <div class="chapter">
        <h1>${renderInline(escapeHtml(ch1.title || '创意定义与演化'))}</h1>
        ${ch1.originalIdea ? `
        <h2>原始创意</h2>
        ${renderMarkdown(ch1.originalIdea)}
        ` : ''}
        ${ch1.evolution ? `
        <h2>演化过程</h2>
        ${renderMarkdown(ch1.evolution)}
        ` : ''}
        ${(() => {
          if (ch1.originalIdea || ch1.evolution) {
            hasContent = true;
          }
          const fallback = getChapterFallbackContent(ch1);
          if (!hasContent && fallback) {
            hasContent = true;
            return renderMarkdown(fallback);
          }
          return '';
        })()}
    </div>
`;
    }

    // 第2章：核心洞察与根本假设
    if (chapters.chapter2) {
      const ch2 = chapters.chapter2;
      let hasContent = false;
      html += `
    <div class="chapter">
        <h1>${renderInline(escapeHtml(ch2.title || '核心洞察与根本假设'))}</h1>
        ${ch2.surfaceNeed ? `
        <h2>表层需求</h2>
        ${renderMarkdown(ch2.surfaceNeed)}
        ` : ''}
        ${ch2.deepMotivation ? `
        <h2>深层动力</h2>
        ${renderMarkdown(ch2.deepMotivation)}
        ` : ''}
        ${ch2.assumptions && ch2.assumptions.length > 0 ? `
        <h2>根本假设</h2>
        <ul>
            ${ch2.assumptions.map(a => `<li>${renderInline(escapeHtml(a))}</li>`).join('')}
        </ul>
        ` : ''}
        ${(() => {
          if (ch2.surfaceNeed || ch2.deepMotivation || (ch2.assumptions && ch2.assumptions.length > 0)) {
            hasContent = true;
          }
          const fallback = getChapterFallbackContent(ch2);
          if (!hasContent && fallback) {
            hasContent = true;
            return renderMarkdown(fallback);
          }
          return '';
        })()}
    </div>
`;
    }

    // 第3章：边界条件与应用场景
    if (chapters.chapter3) {
      const ch3 = chapters.chapter3;
      let hasContent = false;
      html += `
    <div class="chapter">
        <h1>${renderInline(escapeHtml(ch3.title || '边界条件与应用场景'))}</h1>
        ${ch3.idealScenario ? `
        <h2>理想应用场景</h2>
        ${renderMarkdown(ch3.idealScenario)}
        ` : ''}
        ${ch3.limitations && ch3.limitations.length > 0 ? `
        <h2>限制条件</h2>
        <ul>
            ${ch3.limitations.map(l => `<li>${renderInline(escapeHtml(l))}</li>`).join('')}
        </ul>
        ` : ''}
        ${ch3.prerequisites ? `
        <h2>前置要求</h2>
        ${ch3.prerequisites.technical ? `<p><strong>技术基础：</strong>${renderMarkdown(ch3.prerequisites.technical)}</p>` : ''}
        ${ch3.prerequisites.resources ? `<p><strong>资源要求：</strong>${renderMarkdown(ch3.prerequisites.resources)}</p>` : ''}
        ${ch3.prerequisites.partnerships ? `<p><strong>合作基础：</strong>${renderMarkdown(ch3.prerequisites.partnerships)}</p>` : ''}
        ` : ''}
        ${(() => {
          if (ch3.idealScenario || (ch3.limitations && ch3.limitations.length > 0) || ch3.prerequisites) {
            hasContent = true;
          }
          const fallback = getChapterFallbackContent(ch3);
          if (!hasContent && fallback) {
            hasContent = true;
            return renderMarkdown(fallback);
          }
          return '';
        })()}
    </div>
`;
    }

    // 第4章：可行性分析与关键挑战
    if (chapters.chapter4) {
      const ch4 = chapters.chapter4;
      let hasContent = false;
      html += `
    <div class="chapter">
        <h1>${renderInline(escapeHtml(ch4.title || '可行性分析与关键挑战'))}</h1>
        ${ch4.stages && ch4.stages.length > 0 ? `
        <h2>实施阶段</h2>
        ${ch4.stages.map(stage => `
        <div class="stage-item">
            <h4>${renderInline(escapeHtml(stage.stage || '阶段'))}</h4>
            ${stage.goal ? `<p><strong>目标：</strong>${renderMarkdown(stage.goal)}</p>` : ''}
            ${stage.tasks ? `<p><strong>关键任务：</strong>${renderMarkdown(stage.tasks)}</p>` : ''}
        </div>
        `).join('')}
        ` : ''}
        ${ch4.biggestRisk ? `
        <h2>最大风险</h2>
        ${renderMarkdown(ch4.biggestRisk)}
        ` : ''}
        ${ch4.mitigation ? `
        <h2>预防措施</h2>
        ${renderMarkdown(ch4.mitigation)}
        ` : ''}
        ${(() => {
          if ((ch4.stages && ch4.stages.length > 0) || ch4.biggestRisk || ch4.mitigation) {
            hasContent = true;
          }
          const fallback = getChapterFallbackContent(ch4);
          if (!hasContent && fallback) {
            hasContent = true;
            return renderMarkdown(fallback);
          }
          return '';
        })()}
    </div>
`;
    }

    // 第5章：思维盲点与待探索问题
    if (chapters.chapter5) {
      const ch5 = chapters.chapter5;
      let hasContent = false;
      html += `
    <div class="chapter">
        <h1>${renderInline(escapeHtml(ch5.title || '思维盲点与待探索问题'))}</h1>
        ${ch5.blindSpots && ch5.blindSpots.length > 0 ? `
        <h2>思维盲点</h2>
        <ul>
            ${ch5.blindSpots.map(b => `<li>${renderInline(escapeHtml(b))}</li>`).join('')}
        </ul>
        ` : ''}
        ${ch5.keyQuestions && ch5.keyQuestions.length > 0 ? `
        <h2>关键问题</h2>
        ${ch5.keyQuestions.map(q => `
        <div class="question-item">
            ${q.category ? `<strong>${renderInline(escapeHtml(q.category))}：</strong>` : ''}
            ${q.question ? `<p>${renderMarkdown(q.question)}</p>` : ''}
            ${q.validation ? `<p style="color: #7f8c8d; font-size: 14px;">验证方法：${renderMarkdown(q.validation)}</p>` : ''}
            ${q.why ? `<p style="color: #7f8c8d; font-size: 14px;">为什么重要：${renderMarkdown(q.why)}</p>` : ''}
        </div>
        `).join('')}
        ` : ''}
        ${(() => {
          if ((ch5.blindSpots && ch5.blindSpots.length > 0) || (ch5.keyQuestions && ch5.keyQuestions.length > 0)) {
            hasContent = true;
          }
          const fallback = getChapterFallbackContent(ch5);
          if (!hasContent && fallback) {
            hasContent = true;
            return renderMarkdown(fallback);
          }
          return '';
        })()}
    </div>
`;
    }

    // 第6章：下一步行动建议
    if (chapters.chapter6) {
      const ch6 = chapters.chapter6;
      let hasContent = false;
      html += `
    <div class="chapter">
        <h1>${renderInline(escapeHtml(ch6.title || '下一步行动建议'))}</h1>
        ${ch6.immediateActions && ch6.immediateActions.length > 0 ? `
        <div class="action-list">
            <h2>立即行动</h2>
            <ol>
                ${ch6.immediateActions.map(a => `<li>${renderInline(escapeHtml(a))}</li>`).join('')}
            </ol>
        </div>
        ` : ''}
        ${ch6.validationMethods && ch6.validationMethods.length > 0 ? `
        <h2>验证方法</h2>
        <ul>
            ${ch6.validationMethods.map(v => `<li>${renderInline(escapeHtml(v))}</li>`).join('')}
        </ul>
        ` : ''}
        ${ch6.successMetrics && ch6.successMetrics.length > 0 ? `
        <h2>成功指标</h2>
        <ul>
            ${ch6.successMetrics.map(m => `<li>${renderInline(escapeHtml(m))}</li>`).join('')}
        </ul>
        ` : ''}
        ${(() => {
          if ((ch6.immediateActions && ch6.immediateActions.length > 0) ||
              (ch6.validationMethods && ch6.validationMethods.length > 0) ||
              (ch6.successMetrics && ch6.successMetrics.length > 0)) {
            hasContent = true;
          }
          const fallback = getChapterFallbackContent(ch6);
          if (!hasContent && fallback) {
            hasContent = true;
            return renderMarkdown(fallback);
          }
          return '';
        })()}
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
