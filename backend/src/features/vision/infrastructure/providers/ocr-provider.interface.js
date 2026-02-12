/**
 * OCR Provider接口
 * 定义OCR服务提供商的标准接口
 */

export class OCRProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * 提取图片中的文字
   * @param {ImageData} imageData - 图片数据
   * @param {Object} options - 配置选项
   * @returns {Promise<OCRResult>} OCR结果
   */
  async extractText(imageData, _options = {}) {
    throw new Error('Must implement extractText method');
  }
}
