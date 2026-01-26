/**
 * PDF Export 控制器
 */
import { PdfExportUseCase } from '../application/pdf-export.use-case.js';
import { ExportInMemoryRepository } from '../infrastructure/export-inmemory.repository.js';
import { PdfGenerationService } from '../application/pdf-generation.service.js';
import { CreateExportRequestDto } from '../application/pdf-export.dto.js';

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

      // 这里应该读取文件并发送
      // const fileStream = fs.createReadStream(result.filePath);
      // fileStream.pipe(res);

      res.json({
        success: true,
        message: 'File download would be handled here',
        fileInfo: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

export default PdfExportController;
