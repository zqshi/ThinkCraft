import { getCostStats } from '../../../../../config/deepseek.js';
import { generateSingleChapter } from '../../application/business-plan-generation.service.js';
import { normalizeBusinessPlanChapterIds } from '../../domain/business-chapters.js';

export function registerGenerateBatchRoute(router) {
  router.post('/generate-batch', async (req, res, next) => {
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
      const chapters = await Promise.all(
        normalizedChapterIds.map(id => generateSingleChapter(id, conversationHistory, type))
      );
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      const totalTokens = chapters.reduce((sum, item) => sum + item.tokens, 0);
      const costStats = getCostStats();

      return res.json({
        code: 0,
        data: {
          chapters,
          totalTokens,
          duration: parseFloat(duration),
          costStats
        }
      });
    } catch (error) {
      return next(error);
    }
  });
}
