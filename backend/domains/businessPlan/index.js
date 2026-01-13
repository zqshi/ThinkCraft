/**
 * BusinessPlan领域模块统一导出
 */

// 值对象
export {
  BusinessPlanChapter,
  CHAPTER_PROMPTS,
  CHAPTER_AGENTS,
  CHAPTER_NAMES
} from './models/valueObjects/BusinessPlanChapter.js';

// 领域服务
export {
  BusinessPlanGenerationService,
  businessPlanGenerationService
} from './services/BusinessPlanGenerationService.js';

// BusinessPlan领域门面
import { businessPlanGenerationService } from './services/BusinessPlanGenerationService.js';

export const BusinessPlanDomain = {
  generation: businessPlanGenerationService
};

export default BusinessPlanDomain;
