/**
 * 安全中间件
 */

// 安全响应头
export const securityHeaders = (req, res, next) => {
  // 基本安全头
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none'
  });

  // 如果是API响应，添加额外的安全头
  if (req.path.startsWith('/api/')) {
    res.set({
      'Content-Security-Policy': 'default-src \'self\'',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    });
  }

  next();
};

// 输入验证中间件
export const validateInput = (req, res, next) => {
  // 移除请求头中的潜在危险字符
  const sanitizeHeader = (value) => {
    if (typeof value === 'string') {
      return value.replace(/[<>\"'&]/g, '');
    }
    return value;
  };

  // 清理请求头
  Object.keys(req.headers).forEach(key => {
    req.headers[key] = sanitizeHeader(req.headers[key]);
  });

  // 清理查询参数
  Object.keys(req.query).forEach(key => {
    if (typeof req.query[key] === 'string') {
      req.query[key] = req.query[key].replace(/[<>\"'&]/g, '');
    }
  });

  next();
};

// API密钥验证
export const validateApiKey = (req, res, next) => {
  // 从请求头获取API密钥
  const apiKey = req.headers['x-api-key'];

  // 开发环境跳过验证
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  // 检查API密钥是否存在
  if (!apiKey) {
    return res.status(401).json({
      code: -1,
      error: '缺少API密钥'
    });
  }

  // 验证API密钥（这里应该查询数据库）
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];

  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      code: -1,
      error: '无效的API密钥'
    });
  }

  next();
};

// 请求大小限制
export const requestSizeLimit = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');

    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        code: -1,
        error: '请求体过大'
      });
    }

    next();
  };
};