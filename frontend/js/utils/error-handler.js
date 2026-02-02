/**
 * 错误处理工具类
 * 提供统一的错误处理、重试机制和友好的错误提示
 */

class ErrorHandler {
  /**
   * 处理API错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @returns {string} 友好的错误消息
   */
  static handleAPIError(error, context = '操作') {
    console.error(`[${context}] API错误:`, error);

    const errorMessage = error.message || error.toString();

    // JSON解析错误
    if (errorMessage.includes('JSON') || errorMessage.includes('Unexpected token')) {
      return '数据格式错误，请重试。如果问题持续，请联系技术支持。';
    }

    // 超时错误
    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return '请求超时，请检查网络连接后重试。';
    }

    // 503服务不可用
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable')) {
      return '服务暂时不可用，请稍后重试。';
    }

    // 500服务器错误
    if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
      return '服务器错误，请稍后重试。';
    }

    // 400错误请求
    if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
      return '请求参数错误，请检查输入后重试。';
    }

    // 401未授权
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return '未授权访问，请重新登录。';
    }

    // 404未找到
    if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      return '请求的资源不存在。';
    }

    // 网络错误
    if (errorMessage.includes('Network') || errorMessage.includes('Failed to fetch')) {
      return '网络连接失败，请检查网络后重试。';
    }

    // 默认错误消息
    return `${context}失败，请重试。如果问题持续，请联系技术支持。`;
  }

  /**
   * 带重试的异步函数执行
   * @param {Function} fn - 要执行的异步函数
   * @param {number} maxRetries - 最大重试次数
   * @param {number} delay - 重试延迟（毫秒）
   * @param {string} context - 操作上下文
   * @returns {Promise<any>}
   */
  static async withRetry(fn, maxRetries = 3, delay = 1000, context = '操作') {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`[ErrorHandler] 尝试执行 ${context} (第 ${i + 1}/${maxRetries} 次)`);
        return await fn();
      } catch (error) {
        lastError = error;
        console.warn(`[ErrorHandler] ${context} 失败 (第 ${i + 1}/${maxRetries} 次):`, error.message);

        if (i < maxRetries - 1) {
          console.log(`[ErrorHandler] ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          // 指数退避
          delay *= 1.5;
        }
      }
    }

    console.error(`[ErrorHandler] ${context} 在 ${maxRetries} 次尝试后仍然失败`);
    throw lastError;
  }

  /**
   * 安全的JSON解析
   * @param {string} jsonString - JSON字符串
   * @param {any} defaultValue - 解析失败时的默认值
   * @returns {any}
   */
  static safeJSONParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('[ErrorHandler] JSON解析失败:', error.message);
      console.error('[ErrorHandler] 原始内容:', jsonString?.substring(0, 200));

      // 尝试修复常见的JSON问题
      try {
        const fixed = this.fixJSONString(jsonString);
        return JSON.parse(fixed);
      } catch (fixError) {
        console.error('[ErrorHandler] JSON修复失败:', fixError.message);
        return defaultValue;
      }
    }
  }

  /**
   * 修复常见的JSON格式问题
   * @param {string} jsonString - JSON字符串
   * @returns {string}
   */
  static fixJSONString(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      return jsonString;
    }

    let fixed = jsonString;

    // 移除控制字符
    fixed = fixed.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    // 修复未转义的引号（在字符串值中）
    // 这个正则表达式会匹配 "key": "value with "quote" inside"
    // 并将内部的引号转义
    fixed = fixed.replace(/"([^"]*)":\s*"([^"]*)"/g, (match, key, value) => {
      const escapedValue = value.replace(/"/g, '\\"');
      return `"${key}": "${escapedValue}"`;
    });

    // 移除尾部逗号
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // 修复换行符
    fixed = fixed.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');

    return fixed;
  }

  /**
   * 验证数据结构
   * @param {any} data - 要验证的数据
   * @param {Object} schema - 数据结构定义
   * @returns {{valid: boolean, errors: string[]}}
   */
  static validateDataStructure(data, schema) {
    const errors = [];

    if (!data || typeof data !== 'object') {
      errors.push('数据不是有效的对象');
      return { valid: false, errors };
    }

    // 检查必需字段
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`缺少必需字段: ${field}`);
        }
      }
    }

    // 检查字段类型
    if (schema.fields) {
      for (const [field, expectedType] of Object.entries(schema.fields)) {
        if (field in data) {
          const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
          if (actualType !== expectedType) {
            errors.push(`字段 ${field} 类型错误: 期望 ${expectedType}, 实际 ${actualType}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 显示友好的错误提示
   * @param {string} message - 错误消息
   * @param {string} type - 提示类型 ('error' | 'warning' | 'info')
   */
  static showToast(message, type = 'error') {
    if (window.showToast) {
      window.showToast(message, type);
    } else if (window.modalManager) {
      window.modalManager.alert(message, type);
    } else {
      alert(message);
    }
  }

  /**
   * 记录错误到后端（用于错误追踪）
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文信息
   */
  static async logError(error, context = {}) {
    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      console.error('[ErrorHandler] 记录错误:', errorData);

      // 可以在这里发送到后端错误追踪服务
      // await fetch('/api/errors/log', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData)
      // });
    } catch (logError) {
      console.error('[ErrorHandler] 记录错误失败:', logError);
    }
  }
}

// 导出为全局对象
if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
}

// 支持模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
