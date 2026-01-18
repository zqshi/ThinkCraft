/**
 * State Infrastructure Module
 * 统一导出所有状态管理相关的类和实例
 */

// 导出核心类
export { StateStore } from './core/StateStore.js';
export { EventBus, eventBus } from './core/EventBus.js';

// 导出所有State类和实例
export { ConversationState, conversationState } from './stores/ConversationState.js';
export { GenerationState, generationState } from './stores/GenerationState.js';
export { DemoState, demoState } from './stores/DemoState.js';
export { InspirationState, inspirationState } from './stores/InspirationState.js';
export { KnowledgeState, knowledgeState } from './stores/KnowledgeState.js';
export { SettingsState, settingsState } from './stores/SettingsState.js';

// 导出Facade（向后兼容）
export { stateManager } from './StateManager.js';

// 默认导出stateManager实例
export { stateManager as default } from './StateManager.js';
