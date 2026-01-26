/**
 * 缓存控制中间件
 */

// 不缓存的响应
export const noCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  next();
};

// 短时间缓存（1分钟）
export const shortCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'public, max-age=60', // 1分钟
    'ETag': `"${Date.now()}"`
  });
  next();
};

// 中等时间缓存（5分钟）
export const mediumCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'public, max-age=300', // 5分钟
    'ETag': `"${Date.now()}"`
  });
  next();
};

// 长时间缓存（1小时）
export const longCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'public, max-age=3600', // 1小时
    'ETag': `"${Date.now()}"`
  });
  next();
};

// 静态资源缓存（1天）
export const staticCache = (req, res, next) => {
  res.set({
    'Cache-Control': 'public, max-age=86400', // 1天
    'ETag': `"${Date.now()}"`
  });
  next();
};