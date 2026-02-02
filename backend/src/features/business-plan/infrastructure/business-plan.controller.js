/**
 * 商业计划书控制器
 * 处理HTTP请求和响应
 */
import express from 'express';
import { BusinessPlanApplicationService } from '../application/business-plan.use-case.js';
import {
  CreateBusinessPlanDto,
  GenerateChapterDto,
  GenerateBatchChaptersDto
} from '../application/business-plan.dto.js';
import { getRepository } from '../../../shared/infrastructure/repository.factory.js';

const router = express.Router();

// 初始化应用服务
const businessPlanService = new BusinessPlanApplicationService(getRepository('business-plan'));

/**
 * POST /api/business-plan
 * 创建商业计划书
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, projectId } = req.body;
    const userId = req.user?.userId; // 假设已通过认证中间件

    if (!userId) {
      return res.status(401).json({
        code: -1,
        error: '用户未认证'
      });
    }

    const createDto = new CreateBusinessPlanDto({
      title,
      projectId,
      generatedBy: userId
    });

    const businessPlan = await businessPlanService.createBusinessPlan(createDto);

    res.status(201).json({
      code: 0,
      data: businessPlan
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-plan/project/:projectId
 * 获取项目的商业计划书
 */
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        code: -1,
        error: '用户未认证'
      });
    }

    const businessPlan = await businessPlanService.getBusinessPlanByProject(projectId);

    if (!businessPlan) {
      return res.status(404).json({
        code: -1,
        error: '商业计划书不存在'
      });
    }

    res.json({
      code: 0,
      data: businessPlan
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-plan/:id/chapters
 * 生成单个章节
 */
router.post('/:id/chapters', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { chapterId, conversationHistory } = req.body;

    const generateDto = new GenerateChapterDto({
      chapterId,
      conversationHistory
    });

    const result = await businessPlanService.generateChapter(id, generateDto);

    res.json({
      code: 0,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-plan/:id/chapters/batch
 * 批量生成章节
 */
router.post('/:id/chapters/batch', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { chapterIds, conversationHistory } = req.body;

    const generateBatchDto = new GenerateBatchChaptersDto({
      chapterIds,
      conversationHistory
    });

    const result = await businessPlanService.generateBatchChapters(id, generateBatchDto);

    res.json({
      code: 0,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/business-plan/:id/complete
 * 完成商业计划书
 */
router.post('/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;

    const businessPlan = await businessPlanService.completeBusinessPlan(id);

    res.json({
      code: 0,
      data: businessPlan
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-plan/chapters
 * 获取可用章节列表
 */
router.get('/chapters', (req, res) => {
  try {
    const chapters = businessPlanService.getAvailableChapters();

    res.json({
      code: 0,
      data: { chapters }
    });
  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * GET /api/business-plan
 * 获取用户的所有商业计划书
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        code: -1,
        error: '用户未认证'
      });
    }

    const businessPlans = await businessPlanService.getUserBusinessPlans(userId);

    res.json({
      code: 0,
      data: businessPlans
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/business-plan/:id
 * 获取商业计划书详情
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const businessPlan = await businessPlanService.getBusinessPlan(id);

    res.json({
      code: 0,
      data: businessPlan
    });
  } catch (error) {
    next(error);
  }
});

export default router;
