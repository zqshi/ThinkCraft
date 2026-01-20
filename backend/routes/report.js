import express from 'express';
import { callDeepSeekAPI } from '../config/deepseek.js';
import { REPORT_GENERATION_PROMPT } from '../../config/report-prompts.js';

const router = express.Router();

router.post('/generate', async (req, res, next) => {
    try {
        const { messages } = req.body;

        // 参数验证
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({
                code: -1,
                error: '必须提供有效的对话历史'
            });
        }

        // 构建用于报告生成的消息
        const conversationSummary = messages
            .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
            .join('\n\n');

        const reportMessages = [
            {
                role: 'user',
                content: `${REPORT_GENERATION_PROMPT}\n\n=== 对话历史 ===\n${conversationSummary}`
            }
        ];

        // 调用DeepSeek API生成报告
        const response = await callDeepSeekAPI(reportMessages, null);

        // 解析JSON响应
        let reportData;
        try {
            // 尝试提取JSON（AI可能会在JSON前后添加说明文字）
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                reportData = JSON.parse(jsonMatch[0]);
            } else {
                reportData = JSON.parse(response.content);
            }
        } catch (parseError) {
            console.error('JSON解析失败:', response.content);
            return res.status(500).json({
                code: -1,
                error: 'AI返回的报告格式无效',
                rawResponse: response.content
            });
        }

        res.json({
            code: 0,
            data: {
                report: reportData,
                tokens: {
                    prompt: response.usage.prompt_tokens,
                    completion: response.usage.completion_tokens,
                    total: response.usage.total_tokens
                }
            }
        });

    } catch (error) {
        next(error);
    }
});

export default router;
