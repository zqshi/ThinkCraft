/**
 * 工作流API服务
 * 处理与后端API的通信
 */
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class WorkflowApiService {
  constructor() {
    this.baseUrl = '/api/workflows';
  }

  async createWorkflow(workflowData) {
    const response = await apiClient.post(this.baseUrl, workflowData);
    return response.data;
  }

  async getWorkflow(workflowId) {
    const response = await apiClient.get(`${this.baseUrl}/${workflowId}`);
    return response.data;
  }

  async getWorkflows(filters = {}) {
    const response = await apiClient.get(this.baseUrl, { params: filters });
    return response.data;
  }

  async updateWorkflow(workflowId, updateData) {
    const response = await apiClient.put(`${this.baseUrl}/${workflowId}`, updateData);
    return response.data;
  }

  async deleteWorkflow(workflowId) {
    await apiClient.delete(`${this.baseUrl}/${workflowId}`);
  }

  async executeWorkflow(workflowId, inputData) {
    const response = await apiClient.post(`${this.baseUrl}/${workflowId}/execute`, inputData);
    return response.data;
  }

  async getWorkflowStatus(workflowId) {
    const response = await apiClient.get(`${this.baseUrl}/${workflowId}/status`);
    return response.data;
  }
}

export default WorkflowApiService;
