/**
 * 认证路由
 * 提供完整的认证API
 */
import express from 'express';
import { authController } from './auth.controller.js';
import { authMiddleware, optionalAuthMiddleware } from './auth.middleware.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * 用户登录
 * 请求体: { phone: string, code: string }
 * 响应: { code: number, message: string, data: { accessToken: string, refreshToken: string, user: object } }
 */
router.post('/login', (req, res) => authController.login(req, res));

/**
 * POST /api/auth/register
 * 用户注册
 * 请求体: { phone: string, code: string }
 * 响应: { code: number, message: string, data: { accessToken: string, refreshToken: string, user: object } }
 */
router.post('/register', (req, res) => authController.register(req, res));

/**
 * POST /api/auth/refresh-token
 * 刷新访问令牌
 * 请求体: { refreshToken: string }
 * 响应: { code: number, message: string, data: { accessToken: string, user: object } }
 */
router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));

/**
 * GET /api/auth/me
 * 获取当前用户信息（需要认证）
 * 响应: { code: number, message: string, data: { id: string, phone: string, status: string, ... } }
 */
router.get('/me', authMiddleware, authController.getCurrentUser);

/**
 * POST /api/auth/logout
 * 用户登出（需要认证）
 * 响应: { code: number, message: string, data: { success: boolean } }
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * GET /api/auth/validate
 * 验证访问令牌
 * 响应: { code: number, message: string, data: { userId: string, phone: string } }
 */
router.get('/validate', authController.validateToken);

/**
 * 健康检查端点
 */
router.get('/health', (req, res) => {
  res.json({
    code: 0,
    message: 'Auth服务正常运行',
    data: {
      service: 'auth',
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
});

export default router;
