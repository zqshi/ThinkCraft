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

function parseEnvInt(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return fallback;
    }
    const parsed = Number.parseInt(String(raw).trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseEnvFloat(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
        return fallback;
    }
    const parsed = Number.parseFloat(String(raw).trim());
    return Number.isFinite(parsed) ? parsed : fallback;
}

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_DEEPSEEK_MODEL = String(process.env.DEEPSEEK_MODEL || 'deepseek-reasoner').trim();
const DEFAULT_DEEPSEEK_MAX_TOKENS = parseEnvInt('DEEPSEEK_MAX_TOKENS', 2000);
const DEFAULT_DEEPSEEK_TEMPERATURE = parseEnvFloat('DEEPSEEK_TEMPERATURE', 0.7);
const DEFAULT_DEEPSEEK_RETRY = parseEnvInt('DEEPSEEK_RETRY', 3);
const DEFAULT_DEEPSEEK_RETRY_DELAY_MS = parseEnvInt('DEEPSEEK_RETRY_DELAY_MS', 1000);
const DEFAULT_DEEPSEEK_TIMEOUT_MS = parseEnvInt('DEEPSEEK_TIMEOUT_MS', 120000);

let totalTokensUsed = 0;
let totalCost = 0; // DeepSeek定价：约 ¥0.001/1K tokens

const requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = parseEnvInt('DEEPSEEK_MAX_CONCURRENT_REQUESTS', 3);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildDeepSeekHttpError(status, data = {}) {
    const serverMessage = data?.error?.message || data?.message || '未知错误';
    const errorMap = {
        400: {
            label: '格式错误',
            reason: '请求体格式错误',
            action: '请根据错误信息提示修改请求体',
            message: `DeepSeek API 错误(400 格式错误): ${serverMessage}`
        },
        401: {
            label: '认证失败',
            reason: 'API key 错误，认证失败',
            action: '请检查您的 API key 是否正确，如没有 API key，请先创建 API key',
            message: 'DeepSeek API 密钥无效，请检查 .env 文件中的 DEEPSEEK_API_KEY'
        },
        402: {
            label: '余额不足',
            reason: '账号余额不足',
            action: '请确认账户余额，并前往充值页面进行充值',
            message: `DeepSeek API 错误(402 余额不足): ${serverMessage}`
        },
        422: {
            label: '参数错误',
            reason: '请求体参数错误',
            action: '请根据错误信息提示修改相关参数',
            message: `DeepSeek API 错误(422 参数错误): ${serverMessage}`
        },
        429: {
            label: '请求速率达到上限',
            reason: '请求速率（TPM 或 RPM）达到上限',
            action: '请合理规划您的请求速率',
            message: 'DeepSeek API 调用频率超限，请稍后重试'
        },
        500: {
            label: '服务器故障',
            reason: '服务器内部故障',
            action: '请等待后重试。若问题一直存在，请联系服务提供方',
            message: 'DeepSeek 服务器错误，请稍后重试'
        },
        503: {
            label: '服务器繁忙',
            reason: '服务器负载过高',
            action: '请稍后重试您的请求',
            message: 'DeepSeek 服务繁忙，请稍后重试'
        }
    };
    const fallback = {
        label: '未知错误',
        reason: '服务端返回了未映射的错误码',
        action: '请检查请求参数、网络及服务状态后重试',
        message: `DeepSeek API 错误(${status}): ${serverMessage}`
    };
    return errorMap[status] || fallback;
}

export async function callDeepSeekAPI(messages, systemPrompt = null, options = {}) {
    const {
        max_tokens = DEFAULT_DEEPSEEK_MAX_TOKENS,
        temperature = DEFAULT_DEEPSEEK_TEMPERATURE,
        retry = DEFAULT_DEEPSEEK_RETRY,
        retryDelay = DEFAULT_DEEPSEEK_RETRY_DELAY_MS,
        timeout = DEFAULT_DEEPSEEK_TIMEOUT_MS,
        response_format,
        model = DEFAULT_DEEPSEEK_MODEL
    } = options;

    console.log('[DeepSeek API] 开始调用', {
        messagesCount: messages.length,
        hasSystemPrompt: !!systemPrompt,
        max_tokens,
        temperature,
        model
    });

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

            console.log('[DeepSeek API] 发送请求到:', DEEPSEEK_API_URL);
            console.log('[DeepSeek API] 请求payload:', {
                model: payload.model,
                messagesCount: payload.messages.length,
                temperature: payload.temperature,
                max_tokens: payload.max_tokens,
                firstMessagePreview: payload.messages[0]?.content?.substring(0, 200)
            });

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
            const finishReason = result.choices?.[0]?.finish_reason || null;
            const usage = result.usage;

            totalTokensUsed += usage.total_tokens;
            totalCost = (totalTokensUsed / 1000) * 0.001;

            console.log('[DeepSeek API] 调用成功', {
                contentLength: content.length,
                finishReason,
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
                totalCostSoFar: `¥${totalCost.toFixed(4)}`,
                contentPreview: content.substring(0, 200)
            });

            return {
                content: content,
                model: result.model,
                usage: {
                    prompt_tokens: usage.prompt_tokens,
                    completion_tokens: usage.completion_tokens,
                    total_tokens: usage.total_tokens
                },
                finish_reason: finishReason
            };
        } catch (error) {
            activeRequests--;

            if (attempt === retry - 1) {
                if (error.response) {
                    const status = error.response.status;
                    const data = error.response.data;
                    const requestId =
                        error.response.headers?.['x-request-id'] ||
                        error.response.headers?.['request-id'] ||
                        null;
                    const mapped = buildDeepSeekHttpError(status, data);

                    console.error('[DeepSeek] API错误', {
                        status,
                        code: data?.error?.code || null,
                        type: data?.error?.type || null,
                        requestId,
                        label: mapped.label,
                        reason: mapped.reason,
                        action: mapped.action,
                        serverMessage: data?.error?.message || data?.message || null,
                        raw: data
                    });
                    throw new Error(mapped.message);
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
