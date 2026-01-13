/**
 * PDF导出服务（领域服务）
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMP_DIR = path.join(__dirname, '../../../temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export class PDFExportService {
  setupChineseFont(doc) {
    try {
      const fontPath = '/System/Library/Fonts/STHeiti Light.ttc';
      if (fs.existsSync(fontPath)) {
        doc.font(fontPath);
        return;
      }
    } catch (error) {
      console.warn('[PDF] 中文字体加载失败');
    }
    doc.font('Helvetica');
  }

  renderMarkdownContent(doc, content, yOffset = 100) {
    const lines = content.split('\n');
    let y = yOffset;
    const margin = 50;
    const maxWidth = doc.page.width - 2 * margin;

    lines.forEach(line => {
      if (y > doc.page.height - 100) {
        doc.addPage();
        y = 50;
      }

      const trimmed = line.trim();

      if (trimmed.startsWith('####')) {
        y += 15;
        doc.fontSize(12).fillColor('#333333')
          .text(trimmed.replace(/^####\s*/, ''), margin, y);
        y += 20;
      } else if (trimmed.startsWith('###')) {
        y += 20;
        doc.fontSize(14).fillColor('#222222')
          .text(trimmed.replace(/^###\s*/, ''), margin, y);
        y += 25;
      } else if (trimmed.startsWith('##')) {
        y += 25;
        doc.fontSize(16).fillColor('#111111')
          .text(trimmed.replace(/^##\s*/, ''), margin, y);
        y += 30;
      } else if (trimmed.startsWith('#')) {
        y += 30;
        doc.fontSize(18).fillColor('#000000')
          .text(trimmed.replace(/^#\s*/, ''), margin, y);
        y += 35;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        doc.fontSize(10).fillColor('#444444')
          .text('  • ' + trimmed.substring(2), margin + 10, y, { width: maxWidth - 10 });
        y += 18;
      } else if (/^\d+\.\s/.test(trimmed)) {
        doc.fontSize(10).fillColor('#444444')
          .text('  ' + trimmed, margin + 10, y, { width: maxWidth - 10 });
        y += 18;
      } else if (trimmed.length > 0) {
        doc.fontSize(10).fillColor('#555555')
          .text(trimmed, margin, y, { width: maxWidth, align: 'left' });
        y += 16;
      } else {
        y += 10;
      }
    });
  }

  async exportToPDF(title, chapters) {
    const filename = `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const filepath = path.join(TEMP_DIR, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);

      stream.on('finish', () => resolve({ filepath, filename }));
      doc.on('error', reject);
      doc.pipe(stream);

      this.setupChineseFont(doc);

      doc.fontSize(24).fillColor('#000000').text(title, { align: 'center' });
      doc.moveDown(2);

      chapters.forEach(chapter => {
        doc.addPage();
        doc.fontSize(20).fillColor('#000000').text(chapter.title || chapter.chapterId);
        this.renderMarkdownContent(doc, chapter.content);
      });

      doc.end();
    });
  }
}

export const pdfExportService = new PDFExportService();
export default PDFExportService;
