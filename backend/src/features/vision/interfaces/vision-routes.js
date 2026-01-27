/**
 * 视觉分析路由 - 图片识别和 OCR
 * 集成腾讯云OCR服务
 */
import express from 'express';
import { VisionService } from '../application/vision-service.js';
import logger from '../../../../middleware/logger.js';

const router = express.Router();
const visionService = new VisionService();

/**
 * POST /api/vision/analyze
 * 分析上传的图片（Base64 格式）
 *
 * Request Body:
 * {
 *   image: "base64_string",
 *   prompt: "用户的提示词",
 *   enableOCR: true  // 是否启用OCR（默认true）
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     id: "vision_xxx",
 *     imageInfo: { type, sizeKB },
 *     ocrResult: { text, confidence, quality },
 *     metadata: { provider }
 *   }
 * }
 */
router.post('/analyze', async (req, res, next) => {
  try {
    const { image, prompt, enableOCR = true } = req.body;

    if (!image) {
      return res.status(400).json({
        code: -1,
        error: '必须提供图片数据（Base64格式）'
      });
    }

    logger.info('[VisionRoutes] 收到图片分析请求');

    const result = await visionService.analyzeImage(image, {
      prompt,
      enableOCR
    });

    if (!result.success) {
      return res.status(400).json({
        code: -1,
        error: result.error
      });
    }

    res.json({
      code: 0,
      data: result.data
    });
  } catch (error) {
    logger.error('[VisionRoutes] 图片分析失败:', error);
    next(error);
  }
});

/**
 * POST /api/vision/ocr
 * 仅执行OCR文字提取
 *
 * Request Body:
 * {
 *   image: "base64_string",
 *   language: "zh"  // 语言类型（默认zh）
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     text: "识别的文字",
 *     confidence: 95,
 *     quality: "high",
 *     details: [...]
 *   }
 * }
 */
router.post('/ocr', async (req, res, next) => {
  try {
    const { image, language = 'zh' } = req.body;

    if (!image) {
      return res.status(400).json({
        code: -1,
        error: '必须提供图片数据（Base64格式）'
      });
    }

    logger.info('[VisionRoutes] 收到OCR请求');

    const result = await visionService.extractText(image, { language });

    if (!result.success) {
      return res.status(400).json({
        code: -1,
        error: result.error
      });
    }

    res.json({
      code: 0,
      data: result.data
    });
  } catch (error) {
    logger.error('[VisionRoutes] OCR失败:', error);
    next(error);
  }
});

/**
 * 未来扩展计划：
 *
 * 1. OCR 文字识别：
 *    - 集成 Tesseract.js（前端）或 tesseract-ocr（后端）
 *    - 支持中英文混合识别
 *
 * 2. 多模态 AI：
 *    - 集成支持视觉的 AI 模型（如 GPT-4V）
 *    - 或使用 DeepSeek 未来的多模态版本
 *
 * 3. 图片预处理：
 *    - 图片压缩和优化
 *    - 自动旋转和增强
 */

export default router;
