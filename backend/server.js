/**
 * ThinkCraft 后端服务主入口
 * Express + DeepSeek API
 */
import './config/env-loader.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import errorHandler from './middleware/errorHandler.js';
import logger from './middleware/logger.js';
import performanceMonitor from './middleware/performance-monitor.js';
import { generalLimiter, aiApiLimiter, uploadLimiter } from './middleware/rate-limiter.js';
import { securityHeaders, validateInput } from './middleware/security.js';
import { noCache, shortCache } from './middleware/cache-control.js';
import { initDatabases, closeDatabases } from './config/database.js';
import { cacheService } from './src/infrastructure/cache/redis-cache.service.js';
import promptLoader from './src/utils/prompt-loader.js';
import { validateEnv } from './config/env.js';
import {
  runGenerationCleanup,
  startGenerationCleanup,
  stopGenerationCleanup
} from './src/maintenance/generation-cleanup.js';

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const isDevelopment = process.env.NODE_ENV === 'development';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let isReady = false;
let routesMounted = false;

// 中间件配置
app.set('trust proxy', 1);

// 1. 请求日志
app.use(logger);

// 2. 安全与性能
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: isDevelopment
          ? ["'self'", 'http://localhost:3000', 'http://127.0.0.1:3000']
          : ["'self'", FRONTEND_URL],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: null
      }
    }
  })
);
app.use(compression());
app.use(securityHeaders);
app.use(validateInput);

// 3. 性能监控
app.use(performanceMonitor);

// 4. CORS 跨域配置（开发环境允许所有来源）
if (isDevelopment) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && origin !== 'null') {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });
} else {
  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );
}

// 5. JSON 解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态资源（本地开发直接由后端提供前端页面/资源）
app.use(express.static(PROJECT_ROOT));

// 6. 频率限制
app.use('/api/', generalLimiter);
app.use('/api/chat', aiApiLimiter);
app.use('/api/vision', uploadLimiter);

// 健康检查端点（用于Docker健康检查）
app.get('/health', noCache, (req, res) => {
  res.status(200).send('OK');
});

// 健康检查端点（详细信息）
app.get('/api/health', noCache, (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ThinkCraft Backend',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    dbType: process.env.DB_TYPE || 'memory',
    ready: isReady
  });
});

// 就绪检查
app.get('/ready', noCache, (req, res) => {
  if (!isReady) {
    return res.status(503).json({ status: 'not_ready' });
  }
  return res.json({ status: 'ready' });
});

async function mountRoutes() {
  if (routesMounted) {
    return;
  }

  const [
    { default: chatRouter },
    { default: reportRouter },
    { default: visionRouter },
    { default: businessPlanRouter },
    { default: pdfExportRouter },
    { default: shareRouter },
    { default: agentsRouter },
    { default: projectsRouter },
    { default: workflowRouter },
    { default: authRouter },
    { default: verificationRouter },
    { default: accountRouter },
    { default: promptRouter },
    { authMiddleware }
  ] = await Promise.all([
    import('./routes/chat.js'),
    import('./routes/report.js'),
    import('./routes/vision.js'),
    import('./routes/business-plan.js'),
    import('./routes/pdf-export.js'),
    import('./routes/share.js'),
    import('./routes/agents.js'),
    import('./routes/projects.js'),
    import('./routes/workflow.js'),
    import('./routes/auth.js'),
    import('./routes/verification.js'),
    import('./routes/account.js'),
    import('./src/interfaces/prompt-routes.js'),
    import('./src/features/auth/interfaces/auth.middleware.js')
  ]);

  // 公开接口
  app.use('/api/auth', authRouter);
  app.use('/api/verification', verificationRouter);
  app.use('/api/prompts', promptRouter);

  // API 认证保护（除公开接口外）
  app.use('/api', (req, res, next) => {
    const publicPrefixes = ['/auth', '/verification', '/health', '/prompts'];

    if (isDevelopment) {
      publicPrefixes.push('/business-plan');
    }

    if (publicPrefixes.some(prefix => req.path.startsWith(prefix))) {
      return next();
    }
    return authMiddleware(req, res, next);
  });

  // 指标端点（短时间缓存，需认证）
  app.get('/api/metrics', shortCache, (req, res) => {
    res.json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      timestamp: new Date().toISOString()
    });
  });

  // 业务路由
  app.use('/api/chat', chatRouter);
  app.use('/api/report', reportRouter);
  app.use('/api/business-plan', businessPlanRouter);
  app.use('/api/vision', visionRouter);
  app.use('/api/pdf-export', pdfExportRouter);
  app.use('/api/share', shareRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/workflow', workflowRouter);
  app.use('/api/account', accountRouter);

  // 404 处理
  app.use((req, res) => {
    res.status(404).json({
      code: -1,
      error: `路由未找到: ${req.method} ${req.url}`
    });
  });

  // 统一错误处理（必须放在最后）
  app.use(errorHandler);

  routesMounted = true;
}

async function initDatabasesWithRetryAndFallback() {
  const dbType = (process.env.DB_TYPE || 'memory').toLowerCase();
  const isProd = process.env.NODE_ENV === 'production';

  if (dbType !== 'mongodb') {
    await initDatabases();
    return;
  }

  const maxRetries = toPositiveInt(process.env.MONGODB_CONNECT_RETRIES, 5);
  const retryDelayMs = toPositiveInt(process.env.MONGODB_CONNECT_RETRY_DELAY_MS, 1500);
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Server] MongoDB 连接尝试 ${attempt}/${maxRetries}`);
      await initDatabases();
      return;
    } catch (error) {
      lastError = error;
      console.warn(`[Server] MongoDB 初始化失败（第 ${attempt} 次）: ${error.message}`);

      if (attempt < maxRetries) {
        await sleep(retryDelayMs * attempt);
      }
    }
  }

  if (isProd) {
    throw lastError;
  }

  // 开发环境降级为内存，避免服务直接退出导致前端频繁 connection refused
  console.warn('[Server] MongoDB 多次连接失败，开发环境将降级为内存存储继续启动');
  process.env.DB_TYPE = 'memory';
  await initDatabases();
}

/**
 * 启动服务器
 */
async function startServer() {
  try {
    validateEnv();

    console.log('[Server] 正在初始化数据库...');
    await initDatabasesWithRetryAndFallback();

    // 启动生成任务兜底修复（仅MongoDB）
    await runGenerationCleanup();
    startGenerationCleanup();

    console.log('[Server] 正在初始化缓存服务...');
    try {
      await cacheService.init();
    } catch (error) {
      console.warn(`[Server] 缓存服务初始化失败，继续无缓存模式运行: ${error.message}`);
    }

    console.log('[Server] 正在加载Prompt模板...');
    await promptLoader.initialize();

    await mountRoutes();

    isReady = true;

    app.listen(PORT, HOST, () => {
      console.log('========================================');
      console.log('  ThinkCraft 后端服务已启动');
      console.log(`  地址: http://${HOST}:${PORT}`);
      console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  存储类型: ${process.env.DB_TYPE || 'memory'}`);
      console.log(`  前端地址: ${FRONTEND_URL}`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('[Server] 启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
async function gracefulShutdown(signal) {
  console.log(`\n[Server] 收到 ${signal} 信号，正在关闭服务器...`);

  try {
    stopGenerationCleanup();

    await closeDatabases();
    console.log('[Server] 数据库连接已关闭');

    console.log('[Server] 服务器已安全关闭');
    process.exit(0);
  } catch (error) {
    console.error('[Server] 关闭过程出错:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 启动服务器（测试环境不自动启动）
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer, mountRoutes };
