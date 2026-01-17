/**
 * 过渡文件：state-manager.js
 *
 * ⚠️  此文件已弃用 (Deprecated)
 *
 * 原 StateManager 已重构为基于 StateStore 模式的新架构。
 * 此文件仅为保持向后兼容而存在，会重新导出新实现。
 *
 * 请更新导入路径：
 * 旧: import { stateManager } from './core/state-manager.js';
 * 新: import { stateManager } from './infrastructure/state/index.js';
 *
 * 新架构优势：
 * - 职责单一：每个 State 管理一个领域状态
 * - 易于测试：可独立测试各个 State
 * - 易于扩展：新增状态只需添加新的 State类
 * - 观察者模式：更灵活的状态订阅机制
 *
 * 重构日期：2026-01-13
 */

console.warn(
  '[Deprecated] frontend/js/core/state-manager.js 已弃用。' +
  '请使用 infrastructure/state/index.js 代替。'
);

// 重新导出新实现（保持100%向后兼容）
export { stateManager } from '../infrastructure/state/index.js';
export { stateManager as default } from '../infrastructure/state/index.js';
