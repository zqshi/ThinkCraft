/**
 * Chat application service
 */
import { callDeepSeekAPI } from '../../../infrastructure/ai/deepseek-client.js';
import { fail, ok } from '../../../shared/result.js';

function validateMessages(messages) {
  if (!messages || !Array.isArray(messages)) {
    return 'messages 参数必须是数组';
  }

  if (messages.length === 0) {
    return 'messages 数组不能为空';
  }

  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return '消息格式错误：每条消息必须包含 role 和 content 字段';
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      return `无效的消息角色: ${msg.role}`;
    }
  }

  return null;
}

export async function chatWithModel({ messages, systemPrompt }) {
  const validationError = validateMessages(messages);
  if (validationError) {
    return fail(validationError, 400);
  }

  try {
    const response = await callDeepSeekAPI(messages, systemPrompt);
    return ok({
      content: response.content,
      model: response.model,
      tokens: {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens
      }
    });
  } catch (error) {
    return fail(error.message || 'AI调用失败');
  }
}
