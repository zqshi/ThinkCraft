/**
 * 分享API服务
 * 处理与后端API的通信
 */
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class ShareApiService {
  constructor() {
    this.baseUrl = '/api/shares';
  }

  /**
   * 创建分享
   */
  async createShare(shareData) {
    const response = await apiClient.post(this.baseUrl, shareData);
    return response.data;
  }

  /**
   * 获取分享
   */
  async getShare(shareId) {
    const response = await apiClient.get(`${this.baseUrl}/${shareId}`);
    return response.data;
  }

  /**
   * 获取分享列表
   */
  async getShares(filters = {}) {
    const response = await apiClient.get(this.baseUrl, { params: filters });
    return response.data;
  }

  /**
   * 更新分享
   */
  async updateShare(shareId, updateData) {
    const response = await apiClient.put(`${this.baseUrl}/${shareId}`, updateData);
    return response.data;
  }

  /**
   * 删除分享
   */
  async deleteShare(shareId) {
    await apiClient.delete(`${this.baseUrl}/${shareId}`);
  }

  /**
   * 验证分享密码
   */
  async verifyPassword(shareId, password) {
    const response = await apiClient.post(`${this.baseUrl}/${shareId}/verify`, { password });
    return response.data;
  }
}

export default ShareApiService;
