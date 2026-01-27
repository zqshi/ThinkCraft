/**
 * 工作流仓库
 * 处理工作流的数据持久化
 */
import { Workflow } from '../domain/workflow.aggregate.js';
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class WorkflowRepository {
  constructor() {
    this.baseUrl = '/api/workflows';
    this.cache = new Map();
  }

  /**
   * 保存工作流
   */
  async save(workflow) {
    try {
      const data = workflow.toJSON();

      if (workflow.isNew) {
        const response = await apiClient.post(this.baseUrl, data);
        const savedData = response.data;

        // 更新缓存
        this.cache.set(savedData.id, savedData);

        return Workflow.fromJSON(savedData);
      } else {
        const response = await apiClient.put(`${this.baseUrl}/${workflow.id.value}`, data);
        const updatedData = response.data;

        // 更新缓存
        this.cache.set(updatedData.id, updatedData);

        return Workflow.fromJSON(updatedData);
      }
    } catch (error) {
      console.error('保存工作流失败:', error);
      throw new Error(`保存工作流失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找工作流
   */
  async findById(id) {
    try {
      // 先检查缓存
      const cachedData = this.cache.get(id);
      if (cachedData) {
        return Workflow.fromJSON(cachedData);
      }

      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      const data = response.data;

      // 缓存数据
      this.cache.set(id, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('查找工作流失败:', error);
      throw new Error(`查找工作流失败: ${error.message}`);
    }
  }

  /**
   * 根据项目ID查找工作流
   */
  async findByProjectId(projectId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/project/${projectId}`);
      const data = response.data;

      if (!data || data.length === 0) {
        return [];
      }

      // 缓存所有数据
      data.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.map(item => Workflow.fromJSON(item));
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return [];
      }
      console.error('根据项目ID查找工作流失败:', error);
      throw new Error(`根据项目ID查找工作流失败: ${error.message}`);
    }
  }

  /**
   * 查找所有工作流
   */
  async findAll(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.type) {
        params.append('type', filters.type);
      }

      if (filters.status) {
        params.append('status', filters.status);
      }

      if (filters.projectId) {
        params.append('projectId', filters.projectId);
      }

      if (filters.createdBy) {
        params.append('createdBy', filters.createdBy);
      }

      const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
      const data = response.data;

      // 缓存所有数据
      data.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.map(item => Workflow.fromJSON(item));
    } catch (error) {
      console.error('查找工作流列表失败:', error);
      throw new Error(`查找工作流列表失败: ${error.message}`);
    }
  }

  /**
   * 删除工作流
   */
  async delete(id) {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);

      // 从缓存中删除
      this.cache.delete(id);
    } catch (error) {
      console.error('删除工作流失败:', error);
      throw new Error(`删除工作流失败: ${error.message}`);
    }
  }

  /**
   * 启动工作流
   */
  async start(workflowId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/start`);
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('启动工作流失败:', error);
      throw new Error(`启动工作流失败: ${error.message}`);
    }
  }

  /**
   * 暂停工作流
   */
  async pause(workflowId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/pause`);
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('暂停工作流失败:', error);
      throw new Error(`暂停工作流失败: ${error.message}`);
    }
  }

  /**
   * 恢复工作流
   */
  async resume(workflowId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/resume`);
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('恢复工作流失败:', error);
      throw new Error(`恢复工作流失败: ${error.message}`);
    }
  }

  /**
   * 完成工作流
   */
  async complete(workflowId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/complete`);
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('完成工作流失败:', error);
      throw new Error(`完成工作流失败: ${error.message}`);
    }
  }

  /**
   * 取消工作流
   */
  async cancel(workflowId, reason) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/cancel`, {
        reason
      });
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('取消工作流失败:', error);
      throw new Error(`取消工作流失败: ${error.message}`);
    }
  }

  /**
   * 执行下一步
   */
  async nextStep(workflowId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/next-step`);
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('执行下一步失败:', error);
      throw new Error(`执行下一步失败: ${error.message}`);
    }
  }

  /**
   * 添加步骤
   */
  async addStep(workflowId, stepData) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${workflowId}/steps`, stepData);
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('添加步骤失败:', error);
      throw new Error(`添加步骤失败: ${error.message}`);
    }
  }

  /**
   * 移除步骤
   */
  async removeStep(workflowId, stepId) {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${workflowId}/steps/${stepId}`);
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('移除步骤失败:', error);
      throw new Error(`移除步骤失败: ${error.message}`);
    }
  }

  /**
   * 完成步骤
   */
  async completeStep(workflowId, stepId, comment) {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/${workflowId}/steps/${stepId}/complete`,
        { comment }
      );
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('完成步骤失败:', error);
      throw new Error(`完成步骤失败: ${error.message}`);
    }
  }

  /**
   * 跳过步骤
   */
  async skipStep(workflowId, stepId, reason) {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/${workflowId}/steps/${stepId}/skip`,
        { reason }
      );
      const data = response.data;

      // 更新缓存
      this.cache.set(workflowId, data);

      return Workflow.fromJSON(data);
    } catch (error) {
      console.error('跳过步骤失败:', error);
      throw new Error(`跳过步骤失败: ${error.message}`);
    }
  }

  /**
   * 获取工作流进度
   */
  async getProgress(workflowId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${workflowId}/progress`);
      return response.data;
    } catch (error) {
      console.error('获取工作流进度失败:', error);
      throw new Error(`获取工作流进度失败: ${error.message}`);
    }
  }

  /**
   * 获取工作流时间线
   */
  async getTimeline(workflowId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${workflowId}/timeline`);
      return response.data;
    } catch (error) {
      console.error('获取工作流时间线失败:', error);
      throw new Error(`获取工作流时间线失败: ${error.message}`);
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
    return cachedData ? Workflow.fromJSON(cachedData) : null;
  }
}

export default WorkflowRepository;
