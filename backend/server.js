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

import chatRouter from './routes/chat.js';
import reportRouter from './routes/report.js';
import visionRouter from './routes/vision.js';
import businessPlanRouter from './routes/business-plan.js';
import pdfExportRouter from './routes/pdf-export.js';
import shareRouter from './routes/share.js';
import agentsRouter from './routes/agents.js';
import projectsRouter from './routes/projects.js';
import workflowRouter from './routes/workflow.js';
import authRouter from './routes/auth.js';
import verificationRouter from './routes/verification.js';
import accountRouter from './routes/account.js';
import promptRouter from './src/interfaces/prompt-routes.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './middleware/logger.js';
import performanceMonitor from './middleware/performance-monitor.js';
import { generalLimiter, aiApiLimiter, uploadLimiter } from './middleware/rate-limiter.js';
import { securityHeaders, validateInput } from './middleware/security.js';
import { noCache, shortCache } from './middleware/cache-control.js';
import { authMiddleware } from './src/features/auth/interfaces/auth.middleware.js';
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
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const isDevelopment = process.env.NODE_ENV === 'development';

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

// 2. CORS 跨域配置（开发环境允许所有来源）
if (isDevelopment) {
  // 开发环境：宽松的CORS配置（包括file://协议）
  app.use((req, res, next) => {
    const origin = req.headers.origin;

    // 设置允许的源
    if (origin && origin !== 'null') {
      // 有明确的origin（http/https协议）
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      // 无origin或origin是null（file://协议）
      res.header('Access-Control-Allow-Origin', '*');
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  });
} else {
  // 生产环境：严格的CORS配置
  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );
}

// 3. JSON 解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态资源（本地开发直接由后端提供前端页面/资源）
app.use(express.static(PROJECT_ROOT));

// 4. 频率限制
app.use('/api/', generalLimiter);
app.use('/api/chat', aiApiLimiter);
app.use('/api/vision', uploadLimiter);

// 路由配置
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
    uptime: process.uptime()
  });
});

// 就绪检查
let isReady = false;
app.get('/ready', noCache, (req, res) => {
  if (!isReady) {
    return res.status(503).json({ status: 'not_ready' });
  }
  res.json({ status: 'ready' });
});

// 认证接口（公开）
app.use('/api/auth', authRouter);

// 验证码接口（公开）
app.use('/api/verification', verificationRouter);

// 提示词管理接口（公开）
app.use('/api/prompts', promptRouter);

// API 认证保护（除公开接口外）
app.use('/api', (req, res, next) => {
  const publicPrefixes = ['/auth', '/verification', '/health', '/prompts'];

  // 开发环境：商业计划书接口也公开（方便测试）
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

// 对话接口
app.use('/api/chat', chatRouter);

// 报告生成接口
app.use('/api/report', reportRouter);

// 商业计划书生成接口
app.use('/api/business-plan', businessPlanRouter);

// 视觉分析接口
app.use('/api/vision', visionRouter);

// PDF导出接口
app.use('/api/pdf-export', pdfExportRouter);

// 分享链接接口
app.use('/api/share', shareRouter);

// 数字员工Agent接口
app.use('/api/agents', agentsRouter);

// 项目管理接口
app.use('/api/projects', projectsRouter);

// 工作流执行接口
app.use('/api/workflow', workflowRouter);

// 工作流推荐接口

// 账号管理接口
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

/**
 * 启动服务器
 */
async function startServer() {
  try {
    validateEnv();

    // 初始化数据库连接
    console.log('[Server] 正在初始化数据库...');
    await initDatabases();

    // 启动生成任务兜底修复（仅MongoDB）
    await runGenerationCleanup();
    startGenerationCleanup();

    // 初始化缓存服务
    console.log('[Server] 正在初始化缓存服务...');
    await cacheService.init();

    // 初始化Prompt加载器
    console.log('[Server] 正在加载Prompt模板...');
    await promptLoader.initialize();

    isReady = true;

    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`  ThinkCraft 后端服务已启动`);
      console.log(`  端口: ${PORT}`);
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

    // 关闭数据库连接
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

export { app, startServer };
