/**
 * 过渡文件：storage-manager.js
 *
 * ⚠️  此文件已弃用 (Deprecated)
 *
 * 原 StorageManager 已重构为基于 Repository 模式的新架构。
 * 此文件仅为保持向后兼容而存在，会重新导出新实现。
 *
 * 请更新导入路径：
 * 旧: import { storageManager } from './core/storage-manager.js';
 * 新: import { storageManager } from './infrastructure/storage/index.js';
 *
 * 新架构优势：
 * - 职责单一：每个 Repository 管理一个存储
 * - 易于测试：可独立测试各个 Repository
 * - 易于扩展：新增存储只需添加新的 Repository
 *
 * 重构日期：2026-01-13
 */

console.warn(
  '[Deprecated] frontend/js/core/storage-manager.js 已弃用。' +
  '请使用 infrastructure/storage/index.js 代替。'
);

// 重新导出新实现（保持100%向后兼容）
export { storageManager } from '../infrastructure/storage/index.js';
export { storageManager as default } from '../infrastructure/storage/index.js';
