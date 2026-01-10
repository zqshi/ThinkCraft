/**
 * ThinkCraft 后端服务主入口
 * Express + DeepSeek API
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat.js';
import reportRouter from './routes/report.js';
import visionRouter from './routes/vision.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './middleware/logger.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// 中间件配置
// 1. 请求日志
app.use(logger);

// 2. CORS 跨域配置
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 3. JSON 解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 路由配置
// 健康检查端点
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'ThinkCraft Backend',
        version: '1.0.0'
    });
});

// 对话接口
app.use('/api/chat', chatRouter);

// 报告生成接口
app.use('/api/report', reportRouter);

// 视觉分析接口
app.use('/api/vision', visionRouter);

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        code: -1,
        error: `路由未找到: ${req.method} ${req.url}`
    });
});

// 统一错误处理（必须放在最后）
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 ThinkCraft 后端服务已启动`);
    console.log(`📍 监听端口: ${PORT}`);
    console.log(`🌐 前端地址: ${FRONTEND_URL}`);
    console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 API: DeepSeek Chat`);
    console.log('='.repeat(50));
    console.log(`\n健康检查: http://localhost:${PORT}/api/health`);
    console.log(`对话接口:   http://localhost:${PORT}/api/chat`);
    console.log(`报告生成:   http://localhost:${PORT}/api/report/generate`);
    console.log(`视觉分析:   http://localhost:${PORT}/api/vision/analyze\n`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('\n收到 SIGTERM 信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n收到 SIGINT 信号，正在关闭服务器...');
    process.exit(0);
});
