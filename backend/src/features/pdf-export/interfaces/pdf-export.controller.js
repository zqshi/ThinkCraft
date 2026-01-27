/**
 * PDF Export 控制器
 */
import fs from 'fs';
import path from 'path';
import { PdfExportUseCase } from '../application/pdf-export.use-case.js';
import { ExportInMemoryRepository } from '../infrastructure/export-inmemory.repository.js';
import { PdfGenerationService } from '../application/pdf-generation.service.js';
import { CreateExportRequestDto } from '../application/pdf-export.dto.js';
import { logger } from '../../../../middleware/logger.js';

export class PdfExportController {
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
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 处理导出任务
   */
  async processExport(req, res) {
    try {
      const result = await this.pdfExportUseCase.processExport(req.params.exportId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取导出详情
   */
  async getExport(req, res) {
    try {
      const result = await this.pdfExportUseCase.getExport(req.params.exportId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取项目的所有导出
   */
  async getExportsByProject(req, res) {
    try {
      const result = await this.pdfExportUseCase.getExportsByProject(req.params.projectId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取指定状态的导出
   */
  async getExportsByStatus(req, res) {
    try {
      const result = await this.pdfExportUseCase.getExportsByStatus(req.params.status);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 删除导出
   */
  async deleteExport(req, res) {
    try {
      await this.pdfExportUseCase.deleteExport(req.params.exportId);
      res.json({
        success: true,
        message: 'Export deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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
        return res.status(404).json({
          success: false,
          error: 'PDF文件不存在'
        });
      }

      // 创建文件流并发送
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        logger.error('[PDF Export] 文件流错误:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: '文件下载失败'
          });
        }
      });
    } catch (error) {
      logger.error('[PDF Export] 下载失败:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default PdfExportController;
