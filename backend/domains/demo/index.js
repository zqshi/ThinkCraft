/**
 * Demo领域模块统一导出
 */

import { DemoType, DEMO_TYPES, CODE_GENERATION_PROMPTS } from './models/valueObjects/DemoType.js';
import { DemoGenerationService, demoGenerationService } from './services/DemoGenerationService.js';

export { DemoType, DEMO_TYPES, CODE_GENERATION_PROMPTS };
export { DemoGenerationService, demoGenerationService };
export default { demoGenerationService };
