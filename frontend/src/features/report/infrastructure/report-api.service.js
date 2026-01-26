/**
 * 报告API服务
 */
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class ReportApiService {
  constructor() {
    this.baseUrl = '/api/report';
  }

  /**
   * 创建报告
   */
  async createReport(data) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/create`, data);
      return response.data;
    } catch (error) {
      console.error('创建报告API调用失败:', error);
      throw new Error('创建报告失败');
    }
  }

  /**
   * 获取报告
   */
  async getReport(reportId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('获取报告API调用失败:', error);
      throw new Error('获取报告失败');
    }
  }

  /**
   * 获取项目的报告列表
   */
  async getReportsByProject(projectId, filters = {}) {
    try {
      const params = new URLSearchParams({
        projectId,
        ...filters
      });
      const response = await apiClient.get(`${this.baseUrl}/project?${params}`);
      return response.data;
    } catch (error) {
      console.error('获取项目报告API调用失败:', error);
      throw new Error('获取项目报告失败');
    }
  }

  /**
   * 添加章节
   */
  async addSection(reportId, sectionData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${reportId}/sections`, sectionData);
      return response.data;
    } catch (error) {
      console.error('添加章节API调用失败:', error);
      throw new Error('添加章节失败');
    }
  }

  /**
   * 更新章节
   */
  async updateSection(reportId, sectionIndex, sectionData) {
    try {
      const response = await apiClient.put(
        `${this.baseUrl}/${reportId}/sections/${sectionIndex}`,
        sectionData
      );
      return response.data;
    } catch (error) {
      console.error('更新章节API调用失败:', error);
      throw new Error('更新章节失败');
    }
  }

  /**
   * 删除章节
   */
  async removeSection(reportId, sectionIndex) {
    try {
      const response = await apiClient.delete(
        `${this.baseUrl}/${reportId}/sections/${sectionIndex}`
      );
      return response.data;
    } catch (error) {
      console.error('删除章节API调用失败:', error);
      throw new Error('删除章节失败');
    }
  }

  /**
   * 生成报告内容
   */
  async generateReportContent(reportId, generateData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${reportId}/generate`, generateData);
      return response.data;
    } catch (error) {
      console.error('生成报告内容API调用失败:', error);
      throw new Error('生成报告内容失败');
    }
  }

  /**
   * 更新报告状态
   */
  async updateStatus(reportId, status, options = {}) {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${reportId}/status`, {
        status,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('更新报告状态API调用失败:', error);
      throw new Error('更新报告状态失败');
    }
  }

  /**
   * 更新报告信息
   */
  async updateReportInfo(reportId, infoData) {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${reportId}/info`, infoData);
      return response.data;
    } catch (error) {
      console.error('更新报告信息API调用失败:', error);
      throw new Error('更新报告信息失败');
    }
  }

  /**
   * 删除报告
   */
  async deleteReport(reportId) {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${reportId}`);
      return response.data;
    } catch (error) {
      console.error('删除报告API调用失败:', error);
      throw new Error('删除报告失败');
    }
  }

  /**
   * 导出报告
   */
  async exportReport(reportId, format) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${reportId}/export`, { format });
      return response.data;
    } catch (error) {
      console.error('导出报告API调用失败:', error);
      throw new Error('导出报告失败');
    }
  }

  /**
   * 分享报告
   */
  async shareReport(reportId, shareOptions) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${reportId}/share`, shareOptions);
      return response.data;
    } catch (error) {
      console.error('分享报告API调用失败:', error);
      throw new Error('分享报告失败');
    }
  }

  /**
   * 获取报告统计
   */
  async getReportStats(projectId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/stats/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('获取报告统计API调用失败:', error);
      throw new Error('获取报告统计失败');
    }
  }

  /**
   * 获取报告模板
   */
  async getReportTemplates() {
    try {
      const response = await apiClient.get(`${this.baseUrl}/templates`);
      return response.data;
    } catch (error) {
      console.error('获取报告模板API调用失败:', error);
      throw new Error('获取报告模板失败');
    }
  }

  /**
   * 批量操作
   */
  async batchUpdate(reportIds, updateData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/batch`, {
        reportIds,
        updateData
      });
      return response.data;
    } catch (error) {
      console.error('批量更新报告API调用失败:', error);
      throw new Error('批量更新报告失败');
    }
  }
}
