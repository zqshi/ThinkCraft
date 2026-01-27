/**
 * 提示词 API
 * 提供提示词查询和管理接口
 */
import express from 'express';
import promptLoader from '../utils/prompt-loader.js';

const router = express.Router();

/**
 * GET /api/prompts/*
 * 获取指定提示词内容（支持多级路径）
 */
router.get('/*', async (req, res, next) => {
  try {
    // 移除开头的斜杠，获取完整路径
    const promptPath = req.params[0];
    const content = await promptLoader.load(promptPath);

    res.type('text/plain').send(content);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts
 * 列出所有可用的提示词
 */
router.get('/', async (req, res, next) => {
  try {
    const prompts = await promptLoader.list();

    res.json({
      code: 0,
      data: { prompts }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts/reload
 * 重新加载所有提示词（清除缓存）
 */
router.post('/reload', async (req, res, next) => {
  try {
    await promptLoader.reload();

    res.json({
      code: 0,
      message: 'Prompts reloaded successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/business-plan/chapters
 * 获取所有商业计划书章节提示词
 */
router.get('/business-plan/chapters', async (req, res, next) => {
  try {
    const chapters = await promptLoader.loadBusinessPlanChapters();

    res.json({
      code: 0,
      data: { chapters }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
