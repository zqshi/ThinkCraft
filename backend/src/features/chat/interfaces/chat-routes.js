/**
 * 聊天接口层 - REST API
 * 处理HTTP请求和响应
 */
import express from 'express';
import promptLoader from '../../../utils/prompt-loader.js';
import { body, param, query, validationResult } from 'express-validator';
import { ChatUseCase } from '../application/chat.use-case.js';
import { CreateChatDTO, AddMessageDTO, UpdateChatDTO } from '../application/chat.dto.js';

const router = express.Router();
const chatUseCase = new ChatUseCase();

/**
 * 验证请求中间件
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      code: -1,
      error: '请求参数验证失败',
      details: errors.array()
    });
  }
  next();
};

/**
 * 错误处理函数
 */
const handleError = (res, error) => {
  console.error('Chat API Error:', error);

  let statusCode = 500;
  let errorMessage = '服务器内部错误';

  if (error.message.includes('不存在')) {
    statusCode = 404;
    errorMessage = error.message;
  } else if (error.message.includes('验证失败')) {
    statusCode = 400;
    errorMessage = error.message;
  } else if (error.message.includes('不能为空')) {
    statusCode = 400;
    errorMessage = error.message;
  }

  return res.status(statusCode).json({
    code: -1,
    error: errorMessage,
    details: error.message
  });
};

/**
 * @route   POST /api/chat/create
 * @desc    创建新的聊天会话
 * @access  Public
 */
router.post(
  '/create',
  [
    body('title')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('聊天标题长度必须在1-200个字符之间'),
    body('initialMessage')
      .optional()
      .isString()
      .isLength({ max: 10000 })
      .withMessage('初始消息不能超过10000个字符'),
    body('tags').optional().isArray().withMessage('标签必须是数组'),
    body('tags.*').isString().withMessage('标签必须是字符串'),
    body('userId').optional().isString().withMessage('用户ID必须是字符串')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const dto = new CreateChatDTO(req.body);
      const result = await chatUseCase.createChat(dto);

      res.json({
        code: 0,
        data: result,
        message: '聊天创建成功'
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   POST /api/chat/send-message
 * @desc    发送消息
 * @access  Public
 */
router.post(
  '/send-message',
  [
    body('chatId').isString().notEmpty().withMessage('聊天ID不能为空'),
    body('content')
      .isString()
      .isLength({ min: 1, max: 10000 })
      .withMessage('消息内容长度必须在1-10000个字符之间'),
    body('type')
      .optional()
      .isIn(['text', 'image', 'code', 'file', 'system'])
      .withMessage('消息类型无效'),
    body('sender').optional().isIn(['user', 'assistant', 'system']).withMessage('发送者类型无效'),
    body('metadata').optional().isObject().withMessage('元数据必须是对象')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const dto = new AddMessageDTO(req.body);
      const result = await chatUseCase.sendMessage(dto);

      res.json({
        code: 0,
        data: result,
        message: '消息发送成功'
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   GET /api/chat/:chatId
 * @desc    获取聊天详情
 * @access  Public
 */
router.get(
  '/:chatId',
  [param('chatId').isString().notEmpty().withMessage('聊天ID不能为空')],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const result = await chatUseCase.getChat(chatId);

      res.json({
        code: 0,
        data: result
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   GET /api/chat
 * @desc    获取聊天列表
 * @access  Public
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须是1-100之间的整数'),
    query('status').optional().isIn(['active', 'archived', 'deleted']).withMessage('状态值无效'),
    query('tags').optional().isString().withMessage('标签必须是字符串'),
    query('isPinned').optional().isBoolean().withMessage('置顶状态必须是布尔值')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 20;

      const filters = {};
      if (req.query.status) {
        filters.status = req.query.status;
      }
      if (req.query.tags) {
        filters.tags = req.query.tags.split(',');
      }
      if (req.query.isPinned !== undefined) {
        filters.isPinned = req.query.isPinned === 'true';
      }

      const result = await chatUseCase.getChatList(page, pageSize, filters);

      res.json({
        code: 0,
        data: result
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   PUT /api/chat/:chatId
 * @desc    更新聊天
 * @access  Public
 */
router.put(
  '/:chatId',
  [
    param('chatId').isString().notEmpty().withMessage('聊天ID不能为空'),
    body('title')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('聊天标题长度必须在1-200个字符之间'),
    body('status').optional().isIn(['active', 'archived', 'deleted']).withMessage('状态值无效'),
    body('tags').optional().isArray().withMessage('标签必须是数组'),
    body('tags.*').isString().withMessage('标签必须是字符串'),
    body('isPinned').optional().isBoolean().withMessage('置顶状态必须是布尔值')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const dto = new UpdateChatDTO(req.body);
      const result = await chatUseCase.updateChat(chatId, dto);

      res.json({
        code: 0,
        data: result,
        message: '聊天更新成功'
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   DELETE /api/chat/:chatId
 * @desc    删除聊天
 * @access  Public
 */
router.delete(
  '/:chatId',
  [param('chatId').isString().notEmpty().withMessage('聊天ID不能为空')],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      await chatUseCase.deleteChat(chatId);

      res.json({
        code: 0,
        message: '聊天删除成功'
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   POST /api/chat/search
 * @desc    搜索聊天内容
 * @access  Public
 */
router.post(
  '/search',
  [
    body('keyword')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('搜索关键词长度必须在1-100个字符之间')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { keyword } = req.body;
      const results = await chatUseCase.searchChats(keyword);

      res.json({
        code: 0,
        data: results,
        totalCount: results.length
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   POST /api/chat/:chatId/archive
 * @desc    归档聊天
 * @access  Public
 */
router.post(
  '/:chatId/archive',
  [param('chatId').isString().notEmpty().withMessage('聊天ID不能为空')],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const result = await chatUseCase.archiveChat(chatId);

      res.json({
        code: 0,
        data: result,
        message: '聊天归档成功'
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   POST /api/chat/:chatId/restore
 * @desc    恢复聊天
 * @access  Public
 */
router.post(
  '/:chatId/restore',
  [param('chatId').isString().notEmpty().withMessage('聊天ID不能为空')],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const result = await chatUseCase.restoreChat(chatId);

      res.json({
        code: 0,
        data: result,
        message: '聊天恢复成功'
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   POST /api/chat/merge
 * @desc    合并聊天
 * @access  Public
 */
router.post(
  '/merge',
  [
    body('targetChatId').isString().notEmpty().withMessage('目标聊天ID不能为空'),
    body('sourceChatIds').isArray({ min: 1 }).withMessage('源聊天ID列表不能为空数组'),
    body('sourceChatIds.*').isString().withMessage('源聊天ID必须是字符串')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { targetChatId, sourceChatIds } = req.body;
      const result = await chatUseCase.mergeChats(targetChatId, sourceChatIds);

      res.json({
        code: 0,
        data: result,
        message: '聊天合并成功'
      });
    } catch (error) {
      handleError(res, error);
    }
  }
);

/**
 * @route   GET /api/chat/stats
 * @desc    获取聊天统计信息
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await chatUseCase.getChatStats();

    res.json({
      code: 0,
      data: stats
    });
  } catch (error) {
    handleError(res, error);
  }
});

// 保持原有的聊天接口以兼容现有代码
router.post('/', async (req, res) => {
  try {
    let { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        code: -1,
        error: '消息列表不能为空'
      });
    }

    if (!systemPrompt) {
      try {
        const fallbackPrompt = await promptLoader.load(
          'scene-1-dialogue/dialogue-guide/system-default'
        );
        const markerMatch = fallbackPrompt.match(/##\s*System Prompt[\s\S]*/i);
        systemPrompt = markerMatch
          ? markerMatch[0].replace(/##\s*System Prompt\s*/i, '').trim()
          : fallbackPrompt;
        console.warn('[Chat API] systemPrompt missing, using fallback from prompts');
      } catch (error) {
        console.warn('[Chat API] systemPrompt missing and fallback load failed:', error.message);
      }
    }

    if (!systemPrompt) {
      console.warn('[Chat API] systemPrompt missing');
    }

    // 调用 DeepSeek API
    const { callDeepSeekAPI } = await import('../../../infrastructure/ai/deepseek-client.js');
    const result = await callDeepSeekAPI(messages, systemPrompt, {
      timeout: 120000 // 120秒超时，适应较长的AI响应时间
    });

    return res.json({
      code: 0,
      data: {
        content: result.content,
        model: result.model,
        usage: result.usage,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return res.status(500).json({
      code: -1,
      error: error.message || '服务器内部错误'
    });
  }
});

export default router;
