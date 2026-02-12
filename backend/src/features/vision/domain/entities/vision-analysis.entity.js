/**
 * VisionAnalysis实体
 * 表示一次完整的视觉分析
 */

export class VisionAnalysis {
  constructor(id, imageInfo, description, ocrResult, metadata) {
    this.id = id;
    this.imageInfo = imageInfo;
    this.description = description;
    this.ocrResult = ocrResult;
    this.metadata = metadata;
    this.createdAt = Date.now();
  }

  /**
   * 创建视觉分析实体
   * @param {Object} imageInfo - 图片信息
   * @param {string} description - 图片描述
   * @param {OCRResult} ocrResult - OCR结果
   * @param {Object} metadata - 元数据
   * @returns {VisionAnalysis} 视觉分析实体
   */
  static create(imageInfo, description, ocrResult, metadata = {}) {
    const id = `vision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return new VisionAnalysis(id, imageInfo, description, ocrResult, metadata);
  }

  /**
   * 是否包含文本
   * @returns {boolean} 是否包含文本
   */
  hasText() {
    return this.ocrResult && this.ocrResult.hasText();
  }

  /**
   * 获取分析摘要
   * @returns {Object} 分析摘要
   */
  getSummary() {
    return {
      id: this.id,
      hasDescription: Boolean(this.description),
      hasText: this.hasText(),
      textLength: this.ocrResult?.text?.length || 0,
      confidence: this.ocrResult?.confidence || 0,
      imageType: this.imageInfo.type,
      imageSizeKB: this.imageInfo.sizeKB,
      createdAt: this.createdAt
    };
  }

  /**
   * 转换为JSON
   * @returns {Object} JSON对象
   */
  toJSON() {
    return {
      id: this.id,
      imageInfo: this.imageInfo,
      description: this.description,
      ocrResult: this.ocrResult?.toJSON(),
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }
}
