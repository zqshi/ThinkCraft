/**
 * OCRResult值对象
 * 封装OCR识别结果
 */

export class OCRResult {
  constructor(text, confidence, details, provider) {
    this.text = text;
    this.confidence = confidence;
    this.details = details;
    this.provider = provider;
  }

  /**
   * 创建OCR结果
   * @param {string} text - 识别的文本
   * @param {number} confidence - 置信度 (0-100)
   * @param {Array} details - 详细信息
   * @param {string} provider - 提供商名称
   * @returns {OCRResult} OCR结果实例
   */
  static create(text, confidence, details = [], provider = 'unknown') {
    return new OCRResult(text, confidence, details, provider);
  }

  /**
   * 检查识别质量
   * @returns {string} 质量等级 (high/medium/low)
   */
  getQuality() {
    if (this.confidence >= 90) return 'high';
    if (this.confidence >= 70) return 'medium';
    return 'low';
  }

  /**
   * 是否有文本
   * @returns {boolean} 是否识别到文本
   */
  hasText() {
    return this.text && this.text.trim().length > 0;
  }

  /**
   * 转换为JSON
   * @returns {Object} JSON对象
   */
  toJSON() {
    return {
      text: this.text,
      confidence: this.confidence,
      quality: this.getQuality(),
      details: this.details,
      provider: this.provider
    };
  }
}
