/**
 * ThinkCraft 后端服务主入口
 * Express + DeepSeek API
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { domainLoggers } from './infrastructure/logging/domainLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverLogger = domainLoggers.Server;
import chatRouter from './routes/chat.js';
import conversationRouter from './routes/conversation.js';
import reportRouter from './routes/report.js';
import visionRouter from './routes/vision.js';
import businessPlanRouter from './routes/business-plan.js';
import pdfExportRouter from './routes/pdf-export.js';
import shareRouter from './routes/share.js';
import demoGeneratorRouter from './routes/demo-generator.js';
import agentsRouter from './routes/agents.js';
import collaborationRouter from './routes/collaboration.js';
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

// 2. CORS 跨域配置（开发环境允许所有来源）
const isDevelopment = process.env.NODE_ENV === 'development';

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
    app.use(cors({
        origin: FRONTEND_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }));
}

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

// 对话管理接口（DDD）
app.use('/api/conversations', conversationRouter);

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

// Demo代码生成接口
app.use('/api/demo-generator', demoGeneratorRouter);

// 数字员工Agent接口
app.use('/api/agents', agentsRouter);

// 智能协同编排接口
app.use('/api/collaboration', collaborationRouter);

// 静态文件服务（Demo预览）
app.use('/demos', express.static(path.join(__dirname, 'demos')));

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
    serverLogger.info('ThinkCraft后端服务已启动', {
        port: PORT,
        frontendUrl: FRONTEND_URL,
        env: process.env.NODE_ENV || 'development',
        api: 'DeepSeek Chat',
        endpoints: {
            health: `http://localhost:${PORT}/api/health`,
            chat: `http://localhost:${PORT}/api/chat`,
            conversations: `http://localhost:${PORT}/api/conversations`,
            report: `http://localhost:${PORT}/api/report/generate`,
            businessPlan: `http://localhost:${PORT}/api/business-plan/generate-batch`,
            vision: `http://localhost:${PORT}/api/vision/analyze`,
            pdfExport: `http://localhost:${PORT}/api/pdf-export/report`,
            share: `http://localhost:${PORT}/api/share/create`,
            demo: `http://localhost:${PORT}/api/demo-generator/generate`,
            agents: `http://localhost:${PORT}/api/agents/types`,
            collaboration: `http://localhost:${PORT}/api/collaboration/create`
        }
    });
});

// 优雅关闭
process.on('SIGTERM', () => {
    serverLogger.info('收到SIGTERM信号，正在关闭服务器');
    process.exit(0);
});

process.on('SIGINT', () => {
    serverLogger.info('收到SIGINT信号，正在关闭服务器');
    process.exit(0);
});
