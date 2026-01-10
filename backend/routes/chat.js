/**
 * 对话路由
 * 处理与AI对话相关的请求
 */
import express from 'express';
import { callDeepSeekAPI } from '../config/deepseek.js';

const router = express.Router();

/**
 * POST /api/chat
 * 发送消息获取AI回复
 *
 * 请求体:
 * {
 *   messages: [{ role: 'user', content: '...' }, ...],
 *   systemPrompt: '系统提示词'
 * }
 *
 * 响应:
 * {
 *   code: 0,
 *   data: {
 *     content: 'AI回复内容',
 *     model: 'deepseek-chat',
 *     tokens: { prompt: 100, completion: 200, total: 300 }
 *   }
 * }
 */
router.post('/', async (req, res, next) => {
    try {
        const { messages, systemPrompt } = req.body;

        // 参数校验
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({
                code: -1,
                error: 'messages 参数必须是数组'
            });
        }

        if (messages.length === 0) {
            return res.status(400).json({
                code: -1,
                error: 'messages 数组不能为空'
            });
        }

        // 验证消息格式
        for (const msg of messages) {
            if (!msg.role || !msg.content) {
                return res.status(400).json({
                    code: -1,
                    error: '消息格式错误：每条消息必须包含 role 和 content 字段'
                });
            }
            if (!['user', 'assistant', 'system'].includes(msg.role)) {
                return res.status(400).json({
                    code: -1,
                    error: `无效的消息角色: ${msg.role}`
                });
            }
        }

        console.log(`[Chat] 收到对话请求，消息数: ${messages.length}`);

        // 调用 DeepSeek API
        const response = await callDeepSeekAPI(messages, systemPrompt);

        // 返回成功响应
        res.json({
            code: 0,
            data: {
                content: response.content,
                model: response.model,
                tokens: {
                    prompt: response.usage.prompt_tokens,
                    completion: response.usage.completion_tokens,
                    total: response.usage.total_tokens
                }
            }
        });
    } catch (error) {
        // 传递错误给错误处理中间件
        next(error);
    }
});

export default router;
