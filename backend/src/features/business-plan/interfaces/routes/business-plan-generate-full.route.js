import { callDeepSeekAPI, getCostStats } from '../../../../../config/deepseek.js';
import promptLoader from '../../../../utils/prompt-loader.js';
import { normalizeBusinessPlanChapterIds } from '../../domain/business-chapters.js';

export function registerGenerateFullRoute(router) {
  router.post('/generate-full', async (req, res, next) => {
    try {
      const { chapterIds, conversationHistory, type = 'business' } = req.body;
      const normalizedChapterIds = normalizeBusinessPlanChapterIds(type, chapterIds);

      if (!normalizedChapterIds || !Array.isArray(normalizedChapterIds) || normalizedChapterIds.length === 0) {
        return res.status(400).json({ code: -1, error: '缺少或无效的章节ID列表' });
      }

      if (!conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({ code: -1, error: '缺少或无效的对话历史' });
      }

      const startTime = Date.now();
      const docType = type === 'proposal' ? 'proposal' : 'business-plan';
      const { systemPrompt, prompt, metadata } = await promptLoader.buildPromptWithChapters(
        docType,
        normalizedChapterIds,
        conversationHistory
      );

      const result = await callDeepSeekAPI([{ role: 'user', content: prompt }], systemPrompt, {
        max_tokens: 8000,
        temperature: 0.7,
        timeout: 180000
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const costStats = getCostStats();

      return res.json({
        code: 0,
        data: {
          document: result.content,
          format: 'markdown',
          mode: 'full-document',
          selectedChapters: normalizedChapterIds,
          metadata,
          tokens: result.usage.total_tokens,
          duration: parseFloat(duration),
          costStats
        }
      });
    } catch (error) {
      return next(error);
    }
  });
}
