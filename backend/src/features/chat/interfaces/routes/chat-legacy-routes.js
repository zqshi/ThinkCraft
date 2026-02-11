export function registerChatLegacyRoutes(router, deps) {
  const { promptLoader } = deps;

  router.post('/', async (req, res) => {
    try {
      const { messages, systemPrompt: initialSystemPrompt } = req.body;
      let systemPrompt = initialSystemPrompt;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ code: -1, error: '消息列表不能为空' });
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

      const { callDeepSeekAPI } = await import('../../../../infrastructure/ai/deepseek-client.js');
      const result = await callDeepSeekAPI(messages, systemPrompt, {
        timeout: 120000
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
}
