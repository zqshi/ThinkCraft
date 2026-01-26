/**
 * 消息内容值对象
 */
import { ValueObject } from '../../../../shared/domain/value-object.base.js';

export class MessageContent extends ValueObject {
  constructor(value) {
    super();
    this._value = value;
    this.validate();
  }

  /**
   * 验证消息内容
   */
  validate() {
    if (this._value === null || this._value === undefined) {
      throw new Error('消息内容不能为空');
    }

    if (typeof this._value !== 'string') {
      // 如果不是字符串，转换为字符串
      this._value = String(this._value);
    }

    // 去除前后空格
    this._value = this._value.trim();

    if (this._value.length === 0) {
      throw new Error('消息内容不能为空');
    }

    if (this._value.length > 10000) {
      throw new Error('消息内容长度不能超过10000个字符');
    }

    // 检查是否包含恶意代码（简单的XSS防护）
    if (this._containsMaliciousCode()) {
      throw new Error('消息内容包含不安全的代码');
    }
  }

  /**
   * 检查是否包含恶意代码
   */
  _containsMaliciousCode() {
    const maliciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /<link[^>]*>/gi,
      /<meta[^>]*>/gi,
      /data:text\/html/gi
    ];

    return maliciousPatterns.some(pattern => pattern.test(this._value));
  }

  /**
   * 转换为纯文本（移除HTML标签）
   */
  toPlainText() {
    return this._value.replace(/<[^>]*>/g, '');
  }

  /**
   * 安全地转换为HTML（转义特殊字符）
   */
  toSafeHtml() {
    return this._value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * 提取文本中的链接
   */
  extractUrls() {
    const urlPattern = /https?:\/\/[^\s]+/gi;
    return this._value.match(urlPattern) || [];
  }

  /**
   * 提取文本中的提及（@username）
   */
  extractMentions() {
    const mentionPattern = /@[a-zA-Z0-9_-]+/gi;
    return this._value.match(mentionPattern) || [];
  }

  /**
   * 提取文本中的话题标签（#topic）
   */
  extractHashtags() {
    const hashtagPattern = /#[a-zA-Z0-9_-]+/gi;
    return this._value.match(hashtagPattern) || [];
  }

  /**
   * 检查是否包含链接
   */
  containsUrl() {
    return this.extractUrls().length > 0;
  }

  /**
   * 检查是否只包含链接
   */
  isUrlOnly() {
    return this.containsUrl() && this.extractUrls()[0].trim() === this._value.trim();
  }

  /**
   * 获取内容预览（截断显示）
   */
  getPreview(maxLength = 100) {
    const plainText = this.toPlainText();
    if (plainText.length <= maxLength) {
      return plainText;
    }
    return plainText.substring(0, maxLength) + '...';
  }

  get value() {
    return this._value;
  }

  equals(other) {
    if (!(other instanceof MessageContent)) {
      return false;
    }
    return this._value === other._value;
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}

/**
 * 消息内容类型定义
 */
export const MessageContentType = {
  TEXT: 'text',
  HTML: 'html',
  MARKDOWN: 'markdown',
  CODE: 'code',
  JSON: 'json'
};
