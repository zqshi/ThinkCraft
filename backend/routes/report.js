/**
 * 报告生成 API
 * 使用Report Domain Service处理业务逻辑
 */
import express from 'express';
import { reportUseCases } from '../application/index.js';
import { domainLoggers } from '../infrastructure/logging/domainLogger.js';

const router = express.Router();
const logger = domainLoggers.Report;

/**
 * POST /api/report/generate
 * 生成报告
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { conversationId, userId, messages } = req.body;

    // 参数验证
    if (!conversationId || !userId) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: conversationId 和 userId'
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        code: -1,
        error: '必须提供有效的对话历史'
      });
    }

    // 调用Service生成报告
    const result = await reportUseCases.generateReport({
      conversationId,
      userId,
      messages
    });

    res.json({
      code: 0,
      data: result
    });
  } catch (error) {
    logger.error('生成报告失败', error);
    next(error);
  }
});

/**
 * GET /api/report/:reportId
 * 获取报告详情
 */
router.get('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await reportUseCases.getReport({ reportId });

    if (!report) {
      return res.status(404).json({
        code: -1,
        error: '报告不存在'
      });
    }

    res.json({
      code: 0,
      data: report
    });
  } catch (error) {
    logger.error('获取报告失败', error);
    next(error);
  }
});

/**
 * GET /api/report/conversation/:conversationId
 * 根据对话ID获取报告
 */
router.get('/conversation/:conversationId', async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const report = await reportUseCases.getReportByConversationId({ conversationId });

    if (!report) {
      return res.status(404).json({
        code: -1,
        error: '该对话暂无报告'
      });
    }

    res.json({
      code: 0,
      data: report
    });
  } catch (error) {
    logger.error('根据对话ID获取报告失败', error);
    next(error);
  }
});

/**
 * GET /api/report/user/:userId
 * 获取用户的报告列表
 */
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (status) {
      options.status = status;
    }

    const reports = await reportUseCases.getUserReports({ userId, options });

    res.json({
      code: 0,
      data: reports
    });
  } catch (error) {
    logger.error('获取用户报告列表失败', error);
    next(error);
  }
});

/**
 * PUT /api/report/:reportId/status
 * 更新报告状态
 */
router.put('/:reportId/status', async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: status'
      });
    }

    const success = await reportUseCases.updateStatus({ reportId, status });

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '报告不存在'
      });
    }

    res.json({
      code: 0,
      message: '状态更新成功'
    });
  } catch (error) {
    logger.error('更新报告状态失败', error);
    next(error);
  }
});

/**
 * PUT /api/report/:reportId/data
 * 更新报告数据
 */
router.put('/:reportId/data', async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { reportData } = req.body;

    if (!reportData) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: reportData'
      });
    }

    const success = await reportUseCases.updateReportData({
      reportId,
      reportData
    });

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '报告不存在'
      });
    }

    res.json({
      code: 0,
      message: '报告数据更新成功'
    });
  } catch (error) {
    logger.error('更新报告数据失败', error);
    next(error);
  }
});

/**
 * DELETE /api/report/:reportId
 * 删除报告
 */
router.delete('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: userId'
      });
    }

    const success = await reportUseCases.deleteReport({ reportId, userId });

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '报告不存在或无权限'
      });
    }

    res.json({
      code: 0,
      message: '报告删除成功'
    });
  } catch (error) {
    logger.error('删除报告失败', error);
    next(error);
  }
});

/**
 * POST /api/report/:reportId/regenerate
 * 重新生成报告
 */
router.post('/:reportId/regenerate', async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        code: -1,
        error: '必须提供有效的对话历史'
      });
    }

    const result = await reportUseCases.regenerateReport({
      reportId,
      messages
    });

    res.json({
      code: 0,
      data: result
    });
  } catch (error) {
    logger.error('重新生成报告失败', error);
    next(error);
  }
});

/**
 * GET /api/report/stats/summary
 * 获取报告统计信息
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const stats = await reportUseCases.getStats();

    res.json({
      code: 0,
      data: stats
    });
  } catch (error) {
    logger.error('获取报告统计信息失败', error);
    next(error);
  }
});

/**
 * GET /api/report/stats/user/:userId
 * 获取用户的报告统计
 */
router.get('/stats/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const stats = await reportUseCases.getUserStats({ userId });

    res.json({
      code: 0,
      data: stats
    });
  } catch (error) {
    logger.error('获取用户报告统计失败', error);
    next(error);
  }
});

export default router;
