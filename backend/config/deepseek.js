/**
 * DeepSeek API 封装（兼容旧路径，转发到基础设施层）
 */
export {
  callDeepSeekAPI,
  callDeepSeekAPIStream,
  getCostStats,
  resetCostStats
} from '../src/infrastructure/ai/deepseek-client.js';
