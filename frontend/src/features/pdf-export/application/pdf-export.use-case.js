/**
 * PDF导出用例
 * 处理PDF导出任务的业务用例
 */
import { PdfExport } from '../domain/entities/pdf-export.aggregate.js';
import { ExportFormat } from '../domain/value-objects/export-format.vo.js';
import { ExportOptions } from '../domain/value-objects/export-options.vo.js';
import { ExportRepository } from '../infrastructure/export.repository.js';
import { ExportApiService } from '../infrastructure/export-api.service.js';
import { ExportMapper } from '../infrastructure/export.mapper.js';

export class PdfExportUseCase {
    constructor() {
        this.repository = new ExportRepository();
        this.apiService = new ExportApiService();
        this.mapper = new ExportMapper();
    }

    /**
     * 创建导出任务
     */
    async createExport(createDto) {
        try {
            const { title, projectId, format, content, options, requestedBy } = createDto;

            if (!title || !projectId || !format) {
                throw new Error('标题、项目ID和格式不能为空');
            }

            // 创建领域对象
            const exportFormat = ExportFormat.fromString(format);
            const exportOptions = new ExportOptions(options);

            const pdfExport = PdfExport.create({
                projectId,
                title,
                content,
                format: exportFormat,
                options: exportOptions
            });

            // 保存到仓库
            await this.repository.save(pdfExport);

            // 调用API创建导出任务
            const exportData = await this.apiService.createExport({
                projectId,
                title,
                content,
                format,
                options
            });

            // 更新导出ID
            pdfExport.id = new ExportId(exportData.id);
            await this.repository.save(pdfExport);

            return {
                success: true,
                data: this.mapper.toDto(pdfExport)
            };
        } catch (error) {
            console.error('创建导出任务失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取导出任务
     */
    async getExport(id) {
        try {
            let pdfExport = await this.repository.findById(id);

            // 如果本地没有，从API获取
            if (!pdfExport) {
                const exportData = await this.apiService.getExport(id);
                if (exportData) {
                    pdfExport = this.mapper.toDomain(exportData);
                    await this.repository.save(pdfExport);
                }
            }

            if (!pdfExport) {
                throw new Error('导出任务不存在');
            }

            return {
                success: true,
                data: this.mapper.toDto(pdfExport)
            };
        } catch (error) {
            console.error('获取导出任务失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 获取项目的导出任务列表
     */
    async getExportsByProject(projectId, filters = {}) {
        try {
            // 从API获取最新数据
            const exportsData = await this.apiService.getExportsByProject(projectId, filters);

            // 转换为领域对象并保存
            const exports = [];
            for (const exportData of exportsData) {
                const exportEntity = this.mapper.toDomain(exportData);
                await this.repository.save(exportEntity);
                exports.push(exportEntity);
            }

            return {
                success: true,
                data: {
                    items: exports.map(exp => this.mapper.toDto(exp)),
                    total: exports.length
                }
            };
        } catch (error) {
            console.error('获取项目导出任务失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 开始处理导出任务
     */
    async startProcessing(exportId) {
        try {
            const pdfExport = await this.repository.findById(exportId);

            if (!pdfExport) {
                throw new Error('导出任务不存在');
            }

            if (!pdfExport.status.canProcess()) {
                throw new Error('当前状态不能开始处理');
            }

            pdfExport.startProcessing();

            await this.repository.save(pdfExport);

            // 调用API开始处理
            await this.apiService.processExport(exportId);

            return {
                success: true,
                data: this.mapper.toDto(pdfExport)
            };
        } catch (error) {
            console.error('开始处理导出任务失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 完成导出任务
     */
    async completeExport(exportId, fileUrl, fileSize, pageCount) {
        try {
            const pdfExport = await this.repository.findById(exportId);

            if (!pdfExport) {
                return Result.fail('导出任务不存在');
            }

            if (!pdfExport.status.isProcessing()) {
                return Result.fail('当前状态不是处理中');
            }

            pdfExport.complete(fileUrl, fileSize, pageCount);

            await this.repository.save(pdfExport);

            const dto = this.mapper.toDTO(pdfExport);
            return Result.ok(dto);
        } catch (error) {
            console.error('完成导出任务失败:', error);
            return Result.fail(`完成导出任务失败: ${error.message}`);
        }
    }

    /**
     * 导出失败
     */
    async failExport(exportId, errorMessage) {
        try {
            const pdfExport = await this.repository.findById(exportId);

            if (!pdfExport) {
                return Result.fail('导出任务不存在');
            }

            pdfExport.fail(errorMessage);

            await this.repository.save(pdfExport);

            const dto = this.mapper.toDTO(pdfExport);
            return Result.ok(dto);
        } catch (error) {
            console.error('导出失败处理失败:', error);
            return Result.fail(`导出失败处理失败: ${error.message}`);
        }
    }

    /**
     * 更新导出内容
     */
    async updateExportContent(exportId, content) {
        try {
            const pdfExport = await this.repository.findById(exportId);

            if (!pdfExport) {
                return Result.fail('导出任务不存在');
            }

            pdfExport.updateContent(content);

            await this.repository.save(pdfExport);

            const dto = this.mapper.toDTO(pdfExport);
            return Result.ok(dto);
        } catch (error) {
            console.error('更新导出内容失败:', error);
            return Result.fail(`更新导出内容失败: ${error.message}`);
        }
    }

    /**
     * 更新导出选项
     */
    async updateExportOptions(exportId, options) {
        try {
            const pdfExport = await this.repository.findById(exportId);

            if (!pdfExport) {
                return Result.fail('导出任务不存在');
            }

            pdfExport.updateOptions(options);

            await this.repository.save(pdfExport);

            const dto = this.mapper.toDTO(pdfExport);
            return Result.ok(dto);
        } catch (error) {
            console.error('更新导出选项失败:', error);
            return Result.fail(`更新导出选项失败: ${error.message}`);
        }
    }

    /**
     * 删除导出任务
     */
    async deleteExport(exportId) {
        try {
            await this.repository.delete(exportId);
            return Result.ok(true);
        } catch (error) {
            console.error('删除导出任务失败:', error);
            return Result.fail(`删除导出任务失败: ${error.message}`);
        }
    }

    /**
     * 获取所有导出任务
     */
    async getAllExports(filters = {}) {
        try {
            const exports = await this.repository.findAll(filters);

            const dtos = exports.map(exp => this.mapper.toDTO(exp));

            return Result.ok({
                items: dtos,
                total: dtos.length
            });
        } catch (error) {
            console.error('获取导出任务列表失败:', error);
            return Result.fail(`获取导出任务列表失败: ${error.message}`);
        }
    }

    /**
     * 下载导出文件
     */
    async downloadExport(exportId) {
        try {
            const pdfExport = await this.repository.findById(exportId);

            if (!pdfExport) {
                return Result.fail('导出任务不存在');
            }

            if (!pdfExport.status.isCompleted()) {
                return Result.fail('导出任务尚未完成');
            }

            if (!pdfExport.fileUrl) {
                return Result.fail('导出文件URL不存在');
            }

            return Result.ok({
                downloadUrl: pdfExport.fileUrl,
                filename: this.generateFilename(pdfExport)
            });
        } catch (error) {
            console.error('下载导出文件失败:', error);
            return Result.fail(`下载导出文件失败: ${error.message}`);
        }
    }

    /**
     * 生成文件名
     */
    generateFilename(pdfExport) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeTitle = pdfExport.title.value.replace(/[^a-zA-Z0-9]/g, '_');
        const extension = pdfExport.format.getFileExtension();

        return `${safeTitle}_${timestamp}${extension}`;
    }

    /**
     * 批量导出
     */
    async batchExport(exportRequests) {
        try {
            const results = [];

            for (const request of exportRequests) {
                const result = await this.createExport(request);
                results.push(result);
            }

            return Result.ok(results);
        } catch (error) {
            console.error('批量导出失败:', error);
            return Result.fail(`批量导出失败: ${error.message}`);
        }
    }

    /**
     * 获取导出统计
     */
    async getExportStats(projectId) {
        try {
            const stats = await this.repository.getStats(projectId);
            return Result.ok(stats);
        } catch (error) {
            console.error('获取导出统计失败:', error);
            return Result.fail(`获取导出统计失败: ${error.message}`);
        }
    }
}

    /**
     * 完成导出任务
     */
    async completeExport(exportId, fileUrl, fileSize, pageCount) {
        try {
            const pdfExport = await this.repository.findById(exportId);

            if (!pdfExport) {
                throw new Error('导出任务不存在');
            }

            if (!pdfExport.status.isProcessing()) {
                throw new Error('当前状态不是处理中');
            }

            pdfExport.complete(fileUrl, fileSize, pageCount);

            await this.repository.save(pdfExport);

            return {
                success: true,
                data: this.mapper.toDto(pdfExport)
            };
        } catch (error) {
            console.error('完成导出任务失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 导出失败
     */
    async failExport(exportId, errorMessage) {
        try {
            const pdfExport = await this.repository.findById(exportId);

            if (!pdfExport) {
                throw new Error('导出任务不存在');
            }

            pdfExport.fail(errorMessage);

            await this.repository.save(pdfExport);

            return {
                success: true,
                data: this.mapper.toDto(pdfExport)
            };
        } catch (error) {
            console.error('导出失败处理失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 删除导出任务
     */
    async deleteExport(exportId) {
        try {
            // 从API删除
            await this.apiService.deleteExport(exportId);

            // 从本地仓库删除
            await this.repository.delete(exportId);

            return {
                success: true,
                data: true
            };
        } catch (error) {
            console.error('删除导出任务失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 下载导出文件
     */
    async downloadExport(exportId) {
        try {
            const pdfExport = await this.repository.findById(exportId);

            if (!pdfExport) {
                throw new Error('导出任务不存在');
            }

            if (!pdfExport.status.isCompleted()) {
                throw new Error('导出任务尚未完成');
            }

            if (!pdfExport.fileUrl) {
                throw new Error('导出文件URL不存在');
            }

            // 获取下载URL
            const downloadInfo = await this.apiService.getDownloadUrl(exportId);

            return {
                success: true,
                data: {
                    downloadUrl: downloadInfo.url,
                    filename: this.generateFilename(pdfExport),
                    fileSize: pdfExport.fileSize
                }
            };
        } catch (error) {
            console.error('下载导出文件失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 生成文件名
     */
    generateFilename(pdfExport) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeTitle = pdfExport.title.replace(/[^a-zA-Z0-9]/g, '_');
        const extension = pdfExport.format.getFileExtension();

        return `${safeTitle}_${timestamp}${extension}`;
    }
}

export default PdfExportUseCase;