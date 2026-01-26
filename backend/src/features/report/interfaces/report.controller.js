/**
 * Report 控制器
 */
import { ReportUseCase } from '../application/report.use-case.js';
import { ReportInMemoryRepository } from '../infrastructure/report-inmemory.repository.js';
import { ReportGenerationService } from '../application/report-generation.service.js';
import {
  CreateReportRequestDto,
  AddReportSectionRequestDto,
  GenerateReportRequestDto
} from '../application/report.dto.js';

export class ReportController {
  constructor() {
    this.reportUseCase = new ReportUseCase(
      new ReportInMemoryRepository(),
      new ReportGenerationService()
    );
  }

  /**
   * 创建报告
   */
  async createReport(req, res) {
    try {
      const requestDto = new CreateReportRequestDto({
        projectId: req.body.projectId,
        type: req.body.type,
        title: req.body.title,
        description: req.body.description,
        metadata: req.body.metadata
      });

      const result = await this.reportUseCase.createReport(requestDto);
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
   * 添加报告章节
   */
  async addSection(req, res) {
    try {
      const requestDto = new AddReportSectionRequestDto({
        title: req.body.title,
        content: req.body.content,
        type: req.body.type,
        order: req.body.order,
        metadata: req.body.metadata
      });

      const result = await this.reportUseCase.addSection(req.params.reportId, requestDto);
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
   * 更新报告章节
   */
  async updateSection(req, res) {
    try {
      const updates = {};
      if (req.body.title !== undefined) {
        updates.title = req.body.title;
      }
      if (req.body.content !== undefined) {
        updates.content = req.body.content;
      }
      if (req.body.order !== undefined) {
        updates.order = req.body.order;
      }
      if (req.body.metadata !== undefined) {
        updates.metadata = req.body.metadata;
      }

      const result = await this.reportUseCase.updateSection(
        req.params.reportId,
        req.params.sectionId,
        updates
      );
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
   * 删除报告章节
   */
  async removeSection(req, res) {
    try {
      const result = await this.reportUseCase.removeSection(
        req.params.reportId,
        req.params.sectionId
      );
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
   * 生成报告
   */
  async generateReport(req, res) {
    try {
      const requestDto = new GenerateReportRequestDto({
        reportId: req.params.reportId,
        template: req.body.template,
        dataSource: req.body.dataSource,
        options: req.body.options
      });

      const result = await this.reportUseCase.generateReport(requestDto);
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
   * 更新报告
   */
  async updateReport(req, res) {
    try {
      const updates = {};
      if (req.body.title !== undefined) {
        updates.title = req.body.title;
      }
      if (req.body.description !== undefined) {
        updates.description = req.body.description;
      }
      if (req.body.metadata !== undefined) {
        updates.metadata = req.body.metadata;
      }

      const result = await this.reportUseCase.updateReport(req.params.reportId, updates);
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
   * 归档报告
   */
  async archiveReport(req, res) {
    try {
      const result = await this.reportUseCase.archiveReport(req.params.reportId);
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
   * 获取报告详情
   */
  async getReport(req, res) {
    try {
      const result = await this.reportUseCase.getReport(req.params.reportId);
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
   * 获取报告列表
   */
  async getReports(req, res) {
    try {
      const filters = {};
      if (req.query.projectId) {
        filters.projectId = req.query.projectId;
      }
      if (req.query.type) {
        filters.type = req.query.type;
      }
      if (req.query.status) {
        filters.status = req.query.status;
      }

      const result = await this.reportUseCase.getReports(filters);
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
   * 删除报告
   */
  async deleteReport(req, res) {
    try {
      await this.reportUseCase.deleteReport(req.params.reportId);
      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取报告导出格式
   */
  async getReportExportFormats(req, res) {
    try {
      const result = await this.reportUseCase.getReportExportFormats(req.params.reportId);
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
   * 获取报告模板
   */
  async getReportTemplates(req, res) {
    try {
      const reportType = req.params.reportType;
      const result = await this.reportUseCase.getReportTemplates(reportType);
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
}

export default ReportController;
