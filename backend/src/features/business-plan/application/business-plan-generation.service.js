import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import promptLoader from '../../../utils/prompt-loader.js';
import { callDeepResearchService } from '../../../infrastructure/ai/deep-research-http-client.js';
import { CHAPTER_AGENTS } from '../domain/chapter-agents.js';
import { getPromptsByType } from './business-plan-prompt-registry.js';

function formatConversation(conversationHistory) {
  return conversationHistory
    .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
    .join('\n\n');
}

async function resolveChapterPrompt(chapterId, type) {
  const prompts = getPromptsByType(type);
  let promptTemplate = prompts[chapterId];

  if (!promptTemplate) {
    const docType = type === 'proposal' ? 'proposal' : 'business-plan';
    promptTemplate = await promptLoader.loadChapterTemplate(docType, chapterId);
  }

  if (!promptTemplate) {
    throw new Error(`未知的章节ID: ${chapterId} (类型: ${type})`);
  }

  return promptTemplate;
}

export async function generateWithDeepSeek(chapterId, conversationHistory, type = 'business') {
  console.log(
    `[DeepSeek生成] 开始生成章节: ${chapterId}, 对话历史长度: ${conversationHistory.length}`
  );

  if (conversationHistory.length > 0) {
    console.log(
      '[DeepSeek生成] 对话历史示例（前2条）:',
      conversationHistory
        .slice(0, 2)
        .map(msg => ({ role: msg.role, length: String(msg.content || '').length }))
    );
    if (conversationHistory.length > 2) {
      console.log(
        '[DeepSeek生成] 对话历史示例（后2条）:',
        conversationHistory
          .slice(-2)
          .map(msg => ({ role: msg.role, length: String(msg.content || '').length }))
      );
    }
  }

  const promptTemplate = await resolveChapterPrompt(chapterId, type);
  const agent = CHAPTER_AGENTS[chapterId];
  const conversation = formatConversation(conversationHistory);

  let prompt;
  if (promptTemplate.includes('{CONVERSATION}')) {
    prompt = promptTemplate.replace('{CONVERSATION}', conversation);
    console.log('[DeepSeek生成] 使用 {CONVERSATION} 占位符替换对话历史');
  } else {
    prompt = `${promptTemplate}\n\n**对话历史**：\n\`\`\`\n${conversation}\n\`\`\`\n\n请严格基于以上对话历史进行分析，不要使用mock数据或虚构信息。如果信息不足，请明确说明。`;
    console.log('[DeepSeek生成] 在模板末尾添加对话历史');
  }

  console.log('[DeepSeek生成] 最终提示词长度:', prompt.length);
  console.log('[DeepSeek生成] 最终提示词预览（前500字符）:', prompt.substring(0, 500));
  console.log(
    '[DeepSeek生成] 最终提示词预览（后500字符）:',
    prompt.substring(Math.max(0, prompt.length - 500))
  );

  console.log('[DeepSeek生成] 开始调用 DeepSeek API...');
  const result = await callDeepSeekAPI([{ role: 'user', content: prompt }], null, {
    max_tokens: 1500,
    temperature: 0.7,
    timeout: 120000
  });

  console.log('[DeepSeek生成] DeepSeek API 调用成功', {
    chapterId,
    contentLength: result.content.length,
    tokens: result.usage.total_tokens,
    contentPreview: result.content.substring(0, 200)
  });

  let cleanedContent = result.content;
  try {
    cleanedContent = cleanedContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
    cleanedContent = cleanedContent.trim();
    console.log('[DeepSeek生成] 内容已清理，长度:', cleanedContent.length);
  } catch (cleanError) {
    console.warn('[DeepSeek生成] 内容清理失败:', cleanError.message);
  }

  return {
    chapterId,
    content: cleanedContent,
    agent: agent.name,
    emoji: agent.emoji,
    tokens: result.usage.total_tokens,
    timestamp: Date.now(),
    mode: 'fast'
  };
}

export async function generateWithDeepResearch(
  chapterId,
  conversationHistory,
  type = 'business',
  researchDepth = 'medium'
) {
  console.log(`[DeepResearch生成] 开始生成章节: ${chapterId}, 深度: ${researchDepth}`);

  const agent = CHAPTER_AGENTS[chapterId] || {
    name: '深度研究专家',
    emoji: '🔬'
  };

  try {
    const result = await callDeepResearchService(
      chapterId,
      conversationHistory,
      type,
      researchDepth
    );

    console.log('[DeepResearch生成] 生成成功:', {
      chapterId,
      contentLength: result.content.length,
      sources: result.sources?.length || 0,
      confidence: result.confidence
    });

    return {
      chapterId: result.chapterId,
      content: result.content,
      sources: result.sources || [],
      confidence: result.confidence || 0.8,
      agent: agent.name,
      emoji: agent.emoji,
      tokens: result.tokens || 0,
      timestamp: Date.now(),
      mode: 'deep',
      depth: result.depth,
      iterations: result.iterations
    };
  } catch (error) {
    console.error('[DeepResearch生成] 生成失败:', error.message);
    throw error;
  }
}

export async function generateSingleChapter(
  chapterId,
  conversationHistory,
  type = 'business',
  useDeepResearch = false,
  researchDepth = 'medium'
) {
  console.log(
    `[生成章节] 开始生成章节: ${chapterId}, 模式: ${useDeepResearch ? '深度研究' : '快速生成'}`
  );

  if (useDeepResearch) {
    return generateWithDeepResearch(chapterId, conversationHistory, type, researchDepth);
  }

  return generateWithDeepSeek(chapterId, conversationHistory, type);
}
