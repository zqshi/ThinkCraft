/**
 * 商业计划书仓库
 * 处理商业计划书的数据持久化
 */
import { BusinessPlan } from '../domain/business-plan.aggregate.js';
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class BusinessPlanRepository {
  constructor() {
    this.baseUrl = '/api/business-plans';
    this.cache = new Map();
  }

  /**
   * 保存商业计划书
   */
  async save(businessPlan) {
    try {
      const data = businessPlan.toJSON();

      if (businessPlan.isNew) {
        const response = await apiClient.post(this.baseUrl, data);
        const savedData = response.data;

        // 更新缓存
        this.cache.set(savedData.id, savedData);

        return BusinessPlan.fromJSON(savedData);
      } else {
        const response = await apiClient.put(`${this.baseUrl}/${businessPlan.id.value}`, data);
        const updatedData = response.data;

        // 更新缓存
        this.cache.set(updatedData.id, updatedData);

        return BusinessPlan.fromJSON(updatedData);
      }
    } catch (error) {
      console.error('保存商业计划书失败:', error);
      throw new Error(`保存商业计划书失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找商业计划书
   */
  async findById(id) {
    try {
      // 先检查缓存
      const cachedData = this.cache.get(id);
      if (cachedData) {
        return BusinessPlan.fromJSON(cachedData);
      }

      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      const data = response.data;

      // 缓存数据
      this.cache.set(id, data);

      return BusinessPlan.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('查找商业计划书失败:', error);
      throw new Error(`查找商业计划书失败: ${error.message}`);
    }
  }

  /**
   * 根据项目ID查找商业计划书
   */
  async findByProjectId(projectId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/project/${projectId}`);
      const data = response.data;

      if (!data) {
        return null;
      }

      // 缓存数据
      this.cache.set(data.id, data);

      return BusinessPlan.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('根据项目ID查找商业计划书失败:', error);
      throw new Error(`根据项目ID查找商业计划书失败: ${error.message}`);
    }
  }

  /**
   * 查找所有商业计划书
   */
  async findAll(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.status) {
        params.append('status', filters.status);
      }

      if (filters.projectId) {
        params.append('projectId', filters.projectId);
      }

      if (filters.generatedBy) {
        params.append('generatedBy', filters.generatedBy);
      }

      const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
      const data = response.data;

      // 缓存所有数据
      data.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.map(item => BusinessPlan.fromJSON(item));
    } catch (error) {
      console.error('查找商业计划书列表失败:', error);
      throw new Error(`查找商业计划书列表失败: ${error.message}`);
    }
  }

  /**
   * 删除商业计划书
   */
  async delete(id) {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);

      // 从缓存中删除
      this.cache.delete(id);
    } catch (error) {
      console.error('删除商业计划书失败:', error);
      throw new Error(`删除商业计划书失败: ${error.message}`);
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
    return cachedData ? BusinessPlan.fromJSON(cachedData) : null;
  }
}
