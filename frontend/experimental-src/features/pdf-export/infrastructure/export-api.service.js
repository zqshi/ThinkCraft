/**
 * PDF导出API服务
 */
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class ExportApiService {
  constructor() {
    this.baseUrl = '/api/pdf-export';
  }

  /**
   * 创建导出任务
   */
  async createExport(data) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/create`, data);
      return response.data;
    } catch (error) {
      console.error('创建导出任务API调用失败:', error);
      throw new Error('创建导出任务失败');
    }
  }

  /**
   * 获取导出任务
   */
  async getExport(id) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取导出任务API调用失败:', error);
      throw new Error('获取导出任务失败');
    }
  }

  /**
   * 获取项目的导出任务列表
   */
  async getExportsByProject(projectId, filters = {}) {
    try {
      const params = new URLSearchParams({
        projectId,
        ...filters
      });
      const response = await apiClient.get(`${this.baseUrl}/project?${params}`);
      return response.data;
    } catch (error) {
      console.error('获取项目导出任务API调用失败:', error);
      throw new Error('获取项目导出任务失败');
    }
  }

  /**
   * 开始处理导出
   */
  async processExport(exportId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${exportId}/process`);
      return response.data;
    } catch (error) {
      console.error('处理导出API调用失败:', error);
      throw new Error('处理导出失败');
    }
  }

  /**
   * 获取导出状态
   */
  async getExportStatus(exportId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${exportId}/status`);
      return response.data;
    } catch (error) {
      console.error('获取导出状态API调用失败:', error);
      throw new Error('获取导出状态失败');
    }
  }

  /**
   * 删除导出任务
   */
  async deleteExport(exportId) {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${exportId}`);
      return response.data;
    } catch (error) {
      console.error('删除导出任务API调用失败:', error);
      throw new Error('删除导出任务失败');
    }
  }

  /**
   * 获取下载URL
   */
  async getDownloadUrl(exportId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${exportId}/download`);
      return response.data;
    } catch (error) {
      console.error('获取下载URL API调用失败:', error);
      throw new Error('获取下载URL失败');
    }
  }

  /**
   * 批量导出
   */
  async batchExport(requests) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/batch`, { requests });
      return response.data;
    } catch (error) {
      console.error('批量导出API调用失败:', error);
      throw new Error('批量导出失败');
    }
  }

  /**
   * 获取导出统计
   */
  async getExportStats(projectId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stats/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('获取导出统计API调用失败:', error);
      throw new Error('获取导出统计失败');
    }
  }
}
