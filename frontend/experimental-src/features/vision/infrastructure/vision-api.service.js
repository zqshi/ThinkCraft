/**
 * 视觉任务API服务
 * 处理与后端API的通信
 */
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class VisionApiService {
  constructor() {
    this.baseUrl = '/api/vision';
  }

  async createTask(taskData) {
    const response = await apiClient.post(`${this.baseUrl}/tasks`, taskData);
    return response.data;
  }

  async getTask(taskId) {
    const response = await apiClient.get(`${this.baseUrl}/tasks/${taskId}`);
    return response.data;
  }

  async getTasks(filters = {}) {
    const response = await apiClient.get(`${this.baseUrl}/tasks`, { params: filters });
    return response.data;
  }

  async processTask(taskId) {
    const response = await apiClient.post(`${this.baseUrl}/tasks/${taskId}/process`);
    return response.data;
  }

  async getTaskStatus(taskId) {
    const response = await apiClient.get(`${this.baseUrl}/tasks/${taskId}/status`);
    return response.data;
  }

  async deleteTask(taskId) {
    await apiClient.delete(`${this.baseUrl}/tasks/${taskId}`);
  }
}

export default VisionApiService;
