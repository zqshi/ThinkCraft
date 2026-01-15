/**
 * 分享链接系统 API
 * 使用Share Domain Service处理业务逻辑
 */
import express from 'express';
import { shareUseCases } from '../application/index.js';
import { domainLoggers } from '../infrastructure/logging/domainLogger.js';

const router = express.Router();
const logger = domainLoggers.Share;

/**
 * POST /api/share/create
 * 创建分享链接
 */
router.post('/create', async (req, res, next) => {
  try {
    const { userId, type, data, title, options } = req.body;

    if (!userId || !type || !data) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: userId, type 和 data'
      });
    }

    const result = await shareUseCases.createShare({
      userId,
      type,
      data,
      title,
      options
    });

    res.json({
      code: 0,
      data: result
    });
  } catch (error) {
    logger.error('创建分享链接失败', error);
    next(error);
  }
});

/**
 * GET /api/share/:shareId
 * 获取分享内容
 */
router.get('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = req.params;

    // 收集访问信息
    const accessInfo = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    };

    const shareData = await shareUseCases.getShare({ shareId, accessInfo });

    if (!shareData) {
      return res.status(404).json({
        code: -1,
        error: '分享链接不存在或已过期'
      });
    }

    res.json({
      code: 0,
      data: shareData
    });
  } catch (error) {
    logger.error('获取分享内容失败', error);
    next(error);
  }
});

/**
 * GET /api/share/user/:userId
 * 获取用户的分享列表
 */
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { type, limit = 50, offset = 0 } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (type) {
      options.type = type;
    }

    const shares = await shareUseCases.getUserShares({ userId, options });

    res.json({
      code: 0,
      data: shares
    });
  } catch (error) {
    logger.error('获取用户分享列表失败', error);
    next(error);
  }
});

/**
 * DELETE /api/share/:shareId
 * 删除分享链接
 */
router.delete('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: userId'
      });
    }

    const success = await shareUseCases.deleteShare({ shareId, userId });

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '分享链接不存在或无权限'
      });
    }

    res.json({
      code: 0,
      message: '分享已删除'
    });
  } catch (error) {
    logger.error('删除分享链接失败', error);
    next(error);
  }
});

/**
 * GET /api/share/qrcode/:shareId
 * 生成分享二维码
 */
router.get('/qrcode/:shareId', async (req, res, next) => {
  try {
    const { shareId } = req.params;

    const qrCodeUrl = shareUseCases.generateQRCodeUrl({ shareId });

    // 重定向到二维码图片
    res.redirect(qrCodeUrl);
  } catch (error) {
    logger.error('生成二维码失败', error);
    next(error);
  }
});

/**
 * GET /api/share/:shareId/logs
 * 获取分享的访问日志
 */
router.get('/:shareId/logs', async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const logs = await shareUseCases.getAccessLogs({ shareId, options });

    res.json({
      code: 0,
      data: logs
    });
  } catch (error) {
    logger.error('获取访问日志失败', error);
    next(error);
  }
});

/**
 * PUT /api/share/:shareId/title
 * 更新分享标题
 */
router.put('/:shareId/title', async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: title'
      });
    }

    const success = await shareUseCases.updateShareTitle({ shareId, title });

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '分享链接不存在'
      });
    }

    res.json({
      code: 0,
      message: '标题更新成功'
    });
  } catch (error) {
    logger.error('更新分享标题失败', error);
    next(error);
  }
});

/**
 * PUT /api/share/:shareId/extend
 * 延长分享有效期
 */
router.put('/:shareId/extend', async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const { additionalDays } = req.body;

    if (!additionalDays) {
      return res.status(400).json({
        code: -1,
        error: '缺少必要参数: additionalDays'
      });
    }

    const success = await shareUseCases.extendExpiration({
      shareId,
      additionalDays: parseInt(additionalDays)
    });

    if (!success) {
      return res.status(404).json({
        code: -1,
        error: '分享链接不存在'
      });
    }

    res.json({
      code: 0,
      message: '有效期延长成功'
    });
  } catch (error) {
    logger.error('延长有效期失败', error);
    next(error);
  }
});

/**
 * GET /api/share/stats/summary
 * 获取分享统计信息
 */
router.get('/stats/summary', async (req, res, next) => {
  try {
    const stats = await shareUseCases.getStats();

    res.json({
      code: 0,
      data: stats
    });
  } catch (error) {
    logger.error('获取分享统计信息失败', error);
    next(error);
  }
});

/**
 * GET /api/share/stats/user/:userId
 * 获取用户的分享统计
 */
router.get('/stats/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const stats = await shareUseCases.getUserStats({ userId });

    res.json({
      code: 0,
      data: stats
    });
  } catch (error) {
    logger.error('获取用户分享统计失败', error);
    next(error);
  }
});

export default router;
