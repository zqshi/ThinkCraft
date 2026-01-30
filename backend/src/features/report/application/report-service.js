import { callDeepSeekAPI } from '../../../infrastructure/ai/deepseek-client.js';
import promptLoader from '../../../utils/prompt-loader.js';
import { fail, ok } from '../../../shared/result.js';

// 报告生成提示词（从 markdown 文件加载）
let REPORT_GENERATION_PROMPT = '';

// 初始化提示词
async function initializePrompts() {
  try {
    REPORT_GENERATION_PROMPT = await promptLoader.load('report-generation');
    console.log('✅ Report generation prompt loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load report generation prompt:', error.message);
    throw error;
  }
}

// 启动时加载提示词
initializePrompts();

function buildConversationSummary(messages) {
  return messages
    .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
    .join('\n\n');
}

function sanitizeJSONText(text) {
  if (!text) {
    return text;
  }
  return text
    .replace(/^\uFEFF/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u2028|\u2029/g, '')
    .replace(/\u00A0/g, ' ');
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
      const rawContent = response.content || '';
      const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/i) || rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        reportData = JSON.parse(jsonText);
      } else {
        reportData = JSON.parse(rawContent);
      }
    } catch (parseError) {
      try {
        const normalized = sanitizeJSONText(response.content || '');
        const jsonMatch = normalized.match(/```json\s*([\s\S]*?)```/i) || normalized.match(/\{[\s\S]*\}/);
        const jsonText = jsonMatch ? jsonMatch[1] || jsonMatch[0] : normalized;
        reportData = JSON.parse(jsonText);
      } catch (retryError) {
        console.error('JSON解析失败:', response.content);
        return fail('AI返回的报告格式无效', 500, response.content);
      }
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
