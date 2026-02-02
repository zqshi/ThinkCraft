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
    this.refreshingPromise = null;
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
        if (response.status === 401 && !options._authRetry) {
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            return this.request(endpoint, { ...options, _authRetry: true });
          }
          this.handleUnauthorized();
        }

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
   * 刷新访问令牌
   */
  async refreshAccessToken() {
    const refreshToken = localStorage.getItem('thinkcraft_refresh_token');
    if (!refreshToken) {
      return false;
    }

    if (this.refreshingPromise) {
      return this.refreshingPromise;
    }

    this.refreshingPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
          return false;
        }

        const data = await response.json().catch(() => null);
        const newAccessToken = data?.data?.accessToken;
        if (!newAccessToken) {
          return false;
        }

        sessionStorage.setItem('thinkcraft_access_token', newAccessToken);
        localStorage.setItem('accessToken', newAccessToken);
        return true;
      } catch (error) {
        console.warn('[ApiClient] 刷新令牌失败:', error);
        return false;
      } finally {
        this.refreshingPromise = null;
      }
    })();

    return this.refreshingPromise;
  }

  /**
   * 处理未授权状态
   */
  handleUnauthorized() {
    sessionStorage.removeItem('thinkcraft_access_token');
    localStorage.removeItem('thinkcraft_refresh_token');
    localStorage.removeItem('accessToken');

    if (typeof window !== 'undefined') {
      window.location.href = 'login.html';
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
    return (
      localStorage.getItem('accessToken') ||
      localStorage.getItem('thinkcraft_access_token') ||
      sessionStorage.getItem('thinkcraft_access_token')
    );
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
