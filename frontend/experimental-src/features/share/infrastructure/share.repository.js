/**
 * 分享仓库
 * 处理分享的数据持久化
 */
import { Share } from '../domain/share.aggregate.js';
import { apiClient } from '../../../shared/infrastructure/api-client.js';

export class ShareRepository {
  constructor() {
    this.baseUrl = '/api/shares';
    this.cache = new Map();
  }

  /**
   * 保存分享
   */
  async save(share) {
    try {
      const data = share.toJSON();

      if (share.isNew) {
        const response = await apiClient.post(this.baseUrl, data);
        const savedData = response.data;

        // 更新缓存
        this.cache.set(savedData.id, savedData);

        return Share.fromJSON(savedData);
      } else {
        const response = await apiClient.put(`${this.baseUrl}/${share.id.value}`, data);
        const updatedData = response.data;

        // 更新缓存
        this.cache.set(updatedData.id, updatedData);

        return Share.fromJSON(updatedData);
      }
    } catch (error) {
      console.error('保存分享失败:', error);
      throw new Error(`保存分享失败: ${error.message}`);
    }
  }

  /**
   * 根据ID查找分享
   */
  async findById(id) {
    try {
      // 先检查缓存
      const cachedData = this.cache.get(id);
      if (cachedData) {
        return Share.fromJSON(cachedData);
      }

      const response = await apiClient.get(`${this.baseUrl}/${id}`);
      const data = response.data;

      // 缓存数据
      this.cache.set(id, data);

      return Share.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('查找分享失败:', error);
      throw new Error(`查找分享失败: ${error.message}`);
    }
  }

  /**
   * 根据分享链接查找分享
   */
  async findByShareLink(shareLink) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/link/${shareLink}`);
      const data = response.data;

      if (!data) {
        return null;
      }

      // 缓存数据
      this.cache.set(data.id, data);

      return Share.fromJSON(data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      console.error('根据分享链接查找分享失败:', error);
      throw new Error(`根据分享链接查找分享失败: ${error.message}`);
    }
  }

  /**
   * 根据资源ID查找分享
   */
  async findByResourceId(resourceId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/resource/${resourceId}`);
      const data = response.data;

      if (!data || data.length === 0) {
        return [];
      }

      // 缓存所有数据
      data.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.map(item => Share.fromJSON(item));
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return [];
      }
      console.error('根据资源ID查找分享失败:', error);
      throw new Error(`根据资源ID查找分享失败: ${error.message}`);
    }
  }

  /**
   * 查找所有分享
   */
  async findAll(filters = {}) {
    try {
      const params = new URLSearchParams();

      if (filters.resourceType) {
        params.append('resourceType', filters.resourceType);
      }

      if (filters.status) {
        params.append('status', filters.status);
      }

      if (filters.permission) {
        params.append('permission', filters.permission);
      }

      if (filters.createdBy) {
        params.append('createdBy', filters.createdBy);
      }

      if (filters.isExpired !== undefined) {
        params.append('isExpired', filters.isExpired);
      }

      const response = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
      const data = response.data;

      // 缓存所有数据
      data.forEach(item => {
        this.cache.set(item.id, item);
      });

      return data.map(item => Share.fromJSON(item));
    } catch (error) {
      console.error('查找分享列表失败:', error);
      throw new Error(`查找分享列表失败: ${error.message}`);
    }
  }

  /**
   * 删除分享
   */
  async delete(id) {
    try {
      await apiClient.delete(`${this.baseUrl}/${id}`);

      // 从缓存中删除
      this.cache.delete(id);
    } catch (error) {
      console.error('删除分享失败:', error);
      throw new Error(`删除分享失败: ${error.message}`);
    }
  }

  /**
   * 撤销分享
   */
  async revoke(id) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${id}/revoke`);
      const data = response.data;

      // 更新缓存
      this.cache.set(id, data);

      return Share.fromJSON(data);
    } catch (error) {
      console.error('撤销分享失败:', error);
      throw new Error(`撤销分享失败: ${error.message}`);
    }
  }

  /**
   * 访问分享
   */
  async access(shareLink, password = null) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/access/${shareLink}`, {
        password
      });
      return response.data;
    } catch (error) {
      console.error('访问分享失败:', error);
      throw new Error(`访问分享失败: ${error.message}`);
    }
  }

  /**
   * 验证分享密码
   */
  async verifyPassword(shareId, password) {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${shareId}/verify`, {
        password
      });
      return response.data;
    } catch (error) {
      console.error('验证密码失败:', error);
      throw new Error(`验证密码失败: ${error.message}`);
    }
  }

  /**
   * 更新分享权限
   */
  async updatePermission(shareId, permission) {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${shareId}/permission`, {
        permission
      });
      const data = response.data;

      // 更新缓存
      this.cache.set(shareId, data);

      return Share.fromJSON(data);
    } catch (error) {
      console.error('更新权限失败:', error);
      throw new Error(`更新权限失败: ${error.message}`);
    }
  }

  /**
   * 更新过期时间
   */
  async updateExpiry(shareId, expiresAt) {
    try {
      const response = await apiClient.patch(`${this.baseUrl}/${shareId}/expiry`, {
        expiresAt
      });
      const data = response.data;

      // 更新缓存
      this.cache.set(shareId, data);

      return Share.fromJSON(data);
    } catch (error) {
      console.error('更新过期时间失败:', error);
      throw new Error(`更新过期时间失败: ${error.message}`);
    }
  }

  /**
   * 获取分享统计
   */
  async getStats(shareId) {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${shareId}/stats`);
      return response.data;
    } catch (error) {
      console.error('获取分享统计失败:', error);
      throw new Error(`获取分享统计失败: ${error.message}`);
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
    return cachedData ? Share.fromJSON(cachedData) : null;
  }
}

export default ShareRepository;
