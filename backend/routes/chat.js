/**
 * 对话路由
 * 处理与AI对话相关的请求
 */
import express from 'express';
import { chatUseCases } from '../application/index.js';

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

        const result = await chatUseCases.sendMessage({ messages, systemPrompt });

        if (!result.success) {
            return res.status(400).json({
                code: -1,
                error: result.error
            });
        }

        res.json({
            code: 0,
            data: {
                content: result.data.content,
                model: result.data.model,
                tokens: {
                    prompt: result.data.usage.prompt_tokens,
                    completion: result.data.usage.completion_tokens,
                    total: result.data.usage.total_tokens
                }
            }
        });
    } catch (error) {
        // 传递错误给错误处理中间件
        next(error);
    }
});

export default router;
