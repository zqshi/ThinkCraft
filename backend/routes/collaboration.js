/**
 * Collaboration API 路由
 * 智能协同编排系统的HTTP接口
 */

import express from 'express';
import {
  collaborationPlanningService,
  collaborationExecutionService
} from '../domains/collaboration/index.js';

const router = express.Router();

/**
 * POST /api/collaboration/create
 * 创建协同计划（步骤1：用户输入目标）
 *
 * Request Body:
 * {
 *   userId: string,
 *   goal: string  // 协同目标（至少10个字符）
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     planId: string,
 *     goal: string,
 *     status: string,
 *     createdAt: string
 *   }
 * }
 */
router.post('/create', async (req, res) => {
  try {
    const { userId, goal, projectId } = req.body;

    // 参数验证
    if (!userId) {
      return res.status(400).json({
        code: -1,
        error: '用户ID不能为空'
      });
    }

    if (!goal || goal.trim().length < 10) {
      return res.status(400).json({
        code: -1,
        error: '协同目标至少需要10个字符'
      });
    }

    // 创建协同计划（可选传入projectId）
    const plan = collaborationPlanningService.createPlan(userId, goal, projectId);

    res.json({
      code: 0,
      data: {
        planId: plan.id,
        goal: plan.goal,
        projectId: plan.projectId,
        status: plan.status,
        createdAt: plan.createdAt
      }
    });

  } catch (error) {
    console.error('[API] /collaboration/create 错误:', error);
    res.status(500).json({
      code: -1,
      error: error.message || '创建协同计划失败'
    });
  }
});

/**
 * POST /api/collaboration/analyze-capability
 * AI分析能力是否满足（步骤2）
 *
 * Request Body:
 * {
 *   planId: string
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     planId: string,
 *     analysis: {
 *       requiredSkills: string[],
 *       requiredRoles: object[],
 *       skillGaps: object[],
 *       roleGaps: object[],
 *       isSufficient: boolean,
 *       confidenceScore: number,
 *       hiringAdvice: object,
 *       warnings: string[]
 *     },
 *     nextStep: 'generate_modes' | 'hire_agents'
 *   }
 * }
 */
router.post('/analyze-capability', async (req, res) => {
  try {
    const { planId, agentIds } = req.body;

    // 参数验证
    if (!planId) {
      return res.status(400).json({
        code: -1,
        error: '协同计划ID不能为空'
      });
    }

    // 调用AI分析能力（可选传入agentIds）
    const result = await collaborationPlanningService.analyzeCapability(planId, agentIds);

    res.json({
      code: 0,
      data: result
    });

  } catch (error) {
    console.error('[API] /collaboration/analyze-capability 错误:', error);
    res.status(500).json({
      code: -1,
      error: error.message || '能力分析失败'
    });
  }
});

/**
 * POST /api/collaboration/generate-modes
 * 生成三种协同模式（步骤3）
 *
 * Request Body:
 * {
 *   planId: string
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     planId: string,
 *     modes: {
 *       roleRecommendation: object,
 *       workflowOrchestration: object,
 *       taskDecomposition: object
 *     },
 *     metadata: object
 *   }
 * }
 */
router.post('/generate-modes', async (req, res) => {
  try {
    const { planId } = req.body;

    // 参数验证
    if (!planId) {
      return res.status(400).json({
        code: -1,
        error: '协同计划ID不能为空'
      });
    }

    // 调用AI生成协同模式
    const result = await collaborationPlanningService.generateCollaborationModes(planId);

    res.json({
      code: 0,
      data: result
    });

  } catch (error) {
    console.error('[API] /collaboration/generate-modes 错误:', error);
    res.status(500).json({
      code: -1,
      error: error.message || '生成协同模式失败'
    });
  }
});

/**
 * GET /api/collaboration/:planId
 * 获取协同计划详情
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     id: string,
 *     userId: string,
 *     goal: string,
 *     status: string,
 *     capabilityAnalysis: object,
 *     roleRecommendation: object,
 *     workflowOrchestration: object,
 *     taskDecomposition: object,
 *     executionResult: object,
 *     ...
 *   }
 * }
 */
router.get('/:planId', (req, res) => {
  try {
    const { planId } = req.params;

    const plan = collaborationPlanningService.getPlan(planId);

    if (!plan) {
      return res.status(404).json({
        code: -1,
        error: '协同计划不存在'
      });
    }

    res.json({
      code: 0,
      data: plan
    });

  } catch (error) {
    console.error('[API] /collaboration/:planId 错误:', error);
    res.status(500).json({
      code: -1,
      error: error.message || '获取协同计划失败'
    });
  }
});

/**
 * GET /api/collaboration/user/:userId
 * 获取用户所有协同计划
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     plans: array,
 *     total: number
 *   }
 * }
 */
router.get('/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const plans = collaborationPlanningService.getUserPlans(userId);

    res.json({
      code: 0,
      data: {
        plans,
        total: plans.length
      }
    });

  } catch (error) {
    console.error('[API] /collaboration/user/:userId 错误:', error);
    res.status(500).json({
      code: -1,
      error: error.message || '获取用户协同计划失败'
    });
  }
});

/**
 * POST /api/collaboration/execute
 * 执行协同计划（步骤4）
 *
 * Request Body:
 * {
 *   planId: string,
 *   executionMode: 'workflow' | 'task_decomposition'  // 默认workflow
 * }
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     executionMode: string,
 *     totalSteps: number,
 *     completedSteps: number,
 *     stepResults: object,
 *     summary: string,
 *     completedAt: string
 *   }
 * }
 */
router.post('/execute', async (req, res) => {
  try {
    const { planId, executionMode = 'workflow' } = req.body;

    // 参数验证
    if (!planId) {
      return res.status(400).json({
        code: -1,
        error: '协同计划ID不能为空'
      });
    }

    if (!['workflow', 'task_decomposition'].includes(executionMode)) {
      return res.status(400).json({
        code: -1,
        error: '不支持的执行模式'
      });
    }

    // 执行协同计划
    const result = await collaborationExecutionService.execute(planId, executionMode);

    res.json({
      code: 0,
      data: result
    });

  } catch (error) {
    console.error('[API] /collaboration/execute 错误:', error);
    res.status(500).json({
      code: -1,
      error: error.message || '执行协同计划失败'
    });
  }
});

/**
 * DELETE /api/collaboration/:planId
 * 删除协同计划
 *
 * Response:
 * {
 *   code: 0,
 *   data: {
 *     deleted: boolean
 *   }
 * }
 */
router.delete('/:planId', (req, res) => {
  try {
    const { planId } = req.params;

    const deleted = collaborationPlanningService.deletePlan(planId);

    if (!deleted) {
      return res.status(404).json({
        code: -1,
        error: '协同计划不存在'
      });
    }

    res.json({
      code: 0,
      data: {
        deleted: true
      }
    });

  } catch (error) {
    console.error('[API] /collaboration/:planId (DELETE) 错误:', error);
    res.status(500).json({
      code: -1,
      error: error.message || '删除协同计划失败'
    });
  }
});

export default router;
