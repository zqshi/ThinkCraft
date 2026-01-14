/**
 * DeepSeek API 封装（增强版）
 * 兼容 OpenAI Chat Completions API 格式
 * 新增：重试机制、成本控制、自定义参数支持
 */
import axios from 'axios';
import dotenv from 'dotenv';

// 确保环境变量已加载
dotenv.config();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

// 成本统计（全局）
let totalTokensUsed = 0;
let totalCost = 0; // DeepSeek定价：约 ¥0.001/1K tokens

// 请求队列（防止并发过多）
const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 3;

/**
 * 睡眠函数
 * @param {Number} ms - 毫秒数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 调用 DeepSeek Chat API（非流式）- 增强版
 * @param {Array} messages - 对话消息数组 [{ role, content }, ...]
 * @param {String} systemPrompt - 系统提示词（可选）
 * @param {Object} options - 可选参数
 * @param {Number} options.max_tokens - 最大token数（默认2000）
 * @param {Number} options.temperature - 温度参数（默认0.7）
 * @param {Number} options.retry - 重试次数（默认3）
 * @param {Number} options.retryDelay - 重试延迟（默认1000ms）
 * @returns {Object} - { content, model, usage }
 */
export async function callDeepSeekAPI(messages, systemPrompt = null, options = {}) {
    // 解构可选参数
    const {
        max_tokens = 2000,
        temperature = 0.7,
        retry = 3,
        retryDelay = 1000,
        timeout = 120000  // 默认120秒超时（AI分析需要较长时间）
    } = options;

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

    // 重试逻辑
    for (let attempt = 0; attempt < retry; attempt++) {
        try {
            // 等待队列（并发控制）
            while (activeRequests >= MAX_CONCURRENT_REQUESTS) {
                await sleep(100);
            }
            activeRequests++;

            console.log(`[DeepSeek] 调用API (尝试 ${attempt + 1}/${retry})，消息数: ${fullMessages.length}, max_tokens: ${max_tokens}`);

            const response = await axios.post(
                DEEPSEEK_API_URL,
                {
                    model: 'deepseek-chat',
                    messages: fullMessages,
                    temperature,
                    max_tokens,
                    stream: false
                },
                {
                    headers: {
                        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout
                }
            );

            activeRequests--;

            const result = response.data;
            const content = result.choices[0].message.content;
            const usage = result.usage;

            // 更新成本统计
            totalTokensUsed += usage.total_tokens;
            totalCost = (totalTokensUsed / 1000) * 0.001; // 每1K tokens约0.001元

            console.log(`[DeepSeek] ✓ 成功，tokens: ${usage.total_tokens} (累计: ${totalTokensUsed}, 成本: ¥${totalCost.toFixed(4)})`);

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

            // 如果是最后一次尝试，抛出错误
            if (attempt === retry - 1) {
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

            // 如果不是最后一次尝试，计算延迟后重试
            const delay = retryDelay * Math.pow(2, attempt); // 指数退避
            console.warn(`[DeepSeek] 请求失败，${delay}ms后重试...`);
            await sleep(delay);
        }
    }
}

/**
 * 获取成本统计
 * @returns {Object} - { totalTokens, totalCost, costString }
 */
export function getCostStats() {
    return {
        totalTokens: totalTokensUsed,
        totalCost: totalCost,
        costString: `¥${totalCost.toFixed(4)}`
    };
}

/**
 * 重置成本统计
 */
export function resetCostStats() {
    totalTokensUsed = 0;
    totalCost = 0;
    console.log('[DeepSeek] 成本统计已重置');
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
