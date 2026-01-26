/**
 * 性能监控中间件
 */
export default function performanceMonitor(req, res, next) {
  const start = process.hrtime.bigint();
  const startTime = Date.now();

  // 监听响应完成
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // 转换为毫秒
    const endTime = Date.now();

    // 记录性能指标
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress
    };

    // 慢查询警告（超过1秒）
    if (duration > 1000) {
      console.warn(`[SLOW QUERY] ${req.method} ${req.url} took ${duration.toFixed(2)}ms`);
    }

    // 错误请求监控
    if (res.statusCode >= 400) {
      console.error(`[ERROR] ${req.method} ${req.url} - Status: ${res.statusCode}`);
    }

    // 记录到日志（生产环境可发送到日志服务）
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERFORMANCE] ${JSON.stringify(logData)}`);
    }
  });

  next();
}