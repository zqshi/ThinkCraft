/**
 * Demo领域模块统一导出
 */

export { DemoType, DEMO_TYPES, CODE_GENERATION_PROMPTS } from './models/valueObjects/DemoType.js';
export { DemoGenerationService, demoGenerationService } from './services/DemoGenerationService.js';

export default { demoGenerationService };
