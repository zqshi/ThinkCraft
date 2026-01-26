/**
 * 工作流推荐API服务
 * 处理与后端API的通信
 */
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class RecommendationApiService {
  constructor() {
    this.baseUrl = '/api/recommendations';
  }

  async getRecommendations(projectId, filters = {}) {
    const response = await apiClient.get(`${this.baseUrl}/project/${projectId}`, { params: filters });
    return response.data;
  }

  async createRecommendation(recommendationData) {
    const response = await apiClient.post(this.baseUrl, recommendationData);
    return response.data;
  }

  async getRecommendation(recommendationId) {
    const response = await apiClient.get(`${this.baseUrl}/${recommendationId}`);
    return response.data;
  }

  async acceptRecommendation(recommendationId) {
    const response = await apiClient.post(`${this.baseUrl}/${recommendationId}/accept`);
    return response.data;
  }

  async rejectRecommendation(recommendationId, reason) {
    const response = await apiClient.post(`${this.baseUrl}/${recommendationId}/reject`, { reason });
    return response.data;
  }

  async deleteRecommendation(recommendationId) {
    await apiClient.delete(`${this.baseUrl}/${recommendationId}`);
  }
}

export default RecommendationApiService;
