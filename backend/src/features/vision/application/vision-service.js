/**
 * Vision应用服务
 * 编排图像分析流程
 */
import { VisionProviderFactory } from '../infrastructure/vision-provider-factory.js';
import { ImageData } from '../domain/value-objects/image-data.vo.js';
import { VisionAnalysis } from '../domain/entities/vision-analysis.entity.js';
import { logger } from '../../../../middleware/logger.js';

export class VisionService {
  constructor() {
    try {
      this.ocrProvider = VisionProviderFactory.createOCRProvider();
    } catch (error) {
      logger.warn('[VisionService] OCR Provider创建失败:', error.message);
      this.ocrProvider = null;
    }
  }

  /**
   * 分析图片
   * @param {string} imageBase64 - Base64编码的图片
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeImage(imageBase64, options = {}) {
    try {
      logger.info('[VisionService] 开始分析图片');

      // 1. 验证图片数据
      const imageData = ImageData.create(imageBase64);

      const maxSizeMB = parseFloat(process.env.VISION_MAX_IMAGE_SIZE_MB) || 10;
      if (!imageData.isValid(maxSizeMB)) {
        throw new Error(`无效的图片数据或图片过大（最大${maxSizeMB}MB）`);
      }

      // 2. 执行OCR
      let ocrResult = null;
      if (this.ocrProvider && options.enableOCR !== false) {
        try {
          ocrResult = await this.ocrProvider.extractText(imageData, options);
          logger.info('[VisionService] OCR识别完成');
        } catch (error) {
          logger.error('[VisionService] OCR识别失败:', error);
          // OCR失败不影响整体流程
        }
      }

      // 3. 创建分析实体
      const analysis = VisionAnalysis.create(
        imageData.getInfo(),
        null, // 暂时没有图像理解功能
        ocrResult,
        {
          provider: {
            ocr: this.ocrProvider?.name || 'none'
          }
        }
      );

      logger.info('[VisionService] 图片分析完成');

      return {
        success: true,
        data: analysis.toJSON()
      };
    } catch (error) {
      logger.error('[VisionService] 图片分析失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 仅执行OCR文字提取
   * @param {string} imageBase64 - Base64编码的图片
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} OCR结果
   */
  async extractText(imageBase64, options = {}) {
    try {
      if (!this.ocrProvider) {
        throw new Error('OCR服务未配置');
      }

      logger.info('[VisionService] 开始OCR文字提取');

      const imageData = ImageData.create(imageBase64);

      const maxSizeMB = parseFloat(process.env.VISION_MAX_IMAGE_SIZE_MB) || 10;
      if (!imageData.isValid(maxSizeMB)) {
        throw new Error(`无效的图片数据或图片过大（最大${maxSizeMB}MB）`);
      }

      const result = await this.ocrProvider.extractText(imageData, options);

      logger.info('[VisionService] OCR文字提取完成');

      return {
        success: true,
        data: result.toJSON()
      };
    } catch (error) {
      logger.error('[VisionService] OCR文字提取失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}
