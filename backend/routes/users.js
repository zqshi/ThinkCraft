/**
 * User API 路由
 * 提供用户数据导出（GDPR合规）
 */

import express from 'express';
import {
  User,
  Settings,
  Conversation,
  Message,
  Agent,
  AgentTask,
  CollaborationPlan,
  Report,
  ShareLink,
  ShareAccessLog,
  BusinessPlan,
  Demo
} from '../infrastructure/database/models/index.js';

const router = express.Router();

/**
 * GET /api/users/:userId/export
 * 导出用户数据（GDPR合规）
 */
router.get('/:userId/export', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        code: -1,
        error: '用户ID不能为空'
      });
    }

    if (req.userId && req.userId !== userId) {
      return res.status(403).json({
        code: -1,
        error: '无权导出其他用户数据'
      });
    }

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user) {
      return res.status(404).json({
        code: -1,
        error: '用户不存在'
      });
    }

    const [
      settings,
      conversations,
      agents,
      collaborationPlans,
      reports,
      shareLinks,
      businessPlans,
      demos
    ] = await Promise.all([
      Settings.findOne({ where: { userId } }),
      Conversation.findAll({
        where: { userId },
        include: [{ model: Message, as: 'messages' }],
        order: [['createdAt', 'DESC']]
      }),
      Agent.findAll({
        where: { userId },
        include: [{ model: AgentTask, as: 'tasks' }]
      }),
      CollaborationPlan.findAll({ where: { userId } }),
      Report.findAll({ where: { userId } }),
      ShareLink.findAll({
        where: { userId },
        include: [{ model: ShareAccessLog, as: 'accessLogs' }]
      }),
      BusinessPlan.findAll({ where: { userId } }),
      Demo.findAll({ where: { userId } })
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user: user.toJSON(),
      settings: settings ? settings.toJSON() : null,
      conversations: conversations.map((item) => item.toJSON()),
      agents: agents.map((item) => item.toJSON()),
      collaborationPlans: collaborationPlans.map((item) => item.toJSON()),
      reports: reports.map((item) => item.toJSON()),
      shareLinks: shareLinks.map((item) => item.toJSON()),
      businessPlans: businessPlans.map((item) => item.toJSON()),
      demos: demos.map((item) => item.toJSON())
    };

    const fileName = `thinkcraft-export-${userId}-${Date.now()}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.json({
      code: 0,
      data: payload
    });
  } catch (error) {
    console.error('[API] /users/:userId/export 错误:', error);
    return res.status(500).json({
      code: -1,
      error: error.message || '导出用户数据失败'
    });
  }
});

export default router;
