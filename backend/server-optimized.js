/**
 * ThinkCraft 后端服务主入口 - 优化版
 * Express + DeepSeek API
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 路由导入
import chatRouter from './routes/chat.js';
import reportRouter from './routes/report.js';
import visionRouter from './routes/vision.js';
import businessPlanRouter from './routes/business-plan.js';
import pdfExportRouter from './routes/pdf-export.js';
import shareRouter from './routes/share.js';
import demoGeneratorRouter from './routes/demo-generator.js';
import agentsRouter from './routes/agents.js';
import projectsRouter from './routes/projects.js';
import workflowRouter from './routes/workflow.js';
import workflowRecommendationRouter from './routes/workflow-recommendation.js';
import authRouter from './routes/auth.js';

// 中间件导入
import errorHandler from './middleware/errorHandler.js';
import logger from './middleware/logger.js';
import performanceMonitor from './middleware/performance-monitor.js';
import { generalLimiter, aiApiLimiter, uploadLimiter } from './middleware/rate-limiter.js';
import { securityHeaders, validateInput } from './middleware/security.js';
import { noCache, shortCache, mediumCache } from './middleware/cache-control.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// 基础安全配置
app.use(helmet());
app.use(compression());
app.use(securityHeaders);
app.use(validateInput);

// 性能监控
app.use(performanceMonitor);

// 请求日志
app.use(logger);

// 频率限制
app.use('/api/', generalLimiter);
app.use('/api/chat', aiApiLimiter);
app.use('/api/vision', uploadLimiter);
app.use('/api/demo-generator', uploadLimiter);

// CORS 配置
const isDevelopment = process.env.NODE_ENV === 'development';

if (isDevelopment) {
  // 开发环境：宽松的CORS配置
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin !== 'null') {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
} else {
  // 生产环境：严格的CORS配置
  const allowedOrigins = [
    FRONTEND_URL,
    'https://thinkcraft.ai',
    'https://www.thinkcraft.ai'
  ].filter(Boolean);

  app.use(cors({
    origin: function (origin, callback) {
      if (!origin) {return callback(null, true);}
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`[CORS] 拒绝来源: ${origin}`);
        callback(new Error('不允许的CORS来源'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
  }));
}

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查端点（无缓存）
app.get('/api/health', noCache, (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 指标端点（短时间缓存）
app.get('/api/metrics', shortCache, (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: new Date().toISOString()
  });
});

// API路由
app.use('/api/chat', chatRouter);
app.use('/api/report', reportRouter);
app.use('/api/vision', visionRouter);
app.use('/api/business-plan', businessPlanRouter);
app.use('/api/pdf-export', pdfExportRouter);
app.use('/api/share', shareRouter);
app.use('/api/demo-generator', demoGeneratorRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/workflow', workflowRouter);
app.use('/api/workflow-recommendation', workflowRecommendationRouter);
app.use('/api/auth', authRouter);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    code: -1,
    error: 'API端点不存在',
    path: req.originalUrl
  });
});

// 全局错误处理
app.use(errorHandler);

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在优雅关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在优雅关闭...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', promise, '原因:', reason);
  process.exit(1);
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log('🚀 ThinkCraft 后端服务已启动');
  console.log(`📍 端口: ${PORT}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 前端地址: ${FRONTEND_URL}`);
  console.log(`📊 性能监控: http://localhost:${PORT}/api/metrics`);
  console.log(`🏥 健康检查: http://localhost:${PORT}/api/health`);
});

export default app;