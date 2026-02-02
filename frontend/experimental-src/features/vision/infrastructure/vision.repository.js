/**
 * 视觉任务仓库
 * 处理视觉任务的数据持久化
 */
import { VisionTask } from '../domain/vision.aggregate.js';
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class VisionRepository {
  constructor() {
    this.baseUrl = '/api/vision';
    this.cache = new Map();
  }

  /**
   * 保存视觉任务
   */
  async save(visionTask) {
    try {
      const data = visionTask.toJSON();

      if (visionTask.isNew) {
        const response = await apiClient.post(this.baseUrl, data);
        const savedData = response.data;

        // 更新缓存
        this.cache.set(savedData.id, savedData);

        return VisionTask.fromJSON(savedData);
      } else {
        const response = await apiClient.put(`${this.baseUrl}/${visionTask.id.value}`, data);
        const updatedData = response.data;

        // 更新缓存
        this.cache.set(updatedData.id, updatedData);

        return VisionTask.fromJSON(updatedData);
      }
    } catch (error) {
      console.error('保存视觉任务失败:', error);
      throw new Error(`保存视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找视觉任务
   */
  async findById(id) {
    try {
      // 先检查缓存
      const cachedData = this.cache.get(id);
      if (cachedData) {
        return VisionTask.fromJSON(cachedData);
      }

      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      const data = response.data;

      // 缓存数据
      this.cache.set(id, data);

      return VisionTask.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('查找视觉任务失败:', error);
      throw new Error(`查找视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 查找所有视觉任务
   */
  async findAll(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.taskType) {
        params.append('taskType', filters.taskType);
      }

      if (filters.status) {
        params.append('status', filters.status);
      }

      if (filters.createdBy) {
        params.append('createdBy', filters.createdBy);
      }

      if (filters.startDate) {
        params.append('startDate', filters.startDate);
      }

      if (filters.endDate) {
        params.append('endDate', filters.endDate);
      }

      const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
      const data = response.data;

      // 缓存所有数据
      data.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.map(item => VisionTask.fromJSON(item));
    } catch (error) {
      console.error('查找视觉任务列表失败:', error);
      throw new Error(`查找视觉任务列表失败: ${error.message}`);
    }
  }

  /**
   * 删除视觉任务
   */
  async delete(id) {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);

      // 从缓存中删除
      this.cache.delete(id);
    } catch (error) {
      console.error('删除视觉任务失败:', error);
      throw new Error(`删除视觉任务失败: ${error.message}`);
    }
  }

  /**
   * 创建图片分析任务
   */
  async createImageAnalysis(imageData, prompt, createdBy) {
    try {
      const formData = new FormData();
      formData.append('taskType', 'IMAGE_ANALYSIS');
      formData.append('image', imageData);
      if (prompt) {
        formData.append('prompt', prompt);
      }
      if (createdBy) {
        formData.append('createdBy', createdBy);
      }

      const response = await apiClient.post(`${this.baseUrl}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;
      this.cache.set(data.id, data);

      return VisionTask.fromJSON(data);
    } catch (error) {
      console.error('创建图片分析任务失败:', error);
      throw new Error(`创建图片分析任务失败: ${error.message}`);
    }
  }

  /**
   * 创建OCR任务
   */
  async createOCR(imageData, createdBy) {
    try {
      const formData = new FormData();
      formData.append('taskType', 'OCR');
      formData.append('image', imageData);
      if (createdBy) {
        formData.append('createdBy', createdBy);
      }

      const response = await apiClient.post(`${this.baseUrl}/ocr`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;
      this.cache.set(data.id, data);

      return VisionTask.fromJSON(data);
    } catch (error) {
      console.error('创建OCR任务失败:', error);
      throw new Error(`创建OCR任务失败: ${error.message}`);
    }
  }

  /**
   * 创建对象检测任务
   */
  async createObjectDetection(imageData, prompt, createdBy) {
    try {
      const formData = new FormData();
      formData.append('taskType', 'OBJECT_DETECTION');
      formData.append('image', imageData);
      if (prompt) {
        formData.append('prompt', prompt);
      }
      if (createdBy) {
        formData.append('createdBy', createdBy);
      }

      const response = await apiClient.post(`${this.baseUrl}/detect`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;
      this.cache.set(data.id, data);

      return VisionTask.fromJSON(data);
    } catch (error) {
      console.error('创建对象检测任务失败:', error);
      throw new Error(`创建对象检测任务失败: ${error.message}`);
    }
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${taskId}/status`);
      return response.data;
    } catch (error) {
      console.error('获取任务状态失败:', error);
      throw new Error(`获取任务状态失败: ${error.message}`);
    }
  }

  /**
   * 获取任务结果
   */
  async getTaskResult(taskId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${taskId}/result`);
      return response.data;
    } catch (error) {
      console.error('获取任务结果失败:', error);
      throw new Error(`获取任务结果失败: ${error.message}`);
    }
  }

  /**
   * 取消任务
   */
  async cancelTask(taskId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${taskId}/cancel`);
      const data = response.data;

      // 更新缓存
      this.cache.set(taskId, data);

      return VisionTask.fromJSON(data);
    } catch (error) {
      console.error('取消任务失败:', error);
      throw new Error(`取消任务失败: ${error.message}`);
    }
  }

  /**
   * 重试任务
   */
  async retryTask(taskId) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${taskId}/retry`);
      const data = response.data;

      // 更新缓存
      this.cache.set(data.id, data);

      return VisionTask.fromJSON(data);
    } catch (error) {
      console.error('重试任务失败:', error);
      throw new Error(`重试任务失败: ${error.message}`);
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
    return cachedData ? VisionTask.fromJSON(cachedData) : null;
  }
}

export default VisionRepository;
