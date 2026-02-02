/**
 * ThinkCraft API Client
 * 统一封装所有后端API调用，提供错误处理和重试机制
 */

class APIClient {
  constructor(baseURL = getDefaultBaseURL()) {
    this.baseURL = resolveBaseURL(baseURL);
    this.requestQueue = [];
    this.processing = false;
    this.refreshingPromise = null;

    // 默认配置
    this.config = {
      timeout: 30000, // 30秒超时
      retry: 3, // 重试次数
      retryDelay: 1000 // 重试延迟(ms)
    };
  }

  /**
   * 通用请求方法
   * @param {String} endpoint - API端点路径
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      timeout = this.config.timeout,
      retry = this.config.retry,
      _authRetry = false
    } = options;

    const url = `${this.baseURL}${endpoint}`;

    // 请求配置
    const authToken =
      sessionStorage.getItem('thinkcraft_access_token') ||
      localStorage.getItem('thinkcraft_access_token') ||
      localStorage.getItem('accessToken');
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...headers
      }
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    // 重试逻辑
    for (let i = 0; i < retry; i++) {
      try {
        // 超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        fetchOptions.signal = controller.signal;

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        // 处理HTTP错误
        if (!response.ok) {
          if (response.status === 401 && !_authRetry) {
            const refreshed = await this.refreshAccessToken();
            if (refreshed) {
              return this.request(endpoint, { ...options, _authRetry: true });
            }
            this.handleUnauthorized();
          }

          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

      } catch (error) {
        // 最后一次重试失败，抛出错误
        if (i === retry - 1) {
          throw this.normalizeError(error);
        }

        // 计算重试延迟（指数退避）
        const delay = this.config.retryDelay * Math.pow(2, i);
        await this.sleep(delay);
      }
    }
  }

  /**
   * 刷新访问令牌
   * @returns {Promise<boolean>}
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
        const response = await fetch(`${this.baseURL}/api/auth/refresh-token`, {
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
        console.warn('[APIClient] 刷新令牌失败:', error);
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
      alert('登录已过期，请重新登录');
      window.location.href = 'login.html';
    }
  }

  /**
   * GET请求
   * @param {String} endpoint - API端点
   * @param {Object} params - 查询参数
   * @returns {Promise<Object>}
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  /**
   * POST请求
   * @param {String} endpoint - API端点
   * @param {Object} body - 请求体
   * @returns {Promise<Object>}
   */
  async post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  }

  // ========== 业务API方法 ==========

  /**
   * 对话接口
   * @param {Array} messages - 消息数组
   * @param {String} systemPrompt - 系统提示词
   * @returns {Promise<Object>} { content, tokens }
   */
  async chat(messages, systemPrompt = null) {
    const response = await this.post('/api/chat', {
      messages,
      systemPrompt
    });

    return {
      content: response.content,
      tokens: response.usage
    };
  }

  /**
   * 生成分析报告
   * @param {Array} messages - 对话历史
   * @returns {Promise<Object>} { report, tokens }
   */
  async generateReport(messages) {
    const response = await this.post('/api/report/generate', { messages });

    return {
      report: response.data.report,
      tokens: response.data.tokens
    };
  }

  /**
   * 生成单个章节
   * @param {String} chapterId - 章节ID
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>} { chapterId, content, agent, tokens }
   */
  async generateChapter(chapterId, conversationHistory) {
    const response = await this.post('/api/business-plan/generate-chapter', {
      chapterId,
      conversationHistory
    });

    return response.data;
  }

  /**
   * 批量生成章节
   * @param {Array} chapterIds - 章节ID数组
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>} { chapters: [{ chapterId, content, agent }], totalTokens }
   */
  async generateBatchChapters(chapterIds, conversationHistory) {
    const response = await this.post('/api/business-plan/generate-batch', {
      chapterIds,
      conversationHistory
    });

    return response.data;
  }

  /**
   * 查询生成状态（用于长时间任务）
   * @param {String} taskId - 任务ID
   * @returns {Promise<Object>} { status, progress, result }
   */
  async getGenerationStatus(taskId) {
    const response = await this.get(`/api/business-plan/status/${taskId}`);
    return response.data;
  }

  /**
   * 图片分析（Vision API）
   * @param {String} imageBase64 - Base64编码的图片
   * @returns {Promise<Object>} { description, extractedText, imageInfo }
   */
  async analyzeImage(imageBase64) {
    const response = await this.post('/api/vision/analyze', {
      image: imageBase64
    });

    return response.data;
  }

  /**
   * 健康检查
   * @returns {Promise<Object>} { status, timestamp, service, version }
   */
  async health() {
    return this.get('/api/health');
  }

  // ========== 工具方法 ==========

  /**
   * 规范化错误对象
   * @param {Error} error - 原始错误
   * @returns {Error} 规范化后的错误
   */
  normalizeError(error) {
    if (error.name === 'AbortError') {
      return new Error('请求超时，请检查网络连接');
    }

    if (error.message.includes('Failed to fetch')) {
      return new Error('无法连接到服务器，请检查后端服务是否运行');
    }

    if (error.message.includes('NetworkError')) {
      return new Error('网络错误，请检查网络连接');
    }

    // API返回的错误直接返回
    return error;
  }

  /**
   * 睡眠函数（用于重试延迟）
   * @param {Number} ms - 毫秒数
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 设置基础URL
   * @param {String} url - 新的基础URL
   */
  setBaseURL(url) {
    this.baseURL = resolveBaseURL(url);
    }

  /**
   * 更新配置
   * @param {Object} config - 配置更新
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    }

  /**
   * 批量请求（并行执行，但限制并发数）
   * @param {Array} requests - 请求数组 [{ endpoint, options }, ...]
   * @param {Number} concurrency - 最大并发数
   * @returns {Promise<Array>} 结果数组
   */
  async batchRequest(requests, concurrency = 3) {
    const results = [];
    const executing = [];

    for (const [index, req] of requests.entries()) {
      const promise = this.request(req.endpoint, req.options)
        .then(result => {
          results[index] = { success: true, data: result };
        })
        .catch(error => {
          results[index] = { success: false, error: error.message };
        });

      executing.push(promise);

      // 控制并发数
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }

    // 等待所有请求完成
    await Promise.all(executing);
    return results;
  }
}

function getDefaultBaseURL() {
  const host = window.location.hostname;
  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  if (isLocalhost && window.location.port !== '3000') {
    return 'http://localhost:3000';
  }
  return window.location.origin;
}

function resolveBaseURL(url) {
  if (url && typeof url === 'string') {
    return url;
  }
  if (typeof window === 'undefined') {
    return url || '';
  }
  return getDefaultBaseURL();
}

// 导出单例实例
if (typeof window !== 'undefined') {
  window.APIClient = APIClient;

  // 创建默认实例
  const settings = JSON.parse(localStorage.getItem('thinkcraft_settings') || '{}');
  const apiUrl = settings.apiUrl || getDefaultBaseURL();
  window.apiClient = new APIClient(resolveBaseURL(apiUrl));

  }
