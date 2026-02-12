/**
 * 腾讯云OCR Provider
 * 集成腾讯云OCR API
 */
import { OCRProvider } from './ocr-provider.interface.js';
import { OCRResult } from '../../domain/value-objects/ocr-result.vo.js';
import { logger } from '../../../../../middleware/logger.js';

export class TencentOCRProvider extends OCRProvider {
  constructor() {
    super('Tencent OCR');

    // 注意：tencentcloud-sdk-nodejs需要在package.json中安装
    // 这里先做基础实现，实际使用时需要安装SDK
    this.secretId = process.env.TENCENT_SECRET_ID;
    this.secretKey = process.env.TENCENT_SECRET_KEY;
    this.region = process.env.TENCENT_REGION || 'ap-guangzhou';

    if (!this.secretId || !this.secretKey) {
      logger.warn('[TencentOCR] 腾讯云凭证未配置，OCR功能将不可用');
    }
  }

  /**
   * 提取图片中的文字
   * @param {ImageData} imageData - 图片数据
   * @param {Object} options - 配置选项
   * @returns {Promise<OCRResult>} OCR结果
   */
  async extractText(imageData, options = {}) {
    try {
      if (!this.secretId || !this.secretKey) {
        throw new Error('腾讯云OCR凭证未配置');
      }

      // 动态导入腾讯云SDK（避免未安装时报错）
      let tencentcloud;
      try {
        tencentcloud = await import('tencentcloud-sdk-nodejs');
      } catch (error) {
        throw new Error(
          'tencentcloud-sdk-nodejs未安装，请运行: npm install tencentcloud-sdk-nodejs'
        );
      }

      const OcrClient = tencentcloud.ocr.v20181119.Client;

      const client = new OcrClient({
        credential: {
          secretId: this.secretId,
          secretKey: this.secretKey
        },
        region: this.region,
        profile: {
          httpProfile: {
            endpoint: 'ocr.tencentcloudapi.com'
          }
        }
      });

      const params = {
        ImageBase64: imageData.base64,
        LanguageType: options.language || 'zh'
      };

      logger.info('[TencentOCR] 开始OCR识别');

      const response = await client.GeneralBasicOCR(params);

      const text = response.TextDetections.map(item => item.DetectedText).join('\n');
      const confidence = this._calculateAverageConfidence(response.TextDetections);

      const details = response.TextDetections.map(item => ({
        text: item.DetectedText,
        confidence: item.Confidence,
        polygon: item.Polygon
      }));

      logger.info(`[TencentOCR] OCR识别完成，识别到 ${response.TextDetections.length} 个文本块`);

      return OCRResult.create(text, confidence, details, this.name);
    } catch (error) {
      logger.error('[TencentOCR] OCR识别失败:', error);
      throw new Error(`腾讯云OCR识别失败: ${error.message}`);
    }
  }

  /**
   * 计算平均置信度
   * @param {Array} detections - 检测结果
   * @returns {number} 平均置信度
   */
  _calculateAverageConfidence(detections) {
    if (!detections || detections.length === 0) {
      return 0;
    }
    const sum = detections.reduce((acc, item) => acc + item.Confidence, 0);
    return Math.round(sum / detections.length);
  }
}
