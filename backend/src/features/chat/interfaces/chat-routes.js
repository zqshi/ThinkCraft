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
  } else if (error.message.includes('无权访问')) {
    statusCode = 403;
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

const normalizeAutoTitle = rawTitle => {
  if (!rawTitle || typeof rawTitle !== 'string') {
    return '';
  }
  let title = rawTitle.trim();
  title = title.replace(/^["'“”]+|["'“”]+$/g, '');
  title = title.replace(/\s+/g, ' ');
  title = title.replace(/[。！？!?]+$/g, '');
  if (title.length > 30) {
    title = title.slice(0, 30).trim();
  }
  return title;
};

const buildTitlePrompt = messages => {
  const roleMap = {
    user: '用户',
    assistant: '助手',
    system: '系统'
  };
  const transcript = messages
    .map(msg => `${roleMap[msg.role] || '用户'}：${msg.content}`)
    .join('\n');
  return `你是对话标题生成助手。\n\n任务：根据对话内容生成一个简洁、准确的中文标题。\n\n要求：\n1. 不超过20个汉字\n2. 不要使用引号\n3. 不要添加编号或前缀\n4. 避免过度概括，突出关键主题\n\n对话内容：\n${transcript}\n\n请只输出标题本身：`;
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
    body('titleEdited').optional().isBoolean().withMessage('titleEdited必须是布尔值'),
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
      const dto = new CreateChatDTO({ ...req.body, userId: req.user?.userId });
      const result = await chatUseCase.createChat(dto, req.user?.userId);

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
      const result = await chatUseCase.sendMessage(dto, req.user?.userId);

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
      const result = await chatUseCase.getChat(chatId, req.user?.userId);

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

      const result = await chatUseCase.getChatList(page, pageSize, filters, req.user?.userId);

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
      const result = await chatUseCase.updateChat(chatId, dto, req.user?.userId);

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
 * @route   POST /api/chat/:chatId/auto-title
 * @desc    自动生成聊天标题
 * @access  Public
 */
router.post(
  '/:chatId/auto-title',
  [
    param('chatId').isString().notEmpty().withMessage('聊天ID不能为空'),
    body('messages').optional().isArray().withMessage('messages必须是数组'),
    body('reason').optional().isString().isLength({ max: 50 }).withMessage('reason长度不能超过50')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { chatId } = req.params;
      const chat = await chatUseCase.getChat(chatId, req.user?.userId);

      if (!chat) {
        return res.status(404).json({ code: -1, error: '聊天不存在' });
      }

      if (chat.titleEdited) {
        return res.json({
          code: 0,
          data: {
            title: chat.title,
            skipped: true,
            reason: 'titleEdited'
          }
        });
      }

      const bodyMessages = Array.isArray(req.body.messages) ? req.body.messages : [];
      const sourceMessages = bodyMessages.length > 0 ? bodyMessages : chat.messages || [];
      const normalizedMessages = sourceMessages
        .filter(msg => msg && typeof msg.content === 'string')
        .map(msg => ({
          role: msg.role || msg.sender || 'user',
          content: String(msg.content).slice(0, 2000)
        }))
        .slice(-10);

      if (normalizedMessages.length === 0) {
        return res.status(400).json({ code: -1, error: '对话内容为空' });
      }

      const systemPrompt = '你是对话标题生成助手，只输出最终标题。';
      const userPrompt = buildTitlePrompt(normalizedMessages);

      const { callDeepSeekAPI } = await import('../../../infrastructure/ai/deepseek-client.js');
      const result = await callDeepSeekAPI([{ role: 'user', content: userPrompt }], systemPrompt, {
        timeout: 20000,
        temperature: 0.2
      });

      const title = normalizeAutoTitle(result?.content);
      if (!title) {
        return res.status(500).json({ code: -1, error: '标题生成失败' });
      }

      if (title === chat.title) {
        return res.json({ code: 0, data: { title } });
      }

      const updated = await chatUseCase.updateChat(
        chatId,
        new UpdateChatDTO({ title, titleEdited: false }),
        req.user?.userId
      );

      return res.json({
        code: 0,
        data: { title: updated.title, updatedAt: updated.updatedAt }
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
      await chatUseCase.deleteChat(chatId, req.user?.userId);

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
      const results = await chatUseCase.searchChats(keyword, req.user?.userId);

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
      const result = await chatUseCase.archiveChat(chatId, req.user?.userId);

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
      const result = await chatUseCase.restoreChat(chatId, req.user?.userId);

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
      const result = await chatUseCase.mergeChats(targetChatId, sourceChatIds, req.user?.userId);

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
    const stats = await chatUseCase.getChatStats(req.user?.userId);

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
    const { messages, systemPrompt: initialSystemPrompt } = req.body;
    let systemPrompt = initialSystemPrompt;

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
