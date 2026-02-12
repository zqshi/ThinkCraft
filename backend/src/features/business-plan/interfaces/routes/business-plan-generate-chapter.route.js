import { generateSingleChapter } from '../../application/business-plan-generation.service.js';
import { isValidBusinessPlanChapterId } from '../../domain/business-chapters.js';

export function registerGenerateChapterRoute(router) {
  router.post('/generate-chapter', async (req, res, next) => {
    try {
      const {
        chapterId,
        conversationHistory,
        type = 'business',
        useDeepResearch = false,
        researchDepth = 'medium'
      } = req.body;

      if (!chapterId) {
        return res.status(400).json({ code: -1, error: '缺少必要参数: chapterId' });
      }

      if (!isValidBusinessPlanChapterId(type, chapterId)) {
        const docLabel = type === 'proposal' ? '产品立项材料' : '商业计划书';
        return res.status(400).json({ code: -1, error: `${docLabel}章节ID无效: ${chapterId}` });
      }

      if (!conversationHistory || !Array.isArray(conversationHistory)) {
        return res.status(400).json({ code: -1, error: '缺少或无效的对话历史' });
      }

      const result = await generateSingleChapter(
        chapterId,
        conversationHistory,
        type,
        useDeepResearch,
        researchDepth
      );

      return res.json({ code: 0, data: result });
    } catch (error) {
      return next(error);
    }
  });
}
