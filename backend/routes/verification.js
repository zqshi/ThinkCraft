/**
 * 验证码路由
 * 处理手机验证码的发送和验证
 */
import express from 'express';
import { PhoneVerificationUseCase } from '../src/features/auth/application/phone-verification.use-case.js';
import { getRepository } from '../src/shared/infrastructure/repository.factory.js';
import { logger } from '../middleware/logger.js';
import { ok, fail } from '../middleware/response.js';
import { smsLimiter } from '../middleware/rate-limiter.js';

const router = express.Router();

/**
 * POST /api/verification/send
 * 发送验证码
 */
router.post('/send', smsLimiter, async (req, res) => {
  try {
    const { phone, type = 'register' } = req.body;

    // 参数验证
    if (!phone) {
      return fail(res, '手机号不能为空', 400);
    }

    // 验证类型检查
    const validTypes = ['register', 'login', 'reset', 'bind'];
    if (!validTypes.includes(type)) {
      return fail(res, '无效的验证类型', 400);
    }

    // 获取用户仓库
    const userRepository = getRepository('user');

    // 创建用例并执行
    const useCase = new PhoneVerificationUseCase(userRepository);
    const result = await useCase.sendVerificationCode(phone, type);

    if (process.env.NODE_ENV !== 'production') {
      const { cacheService } = await import('../src/infrastructure/cache/redis-cache.service.js');
      const codeKey = `sms:code:${phone}:${type}`;
      const code = await cacheService.get(codeKey);
      if (code) {
        result.code = code;
      }
    }

    ok(res, result);
  } catch (error) {
    logger.error('发送验证码失败', { error: error.message });
    fail(res, error.message, 400);
  }
});

/**
 * POST /api/verification/verify
 * 验证验证码
 */
router.post('/verify', async (req, res) => {
  try {
    const { phone, code, type = 'register' } = req.body;

    // 参数验证
    if (!phone) {
      return fail(res, '手机号不能为空', 400);
    }

    if (!code) {
      return fail(res, '验证码不能为空', 400);
    }

    // 获取用户仓库
    const userRepository = getRepository('user');

    // 创建用例并执行
    const useCase = new PhoneVerificationUseCase(userRepository);
    const result = await useCase.verifyCode(phone, code, type);

    ok(res, result);
  } catch (error) {
    logger.error('验证验证码失败', { error: error.message });
    fail(res, error.message, 400);
  }
});

export default router;
