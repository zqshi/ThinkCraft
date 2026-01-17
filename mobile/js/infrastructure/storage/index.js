/**
 * Storage Infrastructure Module
 * 统一导出所有存储相关的类和实例
 */

// 导出核心类
export { IndexedDBClient, dbClient } from './core/IndexedDBClient.js';
export { BaseRepository } from './core/BaseRepository.js';

// 导出所有Repository
export { ChatRepository } from './repositories/ChatRepository.js';
export { ReportRepository } from './repositories/ReportRepository.js';
export { DemoRepository } from './repositories/DemoRepository.js';
export { InspirationRepository } from './repositories/InspirationRepository.js';
export { KnowledgeRepository } from './repositories/KnowledgeRepository.js';
export { SettingsRepository } from './repositories/SettingsRepository.js';

// 导出Facade（向后兼容）
export { storageManager } from './StorageManager.js';

// 默认导出storageManager实例
export { storageManager as default } from './StorageManager.js';
