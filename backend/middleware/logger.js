import { domainLoggers } from '../infrastructure/logging/domainLogger.js';

const httpLogger = domainLoggers.HTTP;

/**
 * HTTP请求日志中间件
 *
 * 记录所有HTTP请求和响应信息，包括：
 * - 请求方法、URL、IP
 * - 响应状态码
 * - 请求处理时长
 * - 错误状态（4xx/5xx）
 */
export default function logger(req, res, next) {
  const start = Date.now();
  const { method, url, ip } = req;

  // 请求开始日志
  httpLogger.http('请求开始', {
    method,
    url,
    ip,
    userAgent: req.get('user-agent'),
    query: req.query,
    body: method === 'POST' || method === 'PUT' ? req.body : undefined
  });

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;

    // 根据状态码选择日志级别
    const logData = {
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip
    };

    if (statusCode >= 500) {
      // 服务器错误
      httpLogger.error('请求失败（服务器错误）', logData);
    } else if (statusCode >= 400) {
      // 客户端错误
      httpLogger.warn('请求失败（客户端错误）', logData);
    } else {
      // 成功响应
      httpLogger.http('请求完成', logData);
    }
  });

  next();
}
