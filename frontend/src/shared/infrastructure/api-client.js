/**
 * API客户端
 * 统一的后端调用接口
 */
export class ApiClient {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
  }

  /**
   * 发送请求
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...this.defaultHeaders,
      ...options.headers
    };

    // 添加认证令牌
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      // 处理响应
      if (!response.ok) {
        const error = await this.handleError(response);
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('[ApiClient] 请求失败:', error);
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return this.request(url, {
      method: 'GET'
    });
  }

  /**
   * POST请求
   */
  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT请求
   */
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE请求
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }

  /**
   * 上传文件
   */
  async upload(endpoint, file, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);

    // 添加额外数据
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    return this.request(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        // 不要设置Content-Type，让浏览器自动设置
      }
    });
  }

  /**
   * 处理错误响应
   */
  async handleError(response) {
    let errorMessage = '请求失败';
    let errorData = null;

    try {
      const errorResponse = await response.json();
      errorMessage = errorResponse.error || errorResponse.message || `HTTP ${response.status}`;
      errorData = errorResponse;
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = errorData;
    error.response = response;

    return error;
  }

  /**
   * 获取认证令牌
   */
  getAuthToken() {
    // 从localStorage获取令牌
    return localStorage.getItem('accessToken');
  }

  /**
   * 设置认证令牌
   */
  setAuthToken(token) {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  /**
   * 清除认证令牌
   */
  clearAuthToken() {
    localStorage.removeItem('accessToken');
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated() {
    return Boolean(this.getAuthToken());
  }
}

// 创建API客户端实例
export const apiClient = new ApiClient();
