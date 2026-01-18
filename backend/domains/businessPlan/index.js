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

// Repository
export {
  BusinessPlanRepository,
  businessPlanRepository
} from './repositories/BusinessPlanRepository.js';

// BusinessPlan领域门面
import { businessPlanGenerationService } from './services/BusinessPlanGenerationService.js';
import { businessPlanRepository } from './repositories/BusinessPlanRepository.js';

export const BusinessPlanDomain = {
  generation: businessPlanGenerationService,
  repository: businessPlanRepository
};

export default BusinessPlanDomain;
