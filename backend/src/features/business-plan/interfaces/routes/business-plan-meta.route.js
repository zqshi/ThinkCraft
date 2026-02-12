import { getCostStats } from '../../../../../config/deepseek.js';
import { CHAPTER_AGENTS } from '../../domain/chapter-agents.js';
import { getChapterPrompts } from '../../application/business-plan-prompt-registry.js';

export function registerBusinessPlanMetaRoutes(router) {
  router.get('/chapters', (req, res) => {
    const chapters = Object.keys(getChapterPrompts()).map(id => ({
      id,
      ...CHAPTER_AGENTS[id]
    }));

    return res.json({ code: 0, data: { chapters } });
  });

  router.get('/cost-stats', (req, res) => {
    const stats = getCostStats();
    return res.json({ code: 0, data: stats });
  });
}
