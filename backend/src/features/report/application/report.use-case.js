/**
 * Report 用例实现
 */
import { Report, ReportType, ReportStatus, IReportRepository } from '../domain/index.js';
import {
  CreateReportRequestDto,
  AddReportSectionRequestDto,
  ReportResponseDto,
  ReportListItemDto,
  GenerateReportRequestDto
} from './report.dto.js';
import { ReportGenerationService } from './report-generation.service.js';

export class ReportUseCase {
  constructor(
    reportRepository = new IReportRepository(),
    reportGenerationService = new ReportGenerationService()
  ) {
    this.reportRepository = reportRepository;
    this.reportGenerationService = reportGenerationService;
  }

  /**
   * 创建报告
   */
  async createReport(requestDto) {
    requestDto.validate();

    const reportType = new ReportType(requestDto.type);
    const report = Report.create({
      projectId: requestDto.projectId,
      type: reportType,
      title: requestDto.title,
      description: requestDto.description,
      metadata: requestDto.metadata
    });

    await this.reportRepository.save(report);

    return ReportResponseDto.fromAggregate(report);
  }

  /**
   * 添加报告章节
   */
  async addSection(reportId, requestDto) {
    requestDto.validate();

    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    const section = report.addSection({
      title: requestDto.title,
      content: requestDto.content,
      type: requestDto.type,
      order: requestDto.order,
      metadata: requestDto.metadata
    });

    await this.reportRepository.save(report);

    return {
      sectionId: section.id,
      report: ReportResponseDto.fromAggregate(report)
    };
  }

  /**
   * 更新报告章节
   */
  async updateSection(reportId, sectionId, updates) {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    report.updateSection(sectionId, updates);
    await this.reportRepository.save(report);

    return ReportResponseDto.fromAggregate(report);
  }

  /**
   * 删除报告章节
   */
  async removeSection(reportId, sectionId) {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    report.removeSection(sectionId);
    await this.reportRepository.save(report);

    return ReportResponseDto.fromAggregate(report);
  }

  /**
   * 生成报告
   */
  async generateReport(requestDto) {
    requestDto.validate();

    const report = await this.reportRepository.findById(requestDto.reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    if (!report.status.canGenerate()) {
      throw new Error('Report generation can only be started when status is DRAFT or FAILED');
    }

    // 开始生成
    report.startGeneration();
    await this.reportRepository.save(report);

    try {
      // 调用生成服务
      const sections = await this.reportGenerationService.generateReport(
        report,
        requestDto.dataSource,
        requestDto.options
      );

      // 清空现有章节并添加新生成的章节
      report.sections.forEach(section => {
        report.removeSection(section.id);
      });

      sections.forEach(sectionData => {
        report.addSection(sectionData);
      });

      // 完成生成
      report.completeGeneration();
      await this.reportRepository.save(report);

      // 添加额外元数据
      const metadata = this.reportGenerationService.extractKeyMetrics(report.sections);
      report.updateMetadata({
        summary: this.reportGenerationService.generateSummary(report.sections),
        keyMetrics: metadata,
        generatedAt: new Date().toISOString()
      });

      await this.reportRepository.save(report);

      return ReportResponseDto.fromAggregate(report);
    } catch (error) {
      // 生成失败
      report.failGeneration(error);
      await this.reportRepository.save(report);
      throw error;
    }
  }

  /**
   * 更新报告基本信息
   */
  async updateReport(reportId, updates) {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    if (updates.title !== undefined) {
      report.updateTitle(updates.title);
    }

    if (updates.description !== undefined) {
      report.updateDescription(updates.description);
    }

    if (updates.metadata !== undefined) {
      report.updateMetadata(updates.metadata);
    }

    await this.reportRepository.save(report);
    return ReportResponseDto.fromAggregate(report);
  }

  /**
   * 归档报告
   */
  async archiveReport(reportId) {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    report.archive();
    await this.reportRepository.save(report);

    return ReportResponseDto.fromAggregate(report);
  }

  /**
   * 获取报告详情
   */
  async getReport(reportId) {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    return ReportResponseDto.fromAggregate(report);
  }

  /**
   * 获取报告列表
   */
  async getReports(filters = {}) {
    let reports = [];

    if (filters.projectId) {
      reports = await this.reportRepository.findByProjectId(filters.projectId);
    } else if (filters.type) {
      reports = await this.reportRepository.findByType(filters.type);
    } else if (filters.status) {
      reports = await this.reportRepository.findByStatus(filters.status);
    } else {
      // 获取所有报告（实际项目中应该分页）
      reports = []; // 需要实现获取所有报告的方法
    }

    return reports.map(report => ReportListItemDto.fromAggregate(report));
  }

  /**
   * 删除报告
   */
  async deleteReport(reportId) {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    await this.reportRepository.delete(reportId);
    return true;
  }

  /**
   * 获取报告的导出格式
   */
  async getReportExportFormats(reportId) {
    const report = await this.reportRepository.findById(reportId);
    if (!report) {
      throw new Error('Report not found');
    }

    // 根据报告类型返回支持的导出格式
    const formats = {
      base: ['pdf', 'html', 'markdown'],
      business_plan: ['pdf', 'docx', 'html'],
      project_summary: ['pdf', 'html'],
      progress_report: ['pdf', 'html', 'markdown'],
      analysis_report: ['pdf', 'html', 'markdown']
    };

    return formats[report.type.value] || formats.base;
  }

  /**
   * 获取报告模板
   */
  async getReportTemplates(reportType) {
    const templates = {
      [ReportType.BUSINESS_PLAN]: [
        { id: 'standard', name: '标准商业计划书模板' },
        { id: 'lean', name: '精益商业计划书模板' },
        { id: 'startup', name: '创业公司商业计划书模板' }
      ],
      [ReportType.PROJECT_SUMMARY]: [
        { id: 'standard', name: '标准项目总结模板' },
        { id: 'technical', name: '技术项目总结模板' },
        { id: 'business', name: '业务项目总结模板' }
      ],
      [ReportType.PROGRESS_REPORT]: [
        { id: 'weekly', name: '周报模板' },
        { id: 'monthly', name: '月报模板' },
        { id: 'milestone', name: '里程碑报告模板' }
      ],
      [ReportType.ANALYSIS_REPORT]: [
        { id: 'data_analysis', name: '数据分析报告模板' },
        { id: 'market_analysis', name: '市场分析报告模板' },
        { id: 'competitive_analysis', name: '竞争分析报告模板' }
      ]
    };

    return templates[reportType] || [];
  }
}

export default ReportUseCase;
