/**
 * 视觉分析路由 - 图片识别和 OCR
 * 当前实现：基础版本，提取图片基本信息
 * 未来扩展：集成 OCR 服务（Tesseract.js）或多模态 AI
 */
import express from 'express';
import { visionUseCases } from '../application/index.js';

const router = express.Router();

/**
 * POST /api/vision/analyze
 * 分析上传的图片（Base64 格式）
 *
 * Request Body:
 * {
 *   image: "base64_string",
 *   prompt: "用户的提示词"
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     description: "图片描述",
 *     extractedText: "提取的文字（如果有）"
 *   }
 * }
 */
router.post('/analyze', async (req, res, next) => {
    try {
        const { image, prompt } = req.body;
        const result = visionUseCases.analyzeImage({ image, prompt });

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
