import { callDeepSeekAPI } from '../../../../../config/deepseek.js';

export function registerChatTitleRoutes(router, deps) {
  const {
    body,
    param,
    validateRequest,
    handleError,
    chatUseCase,
    UpdateChatDTO,
    buildTitlePrompt,
    normalizeAutoTitle
  } = deps;

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

        const fallbackTitle = buildFallbackTitle(normalizedMessages);
        let title = '';
        try {
          const systemPrompt = '你是对话标题生成助手，只输出最终标题。';
          const userPrompt = buildTitlePrompt(normalizedMessages);
          const result = await callDeepSeekAPI(
            [{ role: 'user', content: userPrompt }],
            systemPrompt,
            {
              timeout: 20000,
              temperature: 0.2
            }
          );
          title = normalizeAutoTitle(result?.content);
        } catch (error) {
          // 标题生成为非关键路径，模型失败时回退本地规则，避免接口500。
          title = fallbackTitle;
        }
        if (!title) {
          title = fallbackTitle;
        }
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
}

function buildFallbackTitle(messages = []) {
  const source = [...messages].reverse().find(msg => {
    return msg && msg.role === 'user' && typeof msg.content === 'string' && msg.content.trim();
  });
  const raw = source?.content || messages[messages.length - 1]?.content || '新对话';
  const line = String(raw).split('\n').find(item => item.trim()) || '新对话';
  const normalized = line.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '新对话';
  }
  return normalized.length > 20 ? `${normalized.slice(0, 20)}...` : normalized;
}
