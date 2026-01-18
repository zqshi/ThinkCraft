/**
 * Demo代码生成 API - 重构版
 *
 * 重构说明：
 * - 原文件405行 -> 现在~100行（减少75%）
 * - 业务逻辑移到领域层
 * - 路由只负责HTTP请求/响应处理
 *
 * 重构日期：2026-01-13
 */
import express from 'express';
import { demoUseCases } from '../application/index.js';

const router = express.Router();

/**
 * POST /api/demo/generate
 * 生成Demo代码
 */
router.post('/generate', async (req, res) => {
  try {
    const { demoType, conversationHistory, features } = req.body;

    if (!demoType || !conversationHistory) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: demoType和conversationHistory'
      });
    }

    // 生成Demo代码
    const result = await demoUseCases.generateDemo({
      demoType,
      conversationHistory,
      features
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
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * GET /api/demo/types
 * 获取所有Demo类型
 */
router.get('/types', (req, res) => {
  try {
    const types = demoUseCases.getDemoTypes();

    res.json({
      code: 0,
      data: { types }
    });
  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * GET /api/demo/download/:demoId
 * 下载Demo ZIP文件
 */
router.get('/download/:demoId', (req, res) => {
  try {
    const { demoId } = req.params;
    const result = demoUseCases.getDownloadPath({ demoId });

    if (!result.success) {
      return res.status(404).json({
        code: -1,
        error: result.error
      });
    }

    res.download(result.path, `${demoId}.zip`, (err) => {
      if (err) {
        console.error('[Demo] 下载失败:', err);
      }
    });

  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

export default router;
