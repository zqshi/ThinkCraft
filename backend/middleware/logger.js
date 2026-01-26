/**
 * 请求日志中间件
 * 记录所有HTTP请求的基本信息
 */
export default function logger(req, res, next) {
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
