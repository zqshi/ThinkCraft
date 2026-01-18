/**
 * ThinkCraft API Client
 * 统一封装所有后端API调用，提供错误处理和重试机制
 */

import ENV_CONFIG from '../config/env.js';

class APIClient {
  constructor(baseURL = ENV_CONFIG.API_BASE_URL) {
    this.baseURL = baseURL;
    this.requestQueue = [];
    this.processing = false;
    this.token = null; // 存储 JWT token

    // 默认配置
    this.config = {
      timeout: 120000, // 120秒超时（AI分析需要较长时间）
      retry: 2, // 重试次数（减少到2次，因为超时时间已增加）
      retryDelay: 2000 // 重试延迟(ms)
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
      retry = this.config.retry
    } = options;

    const url = `${this.baseURL}${endpoint}`;

    // 请求配置
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    // 添加认证令牌
    if (this.token) {
      fetchOptions.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    // 重试逻辑
    for (let i = 0; i < retry; i++) {
      try {
        console.log(`[APIClient] ${method} ${url}${i > 0 ? ` (重试 ${i}/${retry})` : ''}`);

        // 超时控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        fetchOptions.signal = controller.signal;

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        // 处理HTTP错误
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;

          // 创建自定义错误对象，附带状态码
          const error = new Error(errorMsg);
          error.status = response.status;
          error.statusText = response.statusText;

          throw error;
        }

        const data = await response.json();
        console.log(`[APIClient] ✓ ${method} ${url} - 成功`);

        return data;

      } catch (error) {
        // 4xx 客户端错误（如用户名已存在、密码错误等）不重试，直接抛出
        if (error.status && error.status >= 400 && error.status < 500) {
          console.error(`[APIClient] ✗ ${method} ${url} - 客户端错误 ${error.status}:`, error.message);
          throw this.normalizeError(error);
        }

        // 最后一次重试失败，抛出错误
        if (i === retry - 1) {
          console.error(`[APIClient] ✗ ${method} ${url} - 失败:`, error.message);
          throw this.normalizeError(error);
        }

        // 计算重试延迟（指数退避）- 仅对网络错误和5xx错误重试
        const delay = this.config.retryDelay * Math.pow(2, i);
        console.warn(`[APIClient] 请求失败，${delay}ms后重试...`);
        await this.sleep(delay);
      }
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

  // ========== 认证API方法 ==========

  /**
   * 用户登录
   * @param {String} username - 用户名或邮箱
   * @param {String} password - 密码
   * @returns {Promise<Object>} { token, user }
   */
  async login(username, password) {
    const response = await this.post('/api/auth/login', {
      username,
      password
    });

    if (response.code === 0) {
      this.setToken(response.data.token);
      return response.data;
    } else {
      throw new Error(response.error || '登录失败');
    }
  }

  /**
   * 用户注册
   * @param {String} username - 用户名
   * @param {String} email - 邮箱
   * @param {String} password - 密码
   * @param {String} displayName - 显示名称（可选）
   * @returns {Promise<Object>} { token, user }
   */
  async register(username, email, password, displayName = null) {
    // 调用API，如果失败会抛出异常（由request方法处理）
    const response = await this.post('/api/auth/register', {
      username,
      email,
      password,
      displayName
    });

    // 如果执行到这里，说明HTTP请求成功（2xx状态码）
    // 后端成功响应格式：{code: 0, message: '...', data: {token, user}}
    if (response.code === 0 && response.data) {
      this.setToken(response.data.token);
      return response.data;
    } else {
      // 这种情况理论上不应该发生（HTTP成功但业务失败）
      throw new Error(response.error || response.message || '注册失败');
    }
  }

  /**
   * 获取当前用户信息
   * @returns {Promise<Object>} { user }
   */
  async getCurrentUser() {
    const response = await this.get('/api/auth/me');

    if (response.code === 0) {
      return response.data.user;
    } else {
      throw new Error(response.error || '获取用户信息失败');
    }
  }

  /**
   * 用户登出
   */
  async logout() {
    try {
      await this.post('/api/auth/logout');
    } catch (error) {
      console.error('[APIClient] 登出失败:', error);
    } finally {
      this.clearToken();
    }
  }

  /**
   * 设置认证令牌
   * @param {String} token - JWT token
   */
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('thinkcraft_token', token);
    }
    console.log('[APIClient] 认证令牌已设置');
  }

  /**
   * 清除认证令牌
   */
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('thinkcraft_token');
    }
    console.log('[APIClient] 认证令牌已清除');
  }

  /**
   * 从本地存储加载令牌
   */
  loadTokenFromStorage() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('thinkcraft_token');
      if (token) {
        this.token = token;
        console.log('[APIClient] 从本地存储加载认证令牌');
      }
    }
  }

  /**
   * GET请求便捷方法
   * @param {String} endpoint - API端点路径
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST请求便捷方法
   * @param {String} endpoint - API端点路径
   * @param {Object} body - 请求体
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  post(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * PUT请求便捷方法
   * @param {String} endpoint - API端点路径
   * @param {Object} body - 请求体
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  put(endpoint, body = null, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE请求便捷方法
   * @param {String} endpoint - API端点路径
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} 响应数据
   */
  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
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
   * Demo类型分析
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>} { type, reason, techStack, coreFeatures }
   */
  async analyzeDemoType(conversationHistory) {
    const response = await this.post('/api/demo/analyze-type', {
      conversationHistory
    });

    return response.data;
  }

  /**
   * 生成PRD文档
   * @param {Array} conversationHistory - 对话历史
   * @param {String} demoType - Demo类型
   * @returns {Promise<Object>} { prd, agent, tokens }
   */
  async generatePRD(conversationHistory, demoType) {
    const response = await this.post('/api/demo/generate-prd', {
      conversationHistory,
      demoType
    });

    return response.data;
  }

  /**
   * 生成架构方案
   * @param {String} prd - PRD文档内容
   * @param {Array} techStack - 技术栈
   * @returns {Promise<Object>} { architecture, agent, tokens }
   */
  async generateArchitecture(prd, techStack) {
    const response = await this.post('/api/demo/generate-architecture', {
      prd,
      techStack
    });

    return response.data;
  }

  /**
   * 生成可运行代码
   * @param {String} prd - PRD文档
   * @param {Object} architecture - 架构方案
   * @param {Array} techStack - 技术栈
   * @returns {Promise<Object>} { html, dependencies, features, explanation }
   */
  async generateCode(prd, architecture, techStack) {
    const response = await this.post('/api/demo/generate-code', {
      prd,
      architecture,
      techStack
    });

    return response.data;
  }

  /**
   * 生成测试报告
   * @param {String} code - 生成的代码
   * @param {String} prd - PRD文档
   * @returns {Promise<Object>} { testReport, agent, tokens }
   */
  async generateTest(code, prd) {
    const response = await this.post('/api/demo/generate-test', {
      code,
      prd
    });

    return response.data;
  }

  /**
   * 生成部署配置
   * @param {String} code - 生成的代码
   * @param {String} demoType - Demo类型
   * @returns {Promise<Object>} { deployConfig, previewUrl, agent }
   */
  async generateDeployConfig(code, demoType) {
    const response = await this.post('/api/demo/publish', {
      code,
      demoType
    });

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

  // ========== 智能协同API ==========

  /**
   * 创建协同计划
   * @param {String} userId - 用户ID
   * @param {String} goal - 协同目标
   * @param {String} projectId - 项目ID（可选）
   * @returns {Promise<Object>} { planId, goal, projectId, status, createdAt }
   */
  async createCollaborationPlan(userId, goal, projectId = null) {
    const response = await this.post('/api/collaboration/create', {
      userId,
      goal,
      projectId
    });
    return response.data;
  }

  /**
   * AI分析能力是否满足
   * @param {String} planId - 协同计划ID
   * @param {Array<String>} agentIds - 指定的Agent ID列表（可选，用于项目模式）
   * @returns {Promise<Object>} { planId, analysis, nextStep }
   */
  async analyzeCollaborationCapability(planId, agentIds = null) {
    const response = await this.post('/api/collaboration/analyze-capability', {
      planId,
      agentIds
    });
    return response.data;
  }

  /**
   * 生成三种协同模式
   * @param {String} planId - 协同计划ID
   * @returns {Promise<Object>} { planId, modes, metadata }
   */
  async generateCollaborationModes(planId) {
    const response = await this.post('/api/collaboration/generate-modes', {
      planId
    });
    return response.data;
  }

  /**
   * 执行协同计划
   * @param {String} planId - 协同计划ID
   * @param {String} executionMode - 执行模式 'workflow' | 'task_decomposition'
   * @returns {Promise<Object>} { executionMode, totalSteps, stepResults, summary }
   */
  async executeCollaborationPlan(planId, executionMode = 'workflow') {
    const response = await this.post('/api/collaboration/execute', {
      planId,
      executionMode
    });
    return response.data;
  }

  /**
   * 获取协同计划详情
   * @param {String} planId - 协同计划ID
   * @returns {Promise<Object>} 完整的协同计划
   */
  async getCollaborationPlan(planId) {
    const response = await this.get(`/api/collaboration/${planId}`);
    return response.data;
  }

  /**
   * 获取用户所有协同计划
   * @param {String} userId - 用户ID
   * @returns {Promise<Object>} { plans, total }
   */
  async getUserCollaborationPlans(userId) {
    const response = await this.get(`/api/collaboration/user/${userId}`);
    return response.data;
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
    this.baseURL = url;
    console.log(`[APIClient] 基础URL已更新: ${url}`);
  }

  /**
   * 更新配置
   * @param {Object} config - 配置更新
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    console.log(`[APIClient] 配置已更新:`, this.config);
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

// 导出单例实例
if (typeof window !== 'undefined') {
  window.APIClient = APIClient;

  // 创建默认实例
  window.apiClient = new APIClient(ENV_CONFIG.API_BASE_URL);

  // 从本地存储加载token
  window.apiClient.loadTokenFromStorage();

  console.log('[APIClient] API客户端已初始化');
  console.log('[APIClient] baseURL:', ENV_CONFIG.API_BASE_URL);
  console.log('[APIClient] 环境:', ENV_CONFIG.ENV);
}

export default APIClient;
