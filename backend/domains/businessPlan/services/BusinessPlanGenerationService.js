/**
 * 商业计划书生成服务（Domain Service）
 * 负责处理商业计划书章节生成的业务逻辑
 */

import { callDeepSeekAPI, getCostStats } from '../../../config/deepseek.js';
import { BusinessPlanChapter, CHAPTER_PROMPTS, CHAPTER_AGENTS } from '../models/valueObjects/BusinessPlanChapter.js';

/**
 * 商业计划书生成服务类
 */
export class BusinessPlanGenerationService {
  /**
   * 格式化对话历史
   * @param {Array} conversationHistory - 对话历史数组
   * @returns {string} 格式化后的字符串
   */
  formatConversation(conversationHistory) {
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return '';
    }

    return conversationHistory
      .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * 生成单个章节
   * @param {string} chapterId - 章节ID
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>} { chapterId, content, agent, tokens }
   */
  async generateChapter(chapterId, conversationHistory) {
    // 验证章节ID
    if (!BusinessPlanChapter.isValidChapterId(chapterId)) {
      throw new Error(`无效的章节ID: ${chapterId}`);
    }

    // 验证对话历史
    if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
      throw new Error('对话历史不能为空');
    }

    // 获取章节信息
    const promptTemplate = BusinessPlanChapter.getPromptTemplate(chapterId);
    const agentInfo = BusinessPlanChapter.getAgentInfo(chapterId);

    // 格式化对话历史并替换占位符
    const conversation = this.formatConversation(conversationHistory);
    const prompt = promptTemplate.replace('{CONVERSATION}', conversation);

    console.log(`[BusinessPlanService] 生成章节: ${chapterId} (${agentInfo.name})`);

    // 调用DeepSeek API
    const result = await callDeepSeekAPI(
      [{ role: 'user', content: prompt }],
      null,
      {
        max_tokens: 1500, // 章节内容较长
        temperature: 0.7
      }
    );

    return {
      chapterId,
      content: result.content,
      agent: agentInfo.name,
      emoji: agentInfo.emoji,
      tokens: result.usage.total_tokens,
      timestamp: Date.now()
    };
  }

  /**
   * 批量生成章节（并行）
   * @param {Array<string>} chapterIds - 章节ID列表
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>} { chapters, totalTokens, duration, costStats }
   */
  async generateBatchChapters(chapterIds, conversationHistory) {
    // 参数验证
    if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
      throw new Error('章节ID列表不能为空');
    }

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      throw new Error('对话历史不能为空');
    }

    // 验证所有章节ID是否有效
    const invalidIds = chapterIds.filter(id => !BusinessPlanChapter.isValidChapterId(id));
    if (invalidIds.length > 0) {
      throw new Error(`无效的章节ID: ${invalidIds.join(', ')}`);
    }

    console.log(`[BusinessPlanService] 开始批量生成 ${chapterIds.length} 个章节`);

    // 并行生成所有章节
    const startTime = Date.now();
    const promises = chapterIds.map(id => this.generateChapter(id, conversationHistory));
    const chapters = await Promise.all(promises);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // 计算总token使用量
    const totalTokens = chapters.reduce((sum, ch) => sum + ch.tokens, 0);

    console.log(`[BusinessPlanService] ✓ 批量生成完成，耗时 ${duration}秒，tokens: ${totalTokens}`);

    // 获取成本统计
    const costStats = getCostStats();

    return {
      chapters,
      totalTokens,
      duration: parseFloat(duration),
      costStats
    };
  }

  /**
   * 按推荐顺序生成所有章节
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>}
   */
  async generateAllChaptersInOrder(conversationHistory) {
    const chapterIds = BusinessPlanChapter.getRecommendedOrder();
    return await this.generateBatchChapters(chapterIds, conversationHistory);
  }

  /**
   * 获取所有可用章节信息
   * @returns {Object}
   */
  getAvailableChapters() {
    const chapters = BusinessPlanChapter.getAllChapters();
    const estimatedTotalTime = BusinessPlanChapter.calculateEstimatedTime(
      BusinessPlanChapter.getAllChapterIds()
    );

    return {
      chapters,
      total: chapters.length,
      estimatedTotalTime
    };
  }

  /**
   * 获取章节详细信息
   * @param {string} chapterId
   * @returns {Object|null}
   */
  getChapterInfo(chapterId) {
    return BusinessPlanChapter.getChapterById(chapterId);
  }

  /**
   * 验证生成参数
   * @param {string} chapterId - 章节ID
   * @param {Array} conversationHistory - 对话历史
   * @returns {Object} { valid: boolean, error?: string }
   */
  validateGenerationParams(chapterId, conversationHistory) {
    if (!chapterId) {
      return { valid: false, error: '章节ID不能为空' };
    }

    if (!BusinessPlanChapter.isValidChapterId(chapterId)) {
      return { valid: false, error: `无效的章节ID: ${chapterId}` };
    }

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return { valid: false, error: '对话历史必须是数组' };
    }

    if (conversationHistory.length === 0) {
      return { valid: false, error: '对话历史不能为空' };
    }

    return { valid: true };
  }

  /**
   * 估算生成成本
   * @param {Array<string>} chapterIds - 章节ID列表
   * @returns {Object} 成本估算
   */
  estimateGenerationCost(chapterIds) {
    if (!chapterIds || !Array.isArray(chapterIds)) {
      return null;
    }

    const estimatedTime = BusinessPlanChapter.calculateEstimatedTime(chapterIds);

    // 假设每个章节平均使用1500 tokens（输入+输出）
    const estimatedTokensPerChapter = 1500;
    const totalEstimatedTokens = chapterIds.length * estimatedTokensPerChapter;

    // DeepSeek定价（示例）：输入 $0.14/1M tokens, 输出 $0.28/1M tokens
    const inputTokens = totalEstimatedTokens * 0.3; // 30%输入
    const outputTokens = totalEstimatedTokens * 0.7; // 70%输出
    const estimatedCostUSD = (inputTokens / 1000000 * 0.14) + (outputTokens / 1000000 * 0.28);

    return {
      chapterCount: chapterIds.length,
      estimatedTime, // 秒
      estimatedTokens: totalEstimatedTokens,
      estimatedCostUSD: estimatedCostUSD.toFixed(4),
      estimatedCostCNY: (estimatedCostUSD * 7.2).toFixed(2) // 假设汇率7.2
    };
  }

  /**
   * 生成进度回调（用于流式响应）
   * @param {Function} onProgress - 进度回调函数
   * @param {Array<string>} chapterIds - 章节ID列表
   * @param {Array} conversationHistory - 对话历史
   * @returns {Promise<Object>}
   */
  async generateWithProgress(onProgress, chapterIds, conversationHistory) {
    const results = {
      chapters: [],
      totalTokens: 0,
      errors: []
    };

    const startTime = Date.now();

    for (let i = 0; i < chapterIds.length; i++) {
      const chapterId = chapterIds[i];

      try {
        // 通知开始生成
        if (onProgress) {
          onProgress({
            status: 'generating',
            chapterId,
            current: i + 1,
            total: chapterIds.length,
            progress: Math.round(((i + 1) / chapterIds.length) * 100)
          });
        }

        // 生成章节
        const chapter = await this.generateChapter(chapterId, conversationHistory);
        results.chapters.push(chapter);
        results.totalTokens += chapter.tokens;

        // 通知完成
        if (onProgress) {
          onProgress({
            status: 'completed',
            chapterId,
            chapter,
            current: i + 1,
            total: chapterIds.length,
            progress: Math.round(((i + 1) / chapterIds.length) * 100)
          });
        }

      } catch (error) {
        results.errors.push({
          chapterId,
          error: error.message
        });

        // 通知错误
        if (onProgress) {
          onProgress({
            status: 'error',
            chapterId,
            error: error.message,
            current: i + 1,
            total: chapterIds.length
          });
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    results.duration = parseFloat(duration);
    results.costStats = getCostStats();

    return results;
  }
}

// 创建单例实例
export const businessPlanGenerationService = new BusinessPlanGenerationService();

export default BusinessPlanGenerationService;
