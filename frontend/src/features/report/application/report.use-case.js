/**
 * 报告用例
 * 处理报告相关的业务用例
 */
import { Report } from '../domain/entities/report.aggregate.js';
import { ReportId } from '../domain/value-objects/report-id.vo.js';
import { ReportType } from '../domain/value-objects/report-type.vo.js';
import { ReportStatus } from '../domain/value-objects/report-status.vo.js';
import { ReportRepository } from '../infrastructure/report.repository.js';
import { ReportApiService } from '../infrastructure/report-api.service.js';
import { ReportMapper } from '../infrastructure/report.mapper.js';
import { Result } from '../../../shared/result.js';

export class ReportUseCase {
  constructor() {
    this.reportRepository = new ReportRepository();
    this.reportApiService = new ReportApiService();
    this.reportMapper = new ReportMapper();
  }

  /**
   * 创建报告
   */
  async createReport(createDto) {
    try {
      const { projectId, type, title, description, metadata, tags } = createDto;

      if (!projectId || !type || !title) {
        throw new Error('项目ID、报告类型和标题不能为空');
      }

      // 创建领域对象
      const reportType = ReportType.fromString(type);
      const report = Report.create({
        projectId,
        type: reportType,
        title,
        description,
        metadata,
        tags
      });

      // 保存到仓库
      await this.reportRepository.save(report);

      // 调用API创建报告
      const reportData = await this.reportApiService.createReport({
        projectId,
        type,
        title,
        description,
        metadata,
        tags
      });

      // 更新报告ID
      report.id = new ReportId(reportData.id);
      await this.reportRepository.save(report);

      return {
        success: true,
        data: this.reportMapper.toDto(report)
      };
    } catch (error) {
      console.error('创建报告失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 获取报告
   */
  async getReport(id) {
    try {
      const report = await this.repository.findById(id);

      if (!report) {
        return Result.fail('报告不存在');
      }

      const dto = this.mapper.toDTO(report);
      return Result.ok(dto);
    } catch (error) {
      console.error('获取报告失败:', error);
      return Result.fail(`获取报告失败: ${error.message}`);
    }
  }

  /**
   * 获取项目的报告列表
   */
  async getReportsByProject(projectId, filters = {}) {
    try {
      const reports = await this.repository.findByProjectId(projectId, filters);

      const dtos = reports.map(report => this.mapper.toDTO(report));

      return Result.ok({
        items: dtos,
        total: dtos.length
      });
    } catch (error) {
      console.error('获取项目报告失败:', error);
      return Result.fail(`获取项目报告失败: ${error.message}`);
    }
  }

  /**
   * 添加章节
   */
  async addSection(reportId, sectionDto) {
    try {
      const report = await this.repository.findById(reportId);

      if (!report) {
        return Result.fail('报告不存在');
      }

      if (!report.status.canEdit()) {
        return Result.fail('当前状态不能编辑报告');
      }

      const { title, content, orderIndex, sectionType } = sectionDto;

      const section = report.addSection({
        title,
        content,
        orderIndex,
        sectionType
      });

      await this.repository.save(report);

      const dto = this.mapper.toSectionDTO(section);
      return Result.ok(dto);
    } catch (error) {
      console.error('添加章节失败:', error);
      return Result.fail(`添加章节失败: ${error.message}`);
    }
  }

  /**
   * 更新章节
   */
  async updateSection(reportId, sectionId, updateDto) {
    try {
      const report = await this.repository.findById(reportId);

      if (!report) {
        return Result.fail('报告不存在');
      }

      if (!report.status.canEdit()) {
        return Result.fail('当前状态不能编辑报告');
      }

      const section = report.updateSection(sectionId, updateDto);

      await this.repository.save(report);

      const dto = this.mapper.toSectionDTO(section);
      return Result.ok(dto);
    } catch (error) {
      console.error('更新章节失败:', error);
      return Result.fail(`更新章节失败: ${error.message}`);
    }
  }

  /**
   * 删除章节
   */
  async removeSection(reportId, sectionId) {
    try {
      const report = await this.repository.findById(reportId);

      if (!report) {
        return Result.fail('报告不存在');
      }

      if (!report.status.canEdit()) {
        return Result.fail('当前状态不能编辑报告');
      }

      report.removeSection(sectionId);

      await this.repository.save(report);

      return Result.ok(true);
    } catch (error) {
      console.error('删除章节失败:', error);
      return Result.fail(`删除章节失败: ${error.message}`);
    }
  }

  /**
   * 生成报告
   */
  async generateReport(reportId, generatedBy) {
    try {
      const report = await this.repository.findById(reportId);

      if (!report) {
        return Result.fail('报告不存在');
      }

      if (!report.status.canGenerate()) {
        return Result.fail('当前状态不能生成报告');
      }

      if (report.sectionCount === 0) {
        return Result.fail('报告没有内容，不能生成');
      }

      report.generate(generatedBy);

      await this.repository.save(report);

      const dto = this.mapper.toDTO(report);
      return Result.ok(dto);
    } catch (error) {
      console.error('生成报告失败:', error);
      return Result.fail(`生成报告失败: ${error.message}`);
    }
  }

  /**
   * 更新报告状态
   */
  async updateReportStatus(reportId, status) {
    try {
      const report = await this.repository.findById(reportId);

      if (!report) {
        return Result.fail('报告不存在');
      }

      report.updateStatus(status);

      await this.repository.save(report);

      const dto = this.mapper.toDTO(report);
      return Result.ok(dto);
    } catch (error) {
      console.error('更新报告状态失败:', error);
      return Result.fail(`更新报告状态失败: ${error.message}`);
    }
  }

  /**
   * 删除报告
   */
  async deleteReport(reportId) {
    try {
      await this.repository.delete(reportId);
      return Result.ok(true);
    } catch (error) {
      console.error('删除报告失败:', error);
      return Result.fail(`删除报告失败: ${error.message}`);
    }
  }

  /**
   * 获取所有报告
   */
  async getAllReports(filters = {}) {
    try {
      const reports = await this.repository.findAll(filters);

      const dtos = reports.map(report => this.mapper.toDTO(report));

      return Result.ok({
        items: dtos,
        total: dtos.length
      });
    } catch (error) {
      console.error('获取报告列表失败:', error);
      return Result.fail(`获取报告列表失败: ${error.message}`);
    }
  }

  /**
   * 获取报告统计
   */
  async getReportStats(projectId) {
    try {
      const stats = await this.repository.getStats(projectId);
      return Result.ok(stats);
    } catch (error) {
      console.error('获取报告统计失败:', error);
      return Result.fail(`获取报告统计失败: ${error.message}`);
    }
  }

  /**
   * 使用模板创建报告
   */
  async createReportFromTemplate(projectId, templateType, generatedBy) {
    try {
      const reportType = ReportType.fromString(templateType);
      const template = reportType.getTemplate();

      const report = Report.create({
        projectId,
        type: templateType,
        title: `${reportType.getDisplayName()}_${new Date().toLocaleDateString()}`,
        description: `基于模板创建的${reportType.getDisplayName()}`,
        generatedBy
      });

      // 添加模板章节
      template.forEach((section, index) => {
        report.addSection({
          title: section.title,
          content: '',
          orderIndex: index,
          sectionType: section.type
        });
      });

      await this.repository.save(report);

      const dto = this.mapper.toDTO(report);
      return Result.ok(dto);
    } catch (error) {
      console.error('使用模板创建报告失败:', error);
      return Result.fail(`使用模板创建报告失败: ${error.message}`);
    }
  }

  /**
   * 复制报告
   */
  async duplicateReport(reportId, newTitle) {
    try {
      const originalReport = await this.repository.findById(reportId);

      if (!originalReport) {
        return Result.fail('原报告不存在');
      }

      const duplicatedReport = Report.create({
        projectId: originalReport.projectId,
        type: originalReport.type.value,
        title: newTitle || `${originalReport.title.value}_副本`,
        description: originalReport.description?.value,
        generatedBy: originalReport.generatedBy?.value
      });

      // 复制所有章节
      originalReport.sections.forEach(section => {
        duplicatedReport.addSection({
          title: section.title.value,
          content: section.content.value,
          orderIndex: section.orderIndex,
          sectionType: section.sectionType
        });
      });

      await this.repository.save(duplicatedReport);

      const dto = this.mapper.toDTO(duplicatedReport);
      return Result.ok(dto);
    } catch (error) {
      console.error('复制报告失败:', error);
      return Result.fail(`复制报告失败: ${error.message}`);
    }
  }
}

export default ReportUseCase;
