/**
 * PDF Export 控制器
 */
import fs from 'fs';
import path from 'path';
import { PdfExportUseCase } from '../application/pdf-export.use-case.js';
import PDFDocument from 'pdfkit';
import { ExportInMemoryRepository } from '../infrastructure/export-inmemory.repository.js';
import { PdfGenerationService } from '../application/pdf-generation.service.js';
import { CreateExportRequestDto } from '../application/pdf-export.dto.js';
import { logger } from '../../../../middleware/logger.js';
import { ok, fail } from '../../../../middleware/response.js';

export class PdfExportController {
  resolveCjkFontPath() {
    const candidates = [
      '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
      '/System/Library/Fonts/PingFang.ttc',
      '/System/Library/Fonts/Supplemental/Songti.ttc',
      '/System/Library/Fonts/Supplemental/Heiti.ttc',
      '/System/Library/Fonts/STHeiti Medium.ttc'
    ];
    for (const fontPath of candidates) {
      if (fs.existsSync(fontPath)) {
        return fontPath;
      }
    }
    return null;
  }
  constructor() {
    this.pdfExportUseCase = new PdfExportUseCase(
      new ExportInMemoryRepository(),
      new PdfGenerationService()
    );
  }

  /**
   * 创建导出任务
   */
  async createExport(req, res) {
    try {
      const requestDto = new CreateExportRequestDto({
        projectId: req.body.projectId,
        format: req.body.format || 'pdf',
        title: req.body.title,
        content: req.body.content,
        options: req.body.options
      });

      const result = await this.pdfExportUseCase.createExport(requestDto);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 处理导出任务
   */
  async processExport(req, res) {
    try {
      const result = await this.pdfExportUseCase.processExport(req.params.exportId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 获取导出详情
   */
  async getExport(req, res) {
    try {
      const result = await this.pdfExportUseCase.getExport(req.params.exportId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 404);
    }
  }

  /**
   * 获取项目的所有导出
   */
  async getExportsByProject(req, res) {
    try {
      const result = await this.pdfExportUseCase.getExportsByProject(req.params.projectId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 获取指定状态的导出
   */
  async getExportsByStatus(req, res) {
    try {
      const result = await this.pdfExportUseCase.getExportsByStatus(req.params.status);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 删除导出
   */
  async deleteExport(req, res) {
    try {
      await this.pdfExportUseCase.deleteExport(req.params.exportId);
      ok(res, null, 'Export deleted successfully');
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 下载导出文件
   */
  async downloadExport(req, res) {
    try {
      const result = await this.pdfExportUseCase.downloadExport(req.params.exportId);

      // 设置响应头
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.setHeader('Content-Length', result.fileSize);

      const filePath = result.filePath;

      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        logger.error('[PDF Export] 文件不存在:', filePath);
        return fail(res, 'PDF文件不存在', 404);
      }

      // 创建文件流并发送
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        logger.error('[PDF Export] 文件流错误:', error);
        if (!res.headersSent) {
          fail(res, '文件下载失败', 500);
        }
      });
    } catch (error) {
      logger.error('[PDF Export] 下载失败:', error);
      fail(res, error.message, 400);
    }
  }

  /**
   * 快速导出报告为PDF（兼容旧API）
   * POST /api/pdf-export/report
   */
  async exportReportPDF(req, res) {
    try {
      const { reportData, ideaTitle } = req.body;

      if (!reportData) {
        return fail(res, '缺少报告数据', 400);
      }

      try {
        const pdfBuffer = await this.pdfExportUseCase.pdfGenerationService.generateReportPDF(
          reportData,
          ideaTitle || '创意分析报告'
        );

        if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || !pdfBuffer.slice(0, 8).toString('ascii').includes('%PDF-')) {
          throw new Error('PDF生成失败：输出内容无效');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(ideaTitle || '创意分析报告')}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
      } catch (puppeteerError) {
        // 兼容无浏览器环境，降级为pdfkit文本PDF
        const doc = new PDFDocument({ autoFirstPage: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(ideaTitle || '创意分析报告')}.pdf"`);
        doc.pipe(res);

        const cjkFont = this.resolveCjkFontPath();
        if (cjkFont) {
          doc.font(cjkFont);
        }
        doc.fontSize(20).text(ideaTitle || '创意分析报告', { align: 'center' });
        doc.moveDown();

        const chapters = reportData.chapters || {};
        Object.keys(chapters).forEach((key, idx) => {
          const chapter = chapters[key] || {};
          const title = chapter.title || `章节 ${idx + 1}`;
          doc.addPage();
          doc.fontSize(16).text(title);
          doc.moveDown(0.5);
          const content = JSON.stringify(chapter, null, 2);
          doc.fontSize(10).text(content);
        });

        doc.end();
      }
    } catch (error) {
      logger.error('[PDF Export] 报告导出失败:', error);
      fail(res, error.message, 500);
    }
  }

  /**
   * 快速导出商业计划书/产品立项材料为PDF
   * POST /api/pdf-export/business-plan
   */
  async exportBusinessPlanPDF(req, res) {
    try {
      const { chapters, title, type } = req.body;
      if (!Array.isArray(chapters) || chapters.length === 0) {
        return fail(res, '缺少报告章节数据', 400);
      }

      try {
        const pdfBuffer = await this.pdfExportUseCase.pdfGenerationService.generateBusinessPlanPDF(
          chapters,
          title || (type === 'proposal' ? '产品立项材料' : '商业计划书')
        );

        if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || !pdfBuffer.slice(0, 8).toString('ascii').includes('%PDF-')) {
          throw new Error('PDF生成失败：输出内容无效');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title || '商业计划书')}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
      } catch (puppeteerError) {
        const doc = new PDFDocument({ autoFirstPage: true });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title || '商业计划书')}.pdf"`);
        doc.pipe(res);

        const cjkFont = this.resolveCjkFontPath();
        if (cjkFont) {
          doc.font(cjkFont);
        }
        doc.fontSize(20).text(title || (type === 'proposal' ? '产品立项材料' : '商业计划书'), { align: 'center' });
        doc.moveDown();

        chapters.forEach((chapter, idx) => {
          doc.addPage();
          doc.fontSize(16).text(chapter.title || `章节 ${idx + 1}`);
          doc.moveDown(0.5);
          const cleanedContent = this.pdfExportUseCase.pdfGenerationService.normalizeMarkdownForPdfText(
            chapter.content || ''
          );
          doc.fontSize(10).text(cleanedContent);
        });

        doc.end();
      }
    } catch (error) {
      logger.error('[PDF Export] 商业报告导出失败:', error);
      fail(res, error.message, 500);
    }
  }
}

export default PdfExportController;
