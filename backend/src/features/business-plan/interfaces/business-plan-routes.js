/**
 * 商业计划书生成 API
 * 负责路由装配与提示词初始化
 */
import express from 'express';
import { initializeBusinessPlanPrompts } from '../application/business-plan-prompt-registry.js';
import { registerGenerateChapterRoute } from './routes/business-plan-generate-chapter.route.js';
import { registerGenerateFullRoute } from './routes/business-plan-generate-full.route.js';
import { registerGenerateBatchRoute } from './routes/business-plan-generate-batch.route.js';
import { registerBusinessPlanMetaRoutes } from './routes/business-plan-meta.route.js';

const router = express.Router();

try {
  await initializeBusinessPlanPrompts();
  console.log('✅ Business plan prompts loaded successfully');
  console.log('✅ Proposal prompts loaded successfully');
} catch (error) {
  console.error('❌ Failed to load prompts:', error.message);
  console.error('❌ Failed to initialize business plan prompts:', error.message);
}

registerGenerateChapterRoute(router);
registerGenerateFullRoute(router);
registerGenerateBatchRoute(router);
registerBusinessPlanMetaRoutes(router);

export default router;
