/**
 * 演示项目仓库
 * 处理演示项目的数据持久化
 */
import { Demo } from '../domain/demo.aggregate.js';
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class DemoRepository {
  constructor() {
    this.baseUrl = '/api/demos';
    this.cache = new Map();
  }

  /**
   * 保存演示项目
   */
  async save(demo) {
    try {
      const data = demo.toJSON();

      if (demo.isNew) {
        const response = await apiClient.post(this.baseUrl, data);
        const savedData = response.data;

        // 更新缓存
        this.cache.set(savedData.id, savedData);

        return Demo.fromJSON(savedData);
      } else {
        const response = await apiClient.put(`${this.baseUrl}/${demo.id.value}`, data);
        const updatedData = response.data;

        // 更新缓存
        this.cache.set(updatedData.id, updatedData);

        return Demo.fromJSON(updatedData);
      }
    } catch (error) {
      console.error('保存演示项目失败:', error);
      throw new Error(`保存演示项目失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找演示项目
   */
  async findById(id) {
    try {
      // 先检查缓存
      const cachedData = this.cache.get(id);
      if (cachedData) {
        return Demo.fromJSON(cachedData);
      }

      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      const data = response.data;

      // 缓存数据
      this.cache.set(id, data);

      return Demo.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('查找演示项目失败:', error);
      throw new Error(`查找演示项目失败: ${error.message}`);
    }
  }

  /**
   * 根据项目ID查找演示项目
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

      return Demo.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('根据项目ID查找演示项目失败:', error);
      throw new Error(`根据项目ID查找演示项目失败: ${error.message}`);
    }
  }

  /**
   * 查找所有演示项目
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

      return data.map(item => Demo.fromJSON(item));
    } catch (error) {
      console.error('查找演示项目列表失败:', error);
      throw new Error(`查找演示项目列表失败: ${error.message}`);
    }
  }

  /**
   * 删除演示项目
   */
  async delete(id) {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);

      // 从缓存中删除
      this.cache.delete(id);
    } catch (error) {
      console.error('删除演示项目失败:', error);
      throw new Error(`删除演示项目失败: ${error.message}`);
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
    return cachedData ? Demo.fromJSON(cachedData) : null;
  }

  /**
   * 获取生成状态
   */
  async getGenerationStatus(demoId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${demoId}/status`);
      return response.data;
    } catch (error) {
      console.error('获取生成状态失败:', error);
      throw new Error(`获取生成状态失败: ${error.message}`);
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(demoId, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(`${this.baseUrl}/${demoId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('上传文件失败:', error);
      throw new Error(`上传文件失败: ${error.message}`);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(demoId, filePath) {
    try {
      await apiClient.delete(`${this.baseUrl}/${demoId}/files`, {
        data: { filePath }
      });
    } catch (error) {
      console.error('删除文件失败:', error);
      throw new Error(`删除文件失败: ${error.message}`);
    }
  }
}
