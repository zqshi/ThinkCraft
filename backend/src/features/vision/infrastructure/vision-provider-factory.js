/**
 * Vision Provider工厂
 * 根据配置创建相应的Provider实例
 */
import { TencentOCRProvider } from './providers/tencent-ocr.provider.js';
import { logger } from '../../../../middleware/logger.js';

export class VisionProviderFactory {
  /**
   * 创建OCR提供者
   * @returns {OCRProvider} OCR提供者实例
   */
  static createOCRProvider() {
    const provider = process.env.VISION_OCR_PROVIDER || 'tencent';

    logger.info(`[VisionProviderFactory] 创建OCR Provider: ${provider}`);

    switch (provider) {
    case 'tencent':
      return new TencentOCRProvider();
    case 'baidu':
      // 未来可以添加百度OCR
      throw new Error('百度OCR Provider尚未实现');
    default:
      throw new Error(`未知的OCR Provider: ${provider}`);
    }
  }
}
