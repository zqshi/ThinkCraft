/**
 * 商业计划书生成 API
 * 支持单章节生成和批量生成
 */
import express from 'express';
import { callDeepSeekAPI, getCostStats } from '../../../../config/deepseek.js';
import promptLoader from '../../../utils/prompt-loader.js';

const router = express.Router();

// 商业计划书章节提示词（从 markdown 文件加载）
let CHAPTER_PROMPTS = {};
let PROPOSAL_PROMPTS = {};

// 初始化提示词
async function initializePrompts() {
    try {
        CHAPTER_PROMPTS = await promptLoader.loadBusinessPlanChapters();
        PROPOSAL_PROMPTS = await promptLoader.loadProposalChapters();
        console.log('✅ Business plan prompts loaded successfully');
        console.log('✅ Proposal prompts loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load prompts:', error.message);
        throw error;
    }
}

// 启动时加载提示词
initializePrompts();

// Agent信息（用于前端显示）
const CHAPTER_AGENTS = {
    'executive-summary': { name: '综合分析师', emoji: '🤖', estimatedTime: 30 },
    'market-analysis': { name: '市场分析师', emoji: '📊', estimatedTime: 45 },
    'solution': { name: '产品专家', emoji: '💡', estimatedTime: 40 },
    'business-model': { name: '商业顾问', emoji: '💰', estimatedTime: 35 },
    'competitive-landscape': { name: '竞争分析师', emoji: '⚔️', estimatedTime: 40 },
    'marketing-strategy': { name: '营销专家', emoji: '📈', estimatedTime: 35 },
    'team-structure': { name: '组织顾问', emoji: '👥', estimatedTime: 30 },
    'financial-projection': { name: '财务分析师', emoji: '💵', estimatedTime: 50 },
    'risk-assessment': { name: '风险专家', emoji: '⚠️', estimatedTime: 35 },
    'implementation-plan': { name: '项目经理', emoji: '📋', estimatedTime: 40 },
    'appendix': { name: '文档专家', emoji: '📎', estimatedTime: 25 },
    'project-summary': { name: '产品经理', emoji: '📋', estimatedTime: 25 },
    'problem-insight': { name: '用户研究专家', emoji: '🔍', estimatedTime: 35 },
    'product-solution': { name: '产品设计专家', emoji: '💡', estimatedTime: 40 },
    'implementation-path': { name: '项目管理专家', emoji: '🛤️', estimatedTime: 35 },
    'competitive-analysis': { name: '竞品分析专家', emoji: '⚔️', estimatedTime: 30 },
    'budget-planning': { name: '财务规划专家', emoji: '💰', estimatedTime: 30 },
    'risk-control': { name: '风险管理专家', emoji: '⚠️', estimatedTime: 25 }
};

/**
 * 格式化对话历史
 * @param {Array} conversationHistory - 对话历史数组
 * @returns {String} 格式化后的字符串
 */
function formatConversation(conversationHistory) {
    return conversationHistory
        .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
        .join('\n\n');
}

/**
 * 生成单个章节
 * @param {String} chapterId - 章节ID
 * @param {Array} conversationHistory - 对话历史
 * @param {String} type - 类型：'business' 或 'proposal'
 * @returns {Promise<Object>} { chapterId, content, agent, tokens }
 */
async function generateSingleChapter(chapterId, conversationHistory, type = 'business') {
    console.log(`[生成章节] 开始生成章节: ${chapterId}, 对话历史长度: ${conversationHistory.length}`);

    // 打印对话历史的前2条和后2条，用于调试
    if (conversationHistory.length > 0) {
        console.log('[生成章节] 对话历史示例（前2条）:', conversationHistory.slice(0, 2));
        if (conversationHistory.length > 2) {
            console.log('[生成章节] 对话历史示例（后2条）:', conversationHistory.slice(-2));
        }
    }

    // 根据类型选择提示词
    const prompts = type === 'proposal' ? PROPOSAL_PROMPTS : CHAPTER_PROMPTS;
    let promptTemplate = prompts[chapterId];

    // 如果旧方式没有找到，尝试使用新的章节模板加载方式
    if (!promptTemplate) {
        try {
            const docType = type === 'proposal' ? 'proposal' : 'business-plan';
            promptTemplate = await promptLoader.loadChapterTemplate(docType, chapterId);
        } catch (error) {
            throw new Error(`未知的章节ID: ${chapterId} (类型: ${type})`);
        }
    }

    const agent = CHAPTER_AGENTS[chapterId];
    const conversation = formatConversation(conversationHistory);

    // 如果模板中包含 {CONVERSATION} 占位符，则替换
    // 如果不包含，则在模板末尾添加对话历史
    let prompt;
    if (promptTemplate.includes('{CONVERSATION}')) {
        prompt = promptTemplate.replace('{CONVERSATION}', conversation);
        console.log('[生成章节] 使用 {CONVERSATION} 占位符替换对话历史');
    } else {
        prompt = `${promptTemplate}\n\n**对话历史**：\n\`\`\`\n${conversation}\n\`\`\`\n\n请严格基于以上对话历史进行分析，不要使用mock数据或虚构信息。如果信息不足，请明确说明。`;
        console.log('[生成章节] 在模板末尾添加对话历史');
    }

    // 打印最终提示词的长度和前500字符
    console.log('[生成章节] 最终提示词长度:', prompt.length);
    console.log('[生成章节] 最终提示词预览（前500字符）:', prompt.substring(0, 500));
    console.log('[生成章节] 最终提示词预览（后500字符）:', prompt.substring(Math.max(0, prompt.length - 500)));

    // 调用DeepSeek API
    console.log('[生成章节] 开始调用 DeepSeek API...');
    const result = await callDeepSeekAPI(
        [{ role: 'user', content: prompt }],
        null,
        {
            max_tokens: 1500, // 章节内容较长
            temperature: 0.7,
            timeout: 120000
        }
    );

    console.log('[生成章节] DeepSeek API 调用成功', {
        chapterId,
        contentLength: result.content.length,
        tokens: result.usage.total_tokens,
        contentPreview: result.content.substring(0, 200)
    });

    return {
        chapterId,
        content: result.content,
        agent: agent.name,
        emoji: agent.emoji,
        tokens: result.usage.total_tokens,
        timestamp: Date.now()
    };
}

/**
 * POST /api/business-plan/generate-chapter
 * 生成单个章节
 */
router.post('/generate-chapter', async (req, res, next) => {
    try {
        const { chapterId, conversationHistory, type = 'business' } = req.body;

        // 参数验证
        if (!chapterId) {
            return res.status(400).json({
                code: -1,
                error: '缺少必要参数: chapterId'
            });
        }

        if (!conversationHistory || !Array.isArray(conversationHistory)) {
            return res.status(400).json({
                code: -1,
                error: '缺少或无效的对话历史'
            });
        }

        const result = await generateSingleChapter(chapterId, conversationHistory, type);

        res.json({
            code: 0,
            data: result
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/business-plan/generate-full
 * 使用完整文档提示词生成商业计划书（支持动态章节注入）
 */
router.post('/generate-full', async (req, res, next) => {
    try {
        const { chapterIds, conversationHistory, type = 'business' } = req.body;

        // 参数验证
        if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
            return res.status(400).json({
                code: -1,
                error: '缺少或无效的章节ID列表'
            });
        }

        if (!conversationHistory || !Array.isArray(conversationHistory)) {
            return res.status(400).json({
                code: -1,
                error: '缺少或无效的对话历史'
            });
        }

        const startTime = Date.now();

        // 构建带章节注入的完整文档提示词
        const docType = type === 'proposal' ? 'proposal' : 'business-plan';
        const { systemPrompt, prompt, metadata } = await promptLoader.buildPromptWithChapters(
            docType,
            chapterIds,
            conversationHistory
        );

        // 调用DeepSeek API生成完整文档
        const result = await callDeepSeekAPI(
            [{ role: 'user', content: prompt }],
            systemPrompt,
            {
                max_tokens: 8000,
                temperature: 0.7,
                timeout: 180000
            }
        );

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        const costStats = getCostStats();

        res.json({
            code: 0,
            data: {
                document: result.content,
                format: 'markdown',
                mode: 'full-document',
                selectedChapters: chapterIds,
                metadata,
                tokens: result.usage.total_tokens,
                duration: parseFloat(duration),
                costStats
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/business-plan/generate-batch
 * 批量生成章节（并行）
 */
router.post('/generate-batch', async (req, res, next) => {
    try {
        const { chapterIds, conversationHistory, type = 'business' } = req.body;

        // 参数验证
        if (!chapterIds || !Array.isArray(chapterIds) || chapterIds.length === 0) {
            return res.status(400).json({
                code: -1,
                error: '缺少或无效的章节ID列表'
            });
        }

        if (!conversationHistory || !Array.isArray(conversationHistory)) {
            return res.status(400).json({
                code: -1,
                error: '缺少或无效的对话历史'
            });
        }

        // 并行生成所有章节
        const startTime = Date.now();
        const promises = chapterIds.map(id => generateSingleChapter(id, conversationHistory, type));
        const chapters = await Promise.all(promises);
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        // 计算总token使用量
        const totalTokens = chapters.reduce((sum, ch) => sum + ch.tokens, 0);

        // 获取成本统计
        const costStats = getCostStats();

        res.json({
            code: 0,
            data: {
                chapters,
                totalTokens,
                duration: parseFloat(duration),
                costStats
            }
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/business-plan/chapters
 * 获取所有可用章节列表
 */
router.get('/chapters', (req, res) => {
    const chapters = Object.keys(CHAPTER_PROMPTS).map(id => ({
        id,
        ...CHAPTER_AGENTS[id]
    }));

    res.json({
        code: 0,
        data: { chapters }
    });
});

/**
 * GET /api/business-plan/cost-stats
 * 获取成本统计
 */
router.get('/cost-stats', (req, res) => {
    const stats = getCostStats();
    res.json({
        code: 0,
        data: stats
    });
});

export default router;
