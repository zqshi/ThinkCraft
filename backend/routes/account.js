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
 * PUT /api/account/username
 * 修改用户名
 */
router.put('/username', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: '用户名不能为空'
      });
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.changeUsername(userId, username);

    res.json(result);
  } catch (error) {
    logger.error('修改用户名失败', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/account/email
 * 修改邮箱
 */
router.put('/email', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: '邮箱不能为空'
      });
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.changeEmail(userId, email);

    res.json(result);
  } catch (error) {
    logger.error('修改邮箱失败', { error: error.message });
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
 * PUT /api/account/password
 * 修改密码
 */
router.put('/password', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword) {
      return res.status(400).json({
        success: false,
        message: '旧密码不能为空'
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: '新密码不能为空'
      });
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.changePassword(userId, oldPassword, newPassword);

    res.json(result);
  } catch (error) {
    logger.error('修改密码失败', { error: error.message });
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
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: '请输入密码确认'
      });
    }

    const userRepository = getRepository('user');
    const useCase = new AccountManagementUseCase(userRepository);
    const result = await useCase.deleteAccount(userId, password);

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
