/**
 * AI服务Mock
 * 用于测试中模拟DeepSeek API调用，避免真实API调用
 */

export class MockAIService {
  constructor() {
    this.responses = [];
    this.callCount = 0;
    this.calls = [];
  }

  /**
   * 预设Mock响应
   * @param {Object|string} response - Mock响应内容
   */
  mockResponse(response) {
    if (typeof response === 'string') {
      this.responses.push({
        content: response,
        usage: { total_tokens: 100 }
      });
    } else {
      this.responses.push(response);
    }
  }

  /**
   * 预设多个Mock响应
   * @param {Array} responses - Mock响应数组
   */
  mockResponses(responses) {
    responses.forEach(response => this.mockResponse(response));
  }

  /**
   * 模拟AI调用
   * @param {Array} messages - 消息数组
   * @param {Object} options - 调用选项
   * @returns {Promise<Object>} Mock响应
   */
  async call(messages, options = {}) {
    this.callCount++;
    this.calls.push({ messages, options, timestamp: new Date() });

    // 如果有预设响应，返回预设响应
    if (this.responses.length > 0) {
      const response = this.responses.shift();
      return response;
    }

    // 默认响应
    return {
      content: 'Mocked AI response',
      usage: {
        prompt_tokens: 50,
        completion_tokens: 50,
        total_tokens: 100
      },
      finish_reason: 'stop'
    };
  }

  /**
   * 模拟AI调用失败
   * @param {string} errorMessage - 错误消息
   */
  mockError(errorMessage = 'AI service error') {
    this.mockResponse({
      error: true,
      message: errorMessage
    });
  }

  /**
   * 重置Mock状态
   */
  reset() {
    this.responses = [];
    this.callCount = 0;
    this.calls = [];
  }

  /**
   * 获取调用历史
   * @returns {Array} 调用记录
   */
  getCallHistory() {
    return this.calls;
  }

  /**
   * 获取最后一次调用的消息
   * @returns {Array|null} 消息数组
   */
  getLastCallMessages() {
    if (this.calls.length === 0) return null;
    return this.calls[this.calls.length - 1].messages;
  }

  /**
   * 验证是否被调用过
   * @returns {boolean}
   */
  wasCalled() {
    return this.callCount > 0;
  }

  /**
   * 验证调用次数
   * @param {number} expectedCount - 预期调用次数
   * @returns {boolean}
   */
  wasCalledTimes(expectedCount) {
    return this.callCount === expectedCount;
  }

  /**
   * 验证是否使用特定消息调用
   * @param {string} contentSubstring - 消息内容子串
   * @returns {boolean}
   */
  wasCalledWith(contentSubstring) {
    return this.calls.some(call => {
      const messagesString = JSON.stringify(call.messages);
      return messagesString.includes(contentSubstring);
    });
  }
}

/**
 * 创建Mock AI服务的工厂函数
 * @returns {MockAIService}
 */
export function createMockAIService() {
  return new MockAIService();
}

/**
 * 创建预设响应的Mock AI服务
 * @param {Array|string} responses - 响应或响应数组
 * @returns {MockAIService}
 */
export function createMockAIServiceWithResponses(responses) {
  const mockAI = new MockAIService();

  if (Array.isArray(responses)) {
    mockAI.mockResponses(responses);
  } else {
    mockAI.mockResponse(responses);
  }

  return mockAI;
}

export default MockAIService;
