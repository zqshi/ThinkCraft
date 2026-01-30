/**
 * DeepSeek API client (infrastructure layer)
 * 兼容 OpenAI Chat Completions API 格式
 * 包含重试、并发控制与成本统计
 */
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../.env');
dotenv.config({ path: envPath });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

let totalTokensUsed = 0;
let totalCost = 0; // DeepSeek定价：约 ¥0.001/1K tokens

const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callDeepSeekAPI(messages, systemPrompt = null, options = {}) {
    const {
        max_tokens = 2000,
        temperature = 0.7,
        retry = 3,
        retryDelay = 1000,
        timeout = 30000,
        response_format,
        model = 'deepseek-chat'
    } = options;

    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-your-api-key-here') {
        throw new Error('DEEPSEEK_API_KEY 未配置或无效，请在 .env 文件中设置有效的 API Key');
    }

    const fullMessages = [];
    if (systemPrompt) {
        fullMessages.push({
            role: 'system',
            content: systemPrompt
        });
    }
    fullMessages.push(...messages);

    for (let attempt = 0; attempt < retry; attempt++) {
        try {
            while (activeRequests >= MAX_CONCURRENT_REQUESTS) {
                await sleep(100);
            }
            activeRequests++;

            const payload = {
                model,
                messages: fullMessages,
                temperature,
                max_tokens,
                stream: false
            };

            if (response_format) {
                payload.response_format = response_format;
            }

            const response = await axios.post(DEEPSEEK_API_URL, payload, {
                headers: {
                    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout
            });

            activeRequests--;

            const result = response.data;
            const content = result.choices[0].message.content;
            const usage = result.usage;

            totalTokensUsed += usage.total_tokens;
            totalCost = (totalTokensUsed / 1000) * 0.001;

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
            activeRequests--;

            if (attempt === retry - 1) {
                if (error.response) {
                    const status = error.response.status;
                    const data = error.response.data;

                    console.error(`[DeepSeek] API错误 ${status}:`, data);

                    if (status === 401) {
                        throw new Error('DeepSeek API 密钥无效，请检查 .env 文件中的 DEEPSEEK_API_KEY');
                    } else if (status === 429) {
                        throw new Error('DeepSeek API 调用频率超限，请稍后重试');
                    } else if (status === 500) {
                        throw new Error('DeepSeek 服务器错误，请稍后重试');
                    }
                    throw new Error(`DeepSeek API 错误: ${data.error?.message || '未知错误'}`);
                }

                if (error.code === 'ECONNABORTED') {
                    console.error('[DeepSeek] 请求超时');
                    throw new Error('DeepSeek API 请求超时，请稍后重试');
                }

                if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    console.error('[DeepSeek] 网络错误:', error.message);
                    throw new Error('无法连接到 DeepSeek API，请检查网络连接');
                }

                console.error('[DeepSeek] 未知错误:', error.message);
                throw new Error(`DeepSeek API 调用失败: ${error.message}`);
            }

            const delay = retryDelay * Math.pow(2, attempt);
            await sleep(delay);
        }
    }
}

export function getCostStats() {
    return {
        totalTokens: totalTokensUsed,
        totalCost: totalCost,
        costString: `¥${totalCost.toFixed(4)}`
    };
}

export function resetCostStats() {
    totalTokensUsed = 0;
    totalCost = 0;
    }

export async function callDeepSeekAPIStream(messages, systemPrompt = null) {
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'sk-your-api-key-here') {
        throw new Error('DEEPSEEK_API_KEY 未配置');
    }

    const fullMessages = [];
    if (systemPrompt) {
        fullMessages.push({
            role: 'system',
            content: systemPrompt
        });
    }
    fullMessages.push(...messages);

    // 预留：流式调用
    return {
        messages: fullMessages
    };
}
