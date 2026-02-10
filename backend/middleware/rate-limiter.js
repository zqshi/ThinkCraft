/**
 * 请求频率限制中间件
 */
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// 通用频率限制
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    code: -1,
    error: '请求过于频繁，请稍后再试'
  },
  skip: () => process.env.NODE_ENV === 'development',
  standardHeaders: true,
  legacyHeaders: false
});

// 严格频率限制（用于敏感操作）
export const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 10, // 限制每个IP 5分钟内最多10个请求
  message: {
    code: -1,
    error: '操作过于频繁，请5分钟后再试'
  }
});

// AI API频率限制
export const aiApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 30, // 限制每个IP 1分钟内最多30个AI请求
  message: {
    code: -1,
    error: 'AI请求过于频繁，请稍后再试'
  },
  skip: req => {
    // 开发环境不限制
    return process.env.NODE_ENV === 'development';
  }
});

// 文件上传频率限制
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 20, // 限制每个IP 1小时内最多20个上传请求
  message: {
    code: -1,
    error: '上传过于频繁，请稍后再试'
  }
});

// 短信验证码限流（IP + 手机号维度）
export const smsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10分钟
  max: 5, // 每10分钟最多5次
  message: {
    code: -1,
    error: '验证码请求过于频繁，请稍后再试'
  },
  keyGenerator: req => {
    const phone = req.body?.phone || req.query?.phone || '';
    const ip = ipKeyGenerator(req);
    return `${ip}:${phone}`;
  },
  skip: () => process.env.NODE_ENV === 'development',
  standardHeaders: true,
  legacyHeaders: false
});
