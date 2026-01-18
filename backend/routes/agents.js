/**
 * 数字员工（Agent）管理系统 API - 重构版
 *
 * 重构说明：
 * - 原文件557行 -> 现在~250行（减少55%）
 * - 业务逻辑移到领域层（backend/domains/agent）
 * - 路由只负责HTTP请求/响应处理
 * - 遵循DDD设计模式和单一职责原则
 *
 * 重构日期：2026-01-13
 */
import express from 'express';
import { agentUseCases } from '../application/index.js';

const router = express.Router();

/**
 * GET /api/agents/types
 * 获取所有Agent类型
 */
router.get('/types', (req, res) => {
  try {
    const types = agentUseCases.getAgentTypes();

    res.json({
      code: 0,
      data: {
        types,
        total: types.length
      }
    });
  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/hire
 * 雇佣Agent
 */
router.post('/hire', async (req, res) => {
  try {
    const { userId, agentType, nickname } = req.body;

    if (!userId || !agentType) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: userId 和 agentType'
      });
    }

    // 调用领域服务
    const result = agentUseCases.hireAgent({ userId, agentType, nickname });

    if (!result.success) {
      return res.status(400).json({
        code: -1,
        error: result.error
      });
    }

    res.json({
      code: 0,
      data: result.agent.toJSON()
    });

  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/my/:userId
 * 获取用户的Agent团队
 */
router.get('/my/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    // 获取团队信息
    const { agents, stats } = agentUseCases.getUserAgents({ userId });

    res.json({
      code: 0,
      data: {
        agents: agents.map(agent => agent.toJSON()),
        total: agents.length,
        monthlyCost: stats.monthlyCost,
        stats: stats
      }
    });
  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/assign-task
 * 分配任务给Agent
 */
router.post('/assign-task', async (req, res) => {
  try {
    const { userId, agentId, task, context } = req.body;

    if (!userId || !agentId || !task) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数'
      });
    }

    // 调用领域服务
    const result = await agentUseCases.assignTask({ userId, agentId, task, context });

    if (!result.success) {
      return res.status(400).json({
        code: -1,
        error: result.error
      });
    }

    res.json({
      code: 0,
      data: result.result
    });

  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * DELETE /api/agents/:userId/:agentId
 * 解雇Agent
 */
router.delete('/:userId/:agentId', (req, res) => {
  try {
    const { userId, agentId } = req.params;

    // 调用领域服务
    const result = agentUseCases.fireAgent({ userId, agentId });

    if (!result.success) {
      return res.status(404).json({
        code: -1,
        error: result.error
      });
    }

    res.json({
      code: 0,
      message: `已解雇 ${result.agent.nickname}`,
      data: result.agent.toJSON()
    });

  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * PUT /api/agents/:userId/:agentId
 * 更新Agent信息（如nickname）
 */
router.put('/:userId/:agentId', (req, res) => {
  try {
    const { userId, agentId } = req.params;
    const { nickname } = req.body;

    // 获取Agent
    const agent = agentUseCases.updateNickname({ userId, agentId, nickname });

    if (!agent) {
      return res.status(404).json({
        code: -1,
        error: 'Agent不存在'
      });
    }

    res.json({
      code: 0,
      data: agent.toJSON()
    });

  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * POST /api/agents/team-collaboration
 * 团队协同工作（多个Agent共同完成任务）
 */
router.post('/team-collaboration', async (req, res) => {
  try {
    const { userId, agentIds, task, context } = req.body;

    if (!userId || !agentIds || !Array.isArray(agentIds) || !task) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数'
      });
    }

    const result = await agentUseCases.teamCollaboration({
      userId,
      agentIds,
      task,
      context
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
 * GET /api/agents/salary/:userId
 * 获取薪资分析报告
 */
router.get('/salary/:userId', (req, res) => {
  try {
    const { userId } = req.params;

    const report = agentUseCases.getSalaryReport({ userId });

    res.json({
      code: 0,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      code: -1,
      error: error.message
    });
  }
});

/**
 * GET /api/agents/tasks/:userId
 * 获取任务历史
 */
router.get('/tasks/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const { history, stats } = agentUseCases.getTaskHistory({
      userId,
      limit: parseInt(limit)
    });

    res.json({
      code: 0,
      data: {
        history,
        stats
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
