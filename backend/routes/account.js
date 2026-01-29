/**
 * 账号管理路由
 * 处理账号管理相关的HTTP请求
 */
import express from 'express';
import { AccountManagementUseCase } from '../src/features/auth/application/account-management.use-case.js';
import { getRepository } from '../src/shared/infrastructure/repository.factory.js';
import { authMiddleware } from '../src/features/auth/interfaces/auth.middleware.js';
import { logger } from '../middleware/logger.js';

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

    res.json(result);
  } catch (error) {
    logger.error('获取用户信息失败', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
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
      return res.status(400).json({
        success: false,
        message: '手机号不能为空'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '验证码不能为空'
      });
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.bindPhone(userId, phone, code);

    res.json(result);
  } catch (error) {
    logger.error('绑定手机号失败', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
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
      return res.status(400).json({
        success: false,
        message: '手机号不能为空'
      });
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '验证码不能为空'
      });
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.changePhone(userId, phone, code);

    res.json(result);
  } catch (error) {
    logger.error('更换手机号失败', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
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

    res.json(result);
  } catch (error) {
    logger.error('获取登录历史失败', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
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

    res.json(result);
  } catch (error) {
    logger.error('更新偏好设置失败', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
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
      return res.status(400).json({
        success: false,
        message: '请输入验证码确认'
      });
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.deleteAccount(userId, code);

    res.json(result);
  } catch (error) {
    logger.error('注销账号失败', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
