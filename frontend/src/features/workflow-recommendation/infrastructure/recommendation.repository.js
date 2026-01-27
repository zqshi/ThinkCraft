/**
 * 工作流推荐仓库
 * 处理工作流推荐的数据持久化
 */
import { WorkflowRecommendation } from '../domain/recommendation.aggregate.js';
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class RecommendationRepository {
  constructor() {
    this.baseUrl = '/api/workflow-recommendations';
    this.cache = new Map();
  }

  /**
   * 保存推荐
   */
  async save(recommendation) {
    try {
      const data = recommendation.toJSON();

      if (recommendation.isNew) {
        const response = await apiClient.post(this.baseUrl, data);
        const savedData = response.data;

        // 更新缓存
        this.cache.set(savedData.id, savedData);

        return WorkflowRecommendation.fromJSON(savedData);
      } else {
        const response = await apiClient.put(
          `${this.baseUrl}/${recommendation.id.value}`,
          data
        );
        const updatedData = response.data;

        // 更新缓存
        this.cache.set(updatedData.id, updatedData);

        return WorkflowRecommendation.fromJSON(updatedData);
      }
    } catch (error) {
      console.error('保存推荐失败:', error);
      throw new Error(`保存推荐失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找推荐
   */
  async findById(id) {
    try {
      // 先检查缓存
      const cachedData = this.cache.get(id);
      if (cachedData) {
        return WorkflowRecommendation.fromJSON(cachedData);
      }

      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      const data = response.data;

      // 缓存数据
      this.cache.set(id, data);

      return WorkflowRecommendation.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('查找推荐失败:', error);
      throw new Error(`查找推荐失败: ${error.message}`);
    }
  }

  /**
   * 根据项目ID查找推荐
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

      return data.map(item => WorkflowRecommendation.fromJSON(item));
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return [];
      }
      console.error('根据项目ID查找推荐失败:', error);
      throw new Error(`根据项目ID查找推荐失败: ${error.message}`);
    }
  }

  /**
   * 查找所有推荐
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

      if (filters.confidenceLevel) {
        params.append('confidenceLevel', filters.confidenceLevel);
      }

      if (filters.includeExpired !== undefined) {
        params.append('includeExpired', filters.includeExpired);
      }

      const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
      const data = response.data;

      // 缓存所有数据
      data.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.map(item => WorkflowRecommendation.fromJSON(item));
    } catch (error) {
      console.error('查找推荐列表失败:', error);
      throw new Error(`查找推荐列表失败: ${error.message}`);
    }
  }

  /**
   * 删除推荐
   */
  async delete(id) {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);

      // 从缓存中删除
      this.cache.delete(id);
    } catch (error) {
      console.error('删除推荐失败:', error);
      throw new Error(`删除推荐失败: ${error.message}`);
    }
  }

  /**
   * 生成推荐
   */
  async generate(projectId, analysisData, generatedBy) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/generate`, {
        projectId,
        analysisData,
        generatedBy
      });

      const data = response.data;
      this.cache.set(data.id, data);

      return WorkflowRecommendation.fromJSON(data);
    } catch (error) {
      console.error('生成推荐失败:', error);
      throw new Error(`生成推荐失败: ${error.message}`);
    }
  }

  /**
   * 接受推荐
   */
  async accept(recommendationId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${recommendationId}/accept`);
      const data = response.data;

      // 更新缓存
      this.cache.set(recommendationId, data);

      return WorkflowRecommendation.fromJSON(data);
    } catch (error) {
      console.error('接受推荐失败:', error);
      throw new Error(`接受推荐失败: ${error.message}`);
    }
  }

  /**
   * 拒绝推荐
   */
  async reject(recommendationId, reason) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${recommendationId}/reject`, {
        reason
      });
      const data = response.data;

      // 更新缓存
      this.cache.set(recommendationId, data);

      return WorkflowRecommendation.fromJSON(data);
    } catch (error) {
      console.error('拒绝推荐失败:', error);
      throw new Error(`拒绝推荐失败: ${error.message}`);
    }
  }

  /**
   * 实施推荐项
   */
  async implementItem(recommendationId, itemId) {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/${recommendationId}/items/${itemId}/implement`
      );
      const data = response.data;

      // 更新缓存
      this.cache.set(recommendationId, data);

      return WorkflowRecommendation.fromJSON(data);
    } catch (error) {
      console.error('实施推荐项失败:', error);
      throw new Error(`实施推荐项失败: ${error.message}`);
    }
  }

  /**
   * 添加推荐项反馈
   */
  async addItemFeedback(recommendationId, itemId, feedback) {
    try {
      const response = await apiClient.post(
        `${this.baseUrl}/${recommendationId}/items/${itemId}/feedback`,
        { feedback }
      );
      const data = response.data;

      // 更新缓存
      this.cache.set(recommendationId, data);

      return WorkflowRecommendation.fromJSON(data);
    } catch (error) {
      console.error('添加反馈失败:', error);
      throw new Error(`添加反馈失败: ${error.message}`);
    }
  }

  /**
   * 获取推荐统计
   */
  async getStats(recommendationId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${recommendationId}/stats`);
      return response.data;
    } catch (error) {
      console.error('获取推荐统计失败:', error);
      throw new Error(`获取推荐统计失败: ${error.message}`);
    }
  }

  /**
   * 获取项目的推荐统计
   */
  async getProjectStats(projectId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/project/${projectId}/stats`);
      return response.data;
    } catch (error) {
      console.error('获取项目推荐统计失败:', error);
      throw new Error(`获取项目推荐统计失败: ${error.message}`);
    }
  }

  /**
   * 获取待处理的推荐
   */
  async getPending(projectId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/project/${projectId}/pending`);
      const data = response.data;

      // 缓存所有数据
      data.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.map(item => WorkflowRecommendation.fromJSON(item));
    } catch (error) {
      console.error('获取待处理推荐失败:', error);
      throw new Error(`获取待处理推荐失败: ${error.message}`);
    }
  }

  /**
   * 获取高优先级推荐项
   */
  async getHighPriorityItems(projectId) {
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/project/${projectId}/high-priority-items`
      );
      return response.data;
    } catch (error) {
      console.error('获取高优先级推荐项失败:', error);
      throw new Error(`获取高优先级推荐项失败: ${error.message}`);
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
    return cachedData ? WorkflowRecommendation.fromJSON(cachedData) : null;
  }
}

export default RecommendationRepository;
