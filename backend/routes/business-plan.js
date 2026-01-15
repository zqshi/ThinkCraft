/**
 * 商业计划书生成 API - 重构版
 *
 * 重构说明：
 * - 原文件437行 -> 现在~120行（减少72%）
 * - 业务逻辑移到领域层（backend/domains/businessPlan）
 * - 路由只负责HTTP请求/响应处理
 * - 遵循DDD设计模式和单一职责原则
 *
 * 重构日期：2026-01-13
 */
import express from 'express';
import { businessPlanUseCases } from '../application/index.js';

const router = express.Router();

/**
 * POST /api/business-plan/generate-chapter
 * 生成单个章节
 */
router.post('/generate-chapter', async (req, res) => {
  try {
    const { chapterId, conversationHistory } = req.body;

    // 参数验证
    const result = await businessPlanUseCases.generateChapter({
      chapterId,
      conversationHistory
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
 * POST /api/business-plan/generate-batch
 * 批量生成章节（并行）
 */
router.post('/generate-batch', async (req, res) => {
  try {
    const { chapterIds, conversationHistory } = req.body;

    // 参数验证
    if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
      return res.status(400).json({
        code: -1,
        error: '缺少或无效的章节ID列表'
      });
    }

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return res.status(400).json({
        code: -1,
        error: '缺少或无效的对话历史'
      });
    }

    const result = await businessPlanUseCases.generateBatch({
      chapterIds,
      conversationHistory
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
 * GET /api/business-plan/chapters
 * 获取所有可用章节列表
 */
router.get('/chapters', (req, res) => {
  try {
    const chapters = businessPlanUseCases.getChapters();

    res.json({
      code: 0,
      data: chapters
    });
  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * GET /api/business-plan/chapters/:chapterId
 * 获取特定章节的详细信息
 */
router.get('/chapters/:chapterId', (req, res) => {
  try {
    const { chapterId } = req.params;

    const chapterInfo = businessPlanUseCases.getChapterInfo({ chapterId });

    if (!chapterInfo) {
      return res.status(404).json({
        code: -1,
        error: `章节不存在: ${chapterId}`
      });
    }

    res.json({
      code: 0,
      data: chapterInfo
    });
  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * POST /api/business-plan/estimate-cost
 * 估算生成成本
 */
router.post('/estimate-cost', (req, res) => {
  try {
    const { chapterIds } = req.body;

    if (!chapterIds || !Array.isArray(chapterIds)) {
      return res.status(400).json({
        code: -1,
        error: '缺少或无效的章节ID列表'
      });
    }

    const estimate = businessPlanUseCases.estimateCost({ chapterIds });

    if (!estimate.success) {
      return res.status(400).json({
        code: -1,
        error: estimate.error
      });
    }

    res.json({
      code: 0,
      data: estimate.data
    });
  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * GET /api/business-plan/cost-stats
 * 获取成本统计
 */
router.get('/cost-stats', (req, res) => {
  try {
    const stats = businessPlanUseCases.getCostStats();

    res.json({
      code: 0,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

export default router;
