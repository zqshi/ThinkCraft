/**
 * PDF Export 用例实现
 */
import {
  Export,
  ExportFormat,
  ExportStatus,
  ExportOptions,
  IExportRepository
} from '../domain/index.js';
import { CreateExportRequestDto, ExportResponseDto, ExportContentDto } from './pdf-export.dto.js';
import { PdfGenerationService } from './pdf-generation.service.js';

export class PdfExportUseCase {
  constructor(
    exportRepository = new IExportRepository(),
    pdfGenerationService = new PdfGenerationService()
  ) {
    this.exportRepository = exportRepository;
    this.pdfGenerationService = pdfGenerationService;
  }

  /**
   * 创建导出任务
   */
  async createExport(requestDto) {
    requestDto.validate();

    const exportFormat = new ExportFormat(requestDto.format);
    const exportOptions = new ExportOptions(requestDto.options || {});

    const exportEntity = Export.create({
      projectId: requestDto.projectId,
      format: exportFormat,
      title: requestDto.title,
      content: requestDto.content,
      options: exportOptions
    });

    await this.exportRepository.save(exportEntity);

    return ExportResponseDto.fromAggregate(exportEntity);
  }

  /**
   * 处理导出任务
   */
  async processExport(exportId) {
    const exportEntity = await this.exportRepository.findById(exportId);
    if (!exportEntity) {
      throw new Error('Export not found');
    }

    if (!exportEntity.status.isPending()) {
      throw new Error('Export processing can only be started when status is PENDING');
    }

    // 开始处理
    exportEntity.startProcessing();
    await this.exportRepository.save(exportEntity);

    try {
      // 根据格式生成文件
      let filePath;
      let fileSize;

      switch (exportEntity.format.value) {
      case ExportFormat.PDF:
        const result = await this.pdfGenerationService.generatePdf(exportEntity);
        filePath = result.filePath;
        fileSize = result.fileSize;
        break;

      case ExportFormat.HTML:
        const htmlResult = await this.generateHtml(exportEntity);
        filePath = htmlResult.filePath;
        fileSize = htmlResult.fileSize;
        break;

      case ExportFormat.MARKDOWN:
        const mdResult = await this.generateMarkdown(exportEntity);
        filePath = mdResult.filePath;
        fileSize = mdResult.fileSize;
        break;

      default:
        throw new Error(`Unsupported export format: ${exportEntity.format.value}`);
      }

      // 完成导出
      exportEntity.complete(filePath, fileSize);
      await this.exportRepository.save(exportEntity);

      return ExportResponseDto.fromAggregate(exportEntity);
    } catch (error) {
      // 处理失败
      exportEntity.fail(error);
      await this.exportRepository.save(exportEntity);
      throw error;
    }
  }

  /**
   * 生成HTML文件
   */
  async generateHtml(exportEntity) {
    const contentDto = new ExportContentDto({
      sections: JSON.parse(exportEntity.content)
    });

    const htmlContent = contentDto.toHtml();
    const fileName = `${exportEntity.title.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    const filePath = `/tmp/exports/${exportEntity.id.value}/${fileName}`;

    // 这里应该调用文件存储服务
    // await fileStorage.save(filePath, htmlContent);

    return {
      filePath,
      fileSize: Buffer.byteLength(htmlContent, 'utf8')
    };
  }

  /**
   * 生成Markdown文件
   */
  async generateMarkdown(exportEntity) {
    const contentDto = new ExportContentDto({
      sections: JSON.parse(exportEntity.content)
    });

    const mdContent = contentDto.toMarkdown();
    const fileName = `${exportEntity.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    const filePath = `/tmp/exports/${exportEntity.id.value}/${fileName}`;

    // 这里应该调用文件存储服务
    // await fileStorage.save(filePath, mdContent);

    return {
      filePath,
      fileSize: Buffer.byteLength(mdContent, 'utf8')
    };
  }

  /**
   * 获取导出详情
   */
  async getExport(exportId) {
    const exportEntity = await this.exportRepository.findById(exportId);
    if (!exportEntity) {
      throw new Error('Export not found');
    }

    return ExportResponseDto.fromAggregate(exportEntity);
  }

  /**
   * 获取项目的所有导出
   */
  async getExportsByProject(projectId) {
    const exports = await this.exportRepository.findByProjectId(projectId);
    return exports.map(exportEntity => ExportResponseDto.fromAggregate(exportEntity));
  }

  /**
   * 获取指定状态的导出
   */
  async getExportsByStatus(status) {
    const exports = await this.exportRepository.findByStatus(status);
    return exports.map(exportEntity => ExportResponseDto.fromAggregate(exportEntity));
  }

  /**
   * 删除导出
   */
  async deleteExport(exportId) {
    const exportEntity = await this.exportRepository.findById(exportId);
    if (!exportEntity) {
      throw new Error('Export not found');
    }

    // 如果文件存在，删除文件
    if (exportEntity.filePath) {
      // await fileStorage.delete(exportEntity.filePath);
    }

    await this.exportRepository.delete(exportId);
    return true;
  }

  /**
   * 下载导出文件
   */
  async downloadExport(exportId) {
    const exportEntity = await this.exportRepository.findById(exportId);
    if (!exportEntity) {
      throw new Error('Export not found');
    }

    if (!exportEntity.status.isCompleted()) {
      throw new Error('Export is not completed');
    }

    if (!exportEntity.filePath) {
      throw new Error('Export file not found');
    }

    // 返回文件流或文件信息
    return {
      filePath: exportEntity.filePath,
      fileName: `${exportEntity.title}.${exportEntity.format.value}`,
      fileSize: exportEntity.fileSize
    };
  }
}

export default PdfExportUseCase;
