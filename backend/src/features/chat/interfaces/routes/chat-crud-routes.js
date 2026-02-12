export function registerChatCrudRoutes(router, deps) {
  const {
    body,
    param,
    query,
    validateRequest,
    handleError,
    chatUseCase,
    CreateChatDTO,
    AddMessageDTO,
    UpdateChatDTO
  } = deps;

  router.post(
    '/create',
    [
      body('title').optional().isString().isLength({ min: 1, max: 200 }).withMessage('聊天标题长度必须在1-200个字符之间'),
      body('titleEdited').optional().isBoolean().withMessage('titleEdited必须是布尔值'),
      body('initialMessage').optional().isString().isLength({ max: 10000 }).withMessage('初始消息不能超过10000个字符'),
      body('tags').optional().isArray().withMessage('标签必须是数组'),
      body('tags.*').isString().withMessage('标签必须是字符串'),
      body('userId').optional().isString().withMessage('用户ID必须是字符串')
    ],
    validateRequest,
    async (req, res) => {
      try {
        const dto = new CreateChatDTO({ ...req.body, userId: req.user?.userId });
        const result = await chatUseCase.createChat(dto, req.user?.userId);
        res.json({ code: 0, data: result, message: '聊天创建成功' });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  router.post(
    '/send-message',
    [
      body('chatId').isString().notEmpty().withMessage('聊天ID不能为空'),
      body('content').isString().isLength({ min: 1, max: 10000 }).withMessage('消息内容长度必须在1-10000个字符之间'),
      body('type').optional().isIn(['text', 'image', 'code', 'file', 'system']).withMessage('消息类型无效'),
      body('sender').optional().isIn(['user', 'assistant', 'system']).withMessage('发送者类型无效'),
      body('metadata').optional().isObject().withMessage('元数据必须是对象')
    ],
    validateRequest,
    async (req, res) => {
      try {
        const dto = new AddMessageDTO(req.body);
        const result = await chatUseCase.sendMessage(dto, req.user?.userId);
        res.json({ code: 0, data: result, message: '消息发送成功' });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  router.get(
    '/:chatId',
    [param('chatId').isString().notEmpty().withMessage('聊天ID不能为空')],
    validateRequest,
    async (req, res) => {
      try {
        const { chatId } = req.params;
        const result = await chatUseCase.getChat(chatId, req.user?.userId);
        res.json({ code: 0, data: result });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  router.get(
    '/',
    [
      query('page').optional().isInt({ min: 1 }).withMessage('页码必须是大于0的整数'),
      query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
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
        res.json({ code: 0, data: result });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  router.put(
    '/:chatId',
    [
      param('chatId').isString().notEmpty().withMessage('聊天ID不能为空'),
      body('title').optional().isString().isLength({ min: 1, max: 200 }).withMessage('聊天标题长度必须在1-200个字符之间'),
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
        res.json({ code: 0, data: result, message: '聊天更新成功' });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  router.delete(
    '/:chatId',
    [param('chatId').isString().notEmpty().withMessage('聊天ID不能为空')],
    validateRequest,
    async (req, res) => {
      try {
        const { chatId } = req.params;
        await chatUseCase.deleteChat(chatId, req.user?.userId);
        res.json({ code: 0, message: '聊天删除成功' });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  router.post(
    '/search',
    [body('keyword').isString().isLength({ min: 1, max: 100 }).withMessage('搜索关键词长度必须在1-100个字符之间')],
    validateRequest,
    async (req, res) => {
      try {
        const { keyword } = req.body;
        const results = await chatUseCase.searchChats(keyword, req.user?.userId);
        res.json({ code: 0, data: results, totalCount: results.length });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  router.post(
    '/:chatId/archive',
    [param('chatId').isString().notEmpty().withMessage('聊天ID不能为空')],
    validateRequest,
    async (req, res) => {
      try {
        const { chatId } = req.params;
        const result = await chatUseCase.archiveChat(chatId, req.user?.userId);
        res.json({ code: 0, data: result, message: '聊天归档成功' });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  router.post(
    '/:chatId/restore',
    [param('chatId').isString().notEmpty().withMessage('聊天ID不能为空')],
    validateRequest,
    async (req, res) => {
      try {
        const { chatId } = req.params;
        const result = await chatUseCase.restoreChat(chatId, req.user?.userId);
        res.json({ code: 0, data: result, message: '聊天恢复成功' });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

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
        res.json({ code: 0, data: result, message: '聊天合并成功' });
      } catch (error) {
        handleError(res, error);
      }
    }
  );

  router.get('/stats', async (req, res) => {
    try {
      const stats = await chatUseCase.getChatStats(req.user?.userId);
      res.json({ code: 0, data: stats });
    } catch (error) {
      handleError(res, error);
    }
  });
}
