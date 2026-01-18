/**
 * Demo领域模块统一导出
 */

import { DemoType, DEMO_TYPES, CODE_GENERATION_PROMPTS } from './models/valueObjects/DemoType.js';
import { DemoGenerationService, demoGenerationService } from './services/DemoGenerationService.js';
import { DemoRepository, demoRepository } from './repositories/DemoRepository.js';

export { DemoType, DEMO_TYPES, CODE_GENERATION_PROMPTS };
export { DemoGenerationService, demoGenerationService };
export { DemoRepository, demoRepository };
export default {
  generation: demoGenerationService,
  repository: demoRepository
};
