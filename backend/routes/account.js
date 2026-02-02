/**
 * 账号管理路由
 * 处理账号管理相关的HTTP请求
 */
import express from 'express';
import { AccountManagementUseCase } from '../src/features/auth/application/account-management.use-case.js';
import { getRepository } from '../src/shared/infrastructure/repository.factory.js';
import { authMiddleware } from '../src/features/auth/interfaces/auth.middleware.js';
import { logger } from '../middleware/logger.js';
import { ok, fail } from '../middleware/response.js';

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware);

/**
 * GET /api/account/info
 * 获取用户信息
 */
router.get('/info', async (req, res) => {
  try {
    const userId = req.user.userId;

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.getUserInfo(userId);

    ok(res, result);
  } catch (error) {
    logger.error('获取用户信息失败', { error: error.message });
    fail(res, error.message, 400);
  }
});

/**
 * POST /api/account/bind-phone
 * 绑定手机号
 */
router.post('/bind-phone', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { phone, code } = req.body;

    if (!phone) {
      return fail(res, '手机号不能为空', 400);
    }

    if (!code) {
      return fail(res, '验证码不能为空', 400);
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.bindPhone(userId, phone, code);

    ok(res, result);
  } catch (error) {
    logger.error('绑定手机号失败', { error: error.message });
    fail(res, error.message, 400);
  }
});

/**
 * PUT /api/account/phone
 * 更换手机号
 */
router.put('/phone', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { phone, code } = req.body;

    if (!phone) {
      return fail(res, '手机号不能为空', 400);
    }

    if (!code) {
      return fail(res, '验证码不能为空', 400);
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.changePhone(userId, phone, code);

    ok(res, result);
  } catch (error) {
    logger.error('更换手机号失败', { error: error.message });
    fail(res, error.message, 400);
  }
});

/**
 * GET /api/account/login-history
 * 获取登录历史
 */
router.get('/login-history', async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 10;

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.getLoginHistory(userId, limit);

    ok(res, result);
  } catch (error) {
    logger.error('获取登录历史失败', { error: error.message });
    fail(res, error.message, 400);
  }
});

/**
 * PUT /api/account/preferences
 * 更新偏好设置
 */
router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user.userId;
    const preferences = req.body;

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.updatePreferences(userId, preferences);

    ok(res, result);
  } catch (error) {
    logger.error('更新偏好设置失败', { error: error.message });
    fail(res, error.message, 400);
  }
});

/**
 * DELETE /api/account
 * 注销账号
 */
router.delete('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { code } = req.body;

    if (!code) {
      return fail(res, '请输入验证码确认', 400);
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.deleteAccount(userId, code);

    ok(res, result);
  } catch (error) {
    logger.error('注销账号失败', { error: error.message });
    fail(res, error.message, 400);
  }
});

export default router;
