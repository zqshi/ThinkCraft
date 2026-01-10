/**
 * DeepSeek API 封装
 * 兼容 OpenAI Chat Completions API 格式
 */
import axios from 'axios';
import dotenv from 'dotenv';

// 确保环境变量已加载
dotenv.config();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * 调用 DeepSeek Chat API（非流式）
 * @param {Array} messages - 对话消息数组 [{ role, content }, ...]
 * @param {String} systemPrompt - 系统提示词（可选）
 * @returns {Object} - { content, model, usage }
 */
export async function callDeepSeekAPI(messages, systemPrompt = null) {
    // 验证 API Key
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-your-api-key-here') {
        throw new Error('DEEPSEEK_API_KEY 未配置或无效，请在 .env 文件中设置有效的 API Key');
    }

    // 构建完整的消息列表
    const fullMessages = [];

    // 添加系统提示词
    if (systemPrompt) {
        fullMessages.push({
            role: 'system',
            content: systemPrompt
        });
    }

    // 添加对话历史
    fullMessages.push(...messages);

    try {
        console.log(`[DeepSeek] 调用API，消息数: ${fullMessages.length}`);

        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: 'deepseek-chat',
                messages: fullMessages,
                temperature: 0.7,
                max_tokens: 2000,
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000  // 30秒超时
            }
        );

        const result = response.data;
        const content = result.choices[0].message.content;
        const usage = result.usage;

        console.log(`[DeepSeek] 成功返回，tokens: ${usage.total_tokens}`);

        return {
            content: content,
            model: result.model,
            usage: {
                prompt_tokens: usage.prompt_tokens,
                completion_tokens: usage.completion_tokens,
                total_tokens: usage.total_tokens
            }
        };
    } catch (error) {
        // 详细的错误处理
        if (error.response) {
            // API 返回了错误响应
            const status = error.response.status;
            const data = error.response.data;

            console.error(`[DeepSeek] API错误 ${status}:`, data);

            if (status === 401) {
                throw new Error('DeepSeek API 密钥无效，请检查 .env 文件中的 DEEPSEEK_API_KEY');
            } else if (status === 429) {
                throw new Error('DeepSeek API 调用频率超限，请稍后重试');
            } else if (status === 500) {
                throw new Error('DeepSeek 服务器错误，请稍后重试');
            } else {
                throw new Error(`DeepSeek API 错误: ${data.error?.message || '未知错误'}`);
            }
        } else if (error.code === 'ECONNABORTED') {
            // 请求超时
            console.error('[DeepSeek] 请求超时');
            throw new Error('DeepSeek API 请求超时，请稍后重试');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            // 网络错误
            console.error('[DeepSeek] 网络错误:', error.message);
            throw new Error('无法连接到 DeepSeek API，请检查网络连接');
        } else {
            // 其他错误
            console.error('[DeepSeek] 未知错误:', error.message);
            throw new Error(`DeepSeek API 调用失败: ${error.message}`);
        }
    }
}

/**
 * 流式调用 DeepSeek Chat API（可选，未来扩展）
 * @param {Array} messages - 对话消息数组
 * @param {String} systemPrompt - 系统提示词（可选）
 * @returns {Stream} - 流对象
 */
export async function callDeepSeekAPIStream(messages, systemPrompt = null) {
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-your-api-key-here') {
        throw new Error('DEEPSEEK_API_KEY 未配置');
    }

    const fullMessages = [];
    if (systemPrompt) {
        fullMessages.push({ role: 'system', content: systemPrompt });
    }
    fullMessages.push(...messages);

    try {
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: 'deepseek-chat',
                messages: fullMessages,
                temperature: 0.7,
                max_tokens: 2000,
                stream: true
            },
            {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                responseType: 'stream'
            }
        );

        return response.data;
    } catch (error) {
        console.error('[DeepSeek Stream] 错误:', error.message);
        throw new Error(`流式 API 调用失败: ${error.message}`);
    }
}
