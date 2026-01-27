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
    executive_summary: { name: '综合分析师', emoji: '🤖', estimatedTime: 30 },
    market_analysis: { name: '市场分析师', emoji: '📊', estimatedTime: 45 },
    solution: { name: '产品专家', emoji: '💡', estimatedTime: 40 },
    business_model: { name: '商业顾问', emoji: '💰', estimatedTime: 35 },
    competitive_landscape: { name: '竞争分析师', emoji: '⚔️', estimatedTime: 40 },
    marketing_strategy: { name: '营销专家', emoji: '📈', estimatedTime: 35 },
    team_structure: { name: '组织顾问', emoji: '👥', estimatedTime: 30 },
    financial_projection: { name: '财务分析师', emoji: '💵', estimatedTime: 50 },
    risk_assessment: { name: '风险专家', emoji: '⚠️', estimatedTime: 35 },
    implementation_plan: { name: '项目经理', emoji: '📋', estimatedTime: 40 },
    appendix: { name: '文档专家', emoji: '📎', estimatedTime: 25 }
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
    // 根据类型选择提示词
    const prompts = type === 'proposal' ? PROPOSAL_PROMPTS : CHAPTER_PROMPTS;
    let promptTemplate = prompts[chapterId];

    // 如果旧方式没有找到，尝试使用新的章节模板加载方式
    if (!promptTemplate) {
        try {
            const docType = type === 'proposal' ? 'proposal' : 'business-plan';
            const chapterIdWithDash = chapterId.replace(/_/g, '-');
            promptTemplate = await promptLoader.loadChapterTemplate(docType, chapterIdWithDash);
        } catch (error) {
            throw new Error(`未知的章节ID: ${chapterId} (类型: ${type})`);
        }
    }

    const agent = CHAPTER_AGENTS[chapterId];
    const conversation = formatConversation(conversationHistory);
    const prompt = promptTemplate.replace('{CONVERSATION}', conversation);

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
                temperature: 0.7
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
