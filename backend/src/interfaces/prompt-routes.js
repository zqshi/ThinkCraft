/**
 * 提示词 API
 * 提供提示词查询和管理接口
 */
import express from 'express';
import promptLoader from '../utils/prompt-loader.js';
import { ok, fail } from '../../middleware/response.js';
import { strictLimiter } from '../../middleware/rate-limiter.js';

const router = express.Router();

const isValidPromptName = (value) => {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const normalized = value.replace(/\\/g, '/').trim();
  if (normalized.length === 0 || normalized.startsWith('/') || normalized.includes('..')) {
    return false;
  }
  return /^[a-zA-Z0-9/_-]+$/.test(normalized);
};

/**
 * GET /api/prompts
 * 列出所有可用的提示词
 */
router.get('/', async (req, res, next) => {
  try {
    const prompts = await promptLoader.list();
    ok(res, { prompts });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/prompts/reload
 * 重新加载所有提示词（清除缓存）
 */
router.post('/reload', strictLimiter, async (req, res, next) => {
  try {
    await promptLoader.reload();
    ok(res, null, 'Prompts reloaded successfully');
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
    ok(res, { chapters });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/prompts/*
 * 获取指定提示词内容（支持多级路径）
 */
router.get('/*', async (req, res, next) => {
  try {
    const promptPath = req.params[0];
    const raw = req.query.raw === '1' || req.query.raw === 'true';
    if (!isValidPromptName(promptPath)) {
      return fail(res, 'Invalid prompt path', 400);
    }

    const exists = await promptLoader.exists(promptPath);
    if (!exists) {
      return fail(res, 'Prompt not found', 404);
    }

    const content = await promptLoader.load(promptPath);
    if (raw) {
      return res.type('text/plain').send(content);
    }
    return ok(res, { content });
  } catch (error) {
    next(error);
  }
});

export default router;
