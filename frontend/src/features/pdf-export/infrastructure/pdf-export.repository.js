/**
 * PDF导出仓库
 * 处理PDF导出任务的数据持久化
 */
import { PdfExport } from '../domain/pdf-export.aggregate.js';
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class PdfExportRepository {
  constructor() {
    this.baseUrl = '/api/pdf-exports';
    this.cache = new Map();
    this.activeDownloads = new Map();
  }

  /**
   * 保存导出任务
   */
  async save(pdfExport) {
    try {
      const data = pdfExport.toJSON();

      if (pdfExport.isNew) {
        const response = await apiClient.post(this.baseUrl, data);
        const savedData = response.data;

        // 更新缓存
        this.cache.set(savedData.id, savedData);

        return PdfExport.fromJSON(savedData);
      } else {
        const response = await apiClient.put(`${this.baseUrl}/${pdfExport.id.value}`, data);
        const updatedData = response.data;

        // 更新缓存
        this.cache.set(updatedData.id, updatedData);

        return PdfExport.fromJSON(updatedData);
      }
    } catch (error) {
      console.error('保存导出任务失败:', error);
      throw new Error(`保存导出任务失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找导出任务
   */
  async findById(id) {
    try {
      // 先检查缓存
      const cachedData = this.cache.get(id);
      if (cachedData) {
        return PdfExport.fromJSON(cachedData);
      }

      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      const data = response.data;

      // 缓存数据
      this.cache.set(id, data);

      return PdfExport.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('查找导出任务失败:', error);
      throw new Error(`查找导出任务失败: ${error.message}`);
    }
  }

  /**
   * 根据项目ID查找导出任务
   */
  async findByProjectId(projectId, filters = {}) {
    try {
      const params = new URLSearchParams();
      params.append('projectId', projectId);

      if (filters.format) {
        params.append('format', filters.format);
      }

      if (filters.status) {
        params.append('status', filters.status);
      }

      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }

      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
      const data = response.data;

      // 缓存数据
      data.items.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.items.map(item => PdfExport.fromJSON(item));
    } catch (error) {
      console.error('根据项目ID查找导出任务失败:', error);
      throw new Error(`根据项目ID查找导出任务失败: ${error.message}`);
    }
  }

  /**
   * 查找所有导出任务
   */
  async findAll(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.format) {
        params.append('format', filters.format);
      }

      if (filters.status) {
        params.append('status', filters.status);
      }

      if (filters.requestedBy) {
        params.append('requestedBy', filters.requestedBy);
      }

      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }

      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      if (filters.page) {
        params.append('page', filters.page);
      }

      if (filters.pageSize) {
        params.append('pageSize', filters.pageSize);
      }

      const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
      const data = response.data;

      // 缓存数据
      data.items.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.items.map(item => PdfExport.fromJSON(item));
    } catch (error) {
      console.error('查找导出任务列表失败:', error);
      throw new Error(`查找导出任务列表失败: ${error.message}`);
    }
  }

  /**
   * 删除导出任务
   */
  async delete(id) {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);

      // 从缓存中删除
      this.cache.delete(id);

      // 取消正在进行的下载
      if (this.activeDownloads.has(id)) {
        const controller = this.activeDownloads.get(id);
        controller.abort();
        this.activeDownloads.delete(id);
      }
    } catch (error) {
      console.error('删除导出任务失败:', error);
      throw new Error(`删除导出任务失败: ${error.message}`);
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 从缓存中获取（同步方法）
   */
  getFromCache(id) {
    const cachedData = this.cache.get(id);
    return cachedData ? PdfExport.fromJSON(cachedData) : null;
  }

  /**
   * 获取导出统计
   */
  async getStats(projectId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stats/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('获取导出统计失败:', error);
      throw new Error(`获取导出统计失败: ${error.message}`);
    }
  }

  /**
   * 下载导出文件
   */
  async downloadFile(exportId, onProgress) {
    try {
      // 创建中止控制器
      const controller = new AbortController();
      this.activeDownloads.set(exportId, controller);

      const config = {
        signal: controller.signal,
        responseType: 'blob',
        onDownloadProgress: progressEvent => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        }
      };

      const response = await apiClient.get(`${this.baseUrl}/${exportId}/download`, config);

      // 清理下载记录
      this.activeDownloads.delete(exportId);

      return response.data;
    } catch (error) {
      // 清理下载记录
      this.activeDownloads.delete(exportId);

      if (error.name === 'AbortError') {
        throw new Error('下载已取消');
      }

      console.error('下载导出文件失败:', error);
      throw new Error(`下载导出文件失败: ${error.message}`);
    }
  }

  /**
   * 取消下载
   */
  cancelDownload(exportId) {
    if (this.activeDownloads.has(exportId)) {
      const controller = this.activeDownloads.get(exportId);
      controller.abort();
      this.activeDownloads.delete(exportId);
      return true;
    }
    return false;
  }

  /**
   * 批量删除
   */
  async batchDelete(ids) {
    try {
      const response = await apiClient.delete(this.baseUrl, {
        data: { ids }
      });

      // 从缓存中删除
      ids.forEach(id => {
        this.cache.delete(id);
      });

      return response.data;
    } catch (error) {
      console.error('批量删除导出任务失败:', error);
      throw new Error(`批量删除导出任务失败: ${error.message}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  async checkFileExists(exportId) {
    try {
      const response = await apiClient.head(`${this.baseUrl}/${exportId}/download`);
      return response.status === 200;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return false;
      }
      console.error('检查文件存在失败:', error);
      throw new Error(`检查文件存在失败: ${error.message}`);
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(exportId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${exportId}/file-info`);
      return response.data;
    } catch (error) {
      console.error('获取文件信息失败:', error);
      throw new Error(`获取文件信息失败: ${error.message}`);
    }
  }

  /**
   * 重试失败的导出
   */
  async retryFailedExport(exportId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${exportId}/retry`);
      const data = response.data;

      // 更新缓存
      this.cache.set(data.id, data);

      return PdfExport.fromJSON(data);
    } catch (error) {
      console.error('重试导出失败:', error);
      throw new Error(`重试导出失败: ${error.message}`);
    }
  }

  /**
   * 获取导出模板
   */
  async getExportTemplates() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/templates`);
      return response.data;
    } catch (error) {
      console.error('获取导出模板失败:', error);
      throw new Error(`获取导出模板失败: ${error.message}`);
    }
  }

  /**
   * 预览导出内容
   */
  async previewContent(exportId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${exportId}/preview`);
      return response.data;
    } catch (error) {
      console.error('预览导出内容失败:', error);
      throw new Error(`预览导出内容失败: ${error.message}`);
    }
  }
}

export default PdfExportRepository;
