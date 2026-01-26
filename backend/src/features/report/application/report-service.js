import { callDeepSeekAPI } from '../../../infrastructure/ai/deepseek-client.js';
import { REPORT_GENERATION_PROMPT } from '../../../../config/report-prompts.js';
import { fail, ok } from '../../../shared/result.js';

function buildConversationSummary(messages) {
  return messages
    .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
    .join('\n\n');
}

export async function generateReport(messages) {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return fail('必须提供有效的对话历史', 400);
  }

  const conversationSummary = buildConversationSummary(messages);
  const reportMessages = [
    {
      role: 'user',
      content: `${REPORT_GENERATION_PROMPT}\n\n=== 对话历史 ===\n${conversationSummary}`
    }
  ];

  try {
    const response = await callDeepSeekAPI(reportMessages, null);
    let reportData;

    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        reportData = JSON.parse(jsonMatch[0]);
      } else {
        reportData = JSON.parse(response.content);
      }
    } catch (parseError) {
      console.error('JSON解析失败:', response.content);
      return fail('AI返回的报告格式无效', 500, response.content);
    }

    return ok({
      report: reportData,
      tokens: {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens
      }
    });
  } catch (error) {
    return fail(error.message || '报告生成失败');
  }
}
