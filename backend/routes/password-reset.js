/**
 * 密码重置路由
 * 处理密码重置相关的HTTP请求
 */
import express from 'express';
import { PasswordResetUseCase } from '../src/features/auth/application/password-reset.use-case.js';
import { getRepository } from '../src/shared/infrastructure/repository.factory.js';
import { logger } from '../middleware/logger.js';

const router = express.Router();

/**
 * POST /api/password-reset/send-code
 * 发送密码重置验证码
 */
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    // 参数验证
    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号不能为空'
      });
    }

    // 获取用户仓库
    const userRepository = getRepository('user');

    // 创建用例并执行
    const useCase = new PasswordResetUseCase(userRepository);
    const result = await useCase.sendResetCode(phone);

    res.json(result);
  } catch (error) {
    logger.error('发送密码重置验证码失败', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/password-reset/reset
 * 重置密码
 */
router.post('/reset', async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;

    // 参数验证
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

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: '新密码不能为空'
      });
    }

    // 获取用户仓库
    const userRepository = getRepository('user');

    // 创建用例并执行
    const useCase = new PasswordResetUseCase(userRepository);
    const result = await useCase.resetPassword(phone, code, newPassword);

    res.json(result);
  } catch (error) {
    logger.error('密码重置失败', { error: error.message });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
