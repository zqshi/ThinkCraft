/**
 * 对话管理 API
 * 使用Conversation Domain Service处理业务逻辑
 */
import express from 'express';
import { conversationService } from '../domains/conversation/index.js';
import { domainLoggers } from '../infrastructure/logging/domainLogger.js';

const router = express.Router();
const logger = domainLoggers.Conversation;

/**
 * POST /api/conversations
 * 创建新对话
 */
router.post('/', async (req, res, next) => {
  try {
    const { userId, title, userData } = req.body;

    if (!userId || !title) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: userId 和 title'
      });
    }

    const conversation = await conversationService.createConversation(
      userId,
      title,
      userData
    );

    res.json({
      code: 0,
      data: conversation
    });
  } catch (error) {
    logger.error('创建对话失败', error);
    next(error);
  }
});

/**
 * GET /api/conversations/:conversationId
 * 获取对话详情
 */
router.get('/:conversationId', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { includeMessages = 'false' } = req.query;

    const conversation = await conversationService.getConversation(
      conversationId,
      includeMessages === 'true'
    );

    if (!conversation) {
      return res.status(404).json({
        code: -1,
        error: '对话不存在'
      });
    }

    res.json({
      code: 0,
      data: conversation
    });
  } catch (error) {
    logger.error('获取对话失败', error);
    next(error);
  }
});

/**
 * GET /api/conversations/user/:userId
 * 获取用户的对话列表
 */
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, isPinned } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (isPinned !== undefined) {
      options.isPinned = isPinned === 'true';
    }

    const conversations = await conversationService.getUserConversations(
      userId,
      options
    );

    res.json({
      code: 0,
      data: conversations
    });
  } catch (error) {
    logger.error('获取用户对话列表失败', error);
    next(error);
  }
});

/**
 * PUT /api/conversations/:conversationId/title
 * 更新对话标题
 */
router.put('/:conversationId/title', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: title'
      });
    }

    const success = await conversationService.updateTitle(conversationId, title);

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '对话不存在'
      });
    }

    res.json({
      code: 0,
      message: '标题更新成功'
    });
  } catch (error) {
    logger.error('更新对话标题失败', error);
    next(error);
  }
});

/**
 * PUT /api/conversations/:conversationId/pin
 * 置顶/取消置顶对话
 */
router.put('/:conversationId/pin', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { isPinned } = req.body;

    if (isPinned === undefined) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: isPinned'
      });
    }

    const success = await conversationService.pinConversation(
      conversationId,
      isPinned
    );

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '对话不存在'
      });
    }

    res.json({
      code: 0,
      message: isPinned ? '置顶成功' : '取消置顶成功'
    });
  } catch (error) {
    logger.error('更新对话置顶状态失败', error);
    next(error);
  }
});

/**
 * DELETE /api/conversations/:conversationId
 * 删除对话
 */
router.delete('/:conversationId', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: userId'
      });
    }

    const success = await conversationService.deleteConversation(
      conversationId,
      userId
    );

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '对话不存在或无权限'
      });
    }

    res.json({
      code: 0,
      message: '对话删除成功'
    });
  } catch (error) {
    logger.error('删除对话失败', error);
    next(error);
  }
});

/**
 * POST /api/conversations/:conversationId/messages
 * 添加消息到对话
 */
router.post('/:conversationId/messages', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { role, content } = req.body;

    if (!role || !content) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: role 和 content'
      });
    }

    const message = await conversationService.addMessage(
      conversationId,
      role,
      content
    );

    res.json({
      code: 0,
      data: message
    });
  } catch (error) {
    logger.error('添加消息失败', error);
    next(error);
  }
});

/**
 * GET /api/conversations/:conversationId/messages
 * 获取对话的消息历史
 */
router.get('/:conversationId/messages', async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const messages = await conversationService.getMessages(conversationId);

    res.json({
      code: 0,
      data: messages
    });
  } catch (error) {
    logger.error('获取对话消息失败', error);
    next(error);
  }
});

/**
 * POST /api/conversations/:conversationId/send
 * 发送消息并获取AI回复
 */
router.post('/:conversationId/send', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { message, options = {} } = req.body;

    if (!message) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: message'
      });
    }

    const result = await conversationService.sendMessage(
      conversationId,
      message,
      options
    );

    res.json({
      code: 0,
      data: result
    });
  } catch (error) {
    logger.error('发送消息失败', error);
    next(error);
  }
});

/**
 * PUT /api/conversations/:conversationId/step
 * 推进对话步骤
 */
router.put('/:conversationId/step', async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const newStep = await conversationService.advanceStep(conversationId);

    res.json({
      code: 0,
      data: { step: newStep }
    });
  } catch (error) {
    logger.error('推进对话步骤失败', error);
    next(error);
  }
});

/**
 * PUT /api/conversations/:conversationId/analysis-complete
 * 标记分析完成
 */
router.put('/:conversationId/analysis-complete', async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const success = await conversationService.markAnalysisCompleted(conversationId);

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '对话不存在'
      });
    }

    res.json({
      code: 0,
      message: '分析标记完成'
    });
  } catch (error) {
    logger.error('标记分析完成失败', error);
    next(error);
  }
});

/**
 * GET /api/conversations/stats/summary
 * 获取对话统计信息
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const stats = await conversationService.getStats();

    res.json({
      code: 0,
      data: stats
    });
  } catch (error) {
    logger.error('获取对话统计信息失败', error);
    next(error);
  }
});

/**
 * GET /api/conversations/stats/user/:userId
 * 获取用户的对话统计
 */
router.get('/stats/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const stats = await conversationService.getUserStats(userId);

    res.json({
      code: 0,
      data: stats
    });
  } catch (error) {
    logger.error('获取用户对话统计失败', error);
    next(error);
  }
});

export default router;
