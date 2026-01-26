/**
 * 请求日志中间件和日志工具
 * 记录所有HTTP请求的基本信息和应用日志
 */

// 日志工具对象
export const logger = {
  info: (message, meta = {}) => {
    console.log(`[${new Date().toISOString()}] INFO - ${message}`, meta);
  },
  error: (message, meta = {}) => {
    console.error(`[${new Date().toISOString()}] ERROR - ${message}`, meta);
  },
  warn: (message, meta = {}) => {
    console.warn(`[${new Date().toISOString()}] WARN - ${message}`, meta);
  },
  debug: (message, meta = {}) => {
    console.log(`[${new Date().toISOString()}] DEBUG - ${message}`, meta);
  }
};

// HTTP请求日志中间件
export default function loggerMiddleware(req, res, next) {
  const start = Date.now();
  const { method, url, ip } = req;

  // 请求开始日志
  console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip}`);

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const level = statusCode >= 400 ? 'ERROR' : 'INFO';

    console.log(
      `[${new Date().toISOString()}] ${level} - ${method} ${url} ${statusCode} - ${duration}ms`
    );
  });

  next();
}
