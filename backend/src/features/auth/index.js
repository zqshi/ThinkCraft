/**
 * Auth功能模块导出
 */
export * from './domain/index.js';
export * from './application/index.js';
export * from './infrastructure/index.js';
export { default as authRoutes } from './interfaces/auth-routes.js';
export { authMiddleware, optionalAuthMiddleware } from './interfaces/auth.middleware.js';
