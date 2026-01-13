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
import { callDeepSeekAPI } from '../config/deepseek.js';
import {
  AgentDomain,
  agentHireService,
  taskAssignmentService,
  salaryService
} from '../domains/agent/index.js';

const router = express.Router();

/**
 * GET /api/agents/types
 * 获取所有Agent类型
 */
router.get('/types', (req, res) => {
  try {
    const types = agentHireService.getAvailableAgentTypes();

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
    const result = agentHireService.hire(userId, agentType, nickname);

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
    const agents = agentHireService.getUserAgents(userId);
    const stats = agentHireService.getTeamStats(userId);

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
    const result = await taskAssignmentService.assignTask(userId, agentId, task, context);

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
    const result = agentHireService.fire(userId, agentId);

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
    const agent = agentHireService.getAgentById(userId, agentId);

    if (!agent) {
      return res.status(404).json({
        code: -1,
        error: 'Agent不存在'
      });
    }

    // 更新昵称
    if (nickname) {
      agent.nickname = nickname;
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

    // 获取选中的Agent
    const selectedAgents = agentIds
      .map(id => agentHireService.getAgentById(userId, id))
      .filter(agent => agent !== null);

    if (selectedAgents.length === 0) {
      return res.status(404).json({
        code: -1,
        error: '未找到指定的Agent'
      });
    }

    console.log(`[Agents] 团队协同: ${selectedAgents.map(a => a.nickname).join(', ')}`);

    // 更新所有Agent状态为工作中
    selectedAgents.forEach(agent => {
      agent.assignTask({ description: task, context, type: 'team-collaboration' });
    });

    // 生成协同任务提示词
    const agentRoles = selectedAgents.map(agent => {
      const agentType = agent.getType();
      return `${agentType.emoji} ${agent.nickname}（${agentType.name}）`;
    }).join('、');

    const prompt = `你现在是一个由多个专业人员组成的团队：${agentRoles}。

请团队协作完成以下任务：
${task}

${context ? `背景信息：\n${context}` : ''}

要求：
- 每个角色从自己的专业角度贡献意见
- 团队成员之间要有协作和讨论
- 输出综合性的解决方案

请用以下格式输出：
1. 【团队讨论】各角色的初步想法
2. 【方案整合】综合各方意见的最终方案
3. 【分工协作】明确每个角色的具体任务`;

    const result = await callDeepSeekAPI(
      [{ role: 'user', content: prompt }],
      null,
      {
        max_tokens: 3000,
        temperature: 0.8
      }
    );

    // 完成任务并更新Agent状态
    selectedAgents.forEach(agent => {
      agent.completeTask({
        content: result.content,
        tokens: result.usage.total_tokens / selectedAgents.length // 平均分配token
      });
    });

    const collaborationResult = {
      teamMembers: selectedAgents.map(agent => ({
        id: agent.id,
        name: agent.nickname,
        type: agent.typeId
      })),
      task,
      result: result.content,
      tokens: result.usage.total_tokens,
      completedAt: new Date().toISOString()
    };

    console.log(`[Agents] 团队协同完成，tokens: ${result.usage.total_tokens}`);

    res.json({
      code: 0,
      data: collaborationResult
    });

  } catch (error) {
    // 恢复所有Agent状态
    const { userId, agentIds } = req.body;
    if (userId && agentIds) {
      agentIds.forEach(id => {
        const agent = agentHireService.getAgentById(userId, id);
        if (agent && agent.isWorking()) {
          agent.failTask('团队协同失败');
        }
      });
    }

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

    const report = salaryService.getSalaryAnalysisReport(userId);

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

    const history = taskAssignmentService.getUserTaskHistory(userId, parseInt(limit));
    const stats = taskAssignmentService.getTaskStats(userId);

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
