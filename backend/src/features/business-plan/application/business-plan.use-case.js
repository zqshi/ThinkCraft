/**
 * 商业计划书用例
 * 实现商业计划书相关的业务用例
 */
import { BusinessPlan } from '../domain/business-plan.aggregate.js';
import { BusinessPlanResponseDto, CreateBusinessPlanDto, ChapterResponseDto } from './business-plan.dto.js';
import { callDeepSeekAPI, getCostStats } from '../../../../config/deepseek.js';

/**
 * 商业计划书用例服务
 */
export class BusinessPlanUseCase {
    constructor(businessPlanRepository) {
        this._businessPlanRepository = businessPlanRepository;
        this._chapterTemplates = this._initializeChapterTemplates();
        this._chapterAgents = this._initializeChapterAgents();
    }

    /**
     * 创建商业计划书
     */
    async createBusinessPlan(createDto) {
        createDto.validate();

        const businessPlan = BusinessPlan.create({
            title: createDto.title,
            projectId: createDto.projectId,
            generatedBy: createDto.generatedBy
        });

        await this._businessPlanRepository.save(businessPlan);

        return BusinessPlanResponseDto.fromAggregate(businessPlan);
    }

    /**
     * 生成单个章节
     */
    async generateChapter(businessPlanId, generateDto) {
        generateDto.validate();

        const businessPlan = await this._businessPlanRepository.findById(businessPlanId);
        if (!businessPlan) {
            throw new Error('商业计划书不存在');
        }

        if (!businessPlan.canGenerateChapter()) {
            throw new Error('当前状态不允许生成章节');
        }

        const chapterContent = await this._generateChapterContent(
            generateDto.chapterId,
            generateDto.conversationHistory
        );

        businessPlan.generateChapter(
            generateDto.chapterId,
            chapterContent.content,
            chapterContent.tokens,
            chapterContent.cost
        );

        await this._businessPlanRepository.save(businessPlan);

        return {
            chapter: ChapterResponseDto.fromGeneratedChapter(chapterContent),
            businessPlan: BusinessPlanResponseDto.fromAggregate(businessPlan)
        };
    }

    /**
     * 批量生成章节
     */
    async generateBatchChapters(businessPlanId, generateBatchDto) {
        generateBatchDto.validate();

        const businessPlan = await this._businessPlanRepository.findById(businessPlanId);
        if (!businessPlan) {
            throw new Error('商业计划书不存在');
        }

        if (!businessPlan.canGenerateChapter()) {
            throw new Error('当前状态不允许生成章节');
        }

        // 并行生成所有章节
        const chapterPromises = generateBatchDto.chapterIds.map(chapterId =>
            this._generateChapterContent(chapterId, generateBatchDto.conversationHistory)
        );

        const chapters = await Promise.all(chapterPromises);

        // 保存所有章节到商业计划书
        chapters.forEach(chapter => {
            businessPlan.generateChapter(
                chapter.chapterId,
                chapter.content,
                chapter.tokens,
                chapter.cost
            );
        });

        await this._businessPlanRepository.save(businessPlan);

        return {
            chapters: chapters.map(chapter => ChapterResponseDto.fromGeneratedChapter(chapter)),
            businessPlan: BusinessPlanResponseDto.fromAggregate(businessPlan)
        };
    }

    /**
     * 完成商业计划书
     */
    async completeBusinessPlan(businessPlanId) {
        const businessPlan = await this._businessPlanRepository.findById(businessPlanId);
        if (!businessPlan) {
            throw new Error('商业计划书不存在');
        }

        businessPlan.complete();
        await this._businessPlanRepository.save(businessPlan);

        return BusinessPlanResponseDto.fromAggregate(businessPlan);
    }

    /**
     * 获取商业计划书
     */
    async getBusinessPlan(businessPlanId) {
        const businessPlan = await this._businessPlanRepository.findById(businessPlanId);
        if (!businessPlan) {
            throw new Error('商业计划书不存在');
        }

        return BusinessPlanResponseDto.fromAggregate(businessPlan);
    }

    /**
     * 获取项目的商业计划书
     */
    async getBusinessPlanByProject(projectId) {
        const businessPlan = await this._businessPlanRepository.findByProjectId(projectId);
        if (!businessPlan) {
            return null;
        }

        return BusinessPlanResponseDto.fromAggregate(businessPlan);
    }

    /**
     * 获取用户的所有商业计划书
     */
    async getUserBusinessPlans(userId) {
        const businessPlans = await this._businessPlanRepository.findByUserId(userId);
        return businessPlans.map(bp => BusinessPlanResponseDto.fromAggregate(bp));
    }

    /**
     * 获取可用章节列表
     */
    getAvailableChapters() {
        return Object.keys(this._chapterTemplates).map(id => ({
            id,
            ...this._chapterAgents[id]
        }));
    }

    /**
     * 生成章节内容
     */
    async _generateChapterContent(chapterId, conversationHistory) {
        const template = this._chapterTemplates[chapterId];
        const agent = this._chapterAgents[chapterId];

        if (!template || !agent) {
            throw new Error(`未知的章节ID: ${chapterId}`);
        }

        const conversation = this._formatConversation(conversationHistory);
        const prompt = template.replace('{CONVERSATION}', conversation);

        const result = await callDeepSeekAPI(
            [{ role: 'user', content: prompt }],
            null,
            {
                max_tokens: 1500,
                temperature: 0.7
            }
        );

        return {
            chapterId,
            content: result.content,
            agent: agent.name,
            emoji: agent.emoji,
            tokens: result.usage.total_tokens,
            cost: this._calculateCost(result.usage.total_tokens),
            timestamp: Date.now()
        };
    }

    /**
     * 格式化对话历史
     */
    _formatConversation(conversationHistory) {
        return conversationHistory
            .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
            .join('\n\n');
    }

    /**
     * 计算成本
     */
    _calculateCost(tokens) {
        // 假设每1000 tokens成本为0.01元
        return (tokens / 1000) * 0.01;
    }

    /**
     * 初始化章节模板
     */
    _initializeChapterTemplates() {
        return {
            executive_summary: `你是资深商业分析师。基于用户与AI的创意对话，生成商业计划书的【执行摘要】章节。\n\n输出要求：\n- 字数：800-1000字\n- 格式：Markdown\n- 结构：\n  1. 业务概述（2-3句话说明是什么）\n  2. 市场机会（目标市场规模、增长趋势）\n  3. 解决方案（核心价值主张）\n  4. 商业模式（如何赚钱）\n  5. 竞争优势（为什么是我们）\n  6. 融资需求（如果对话中提到）\n\n分析原则：\n- 基于对话中明确提到的信息\n- 如果信息不足，用"建议进一步调研"等表述\n- 客观中立，既要展示机会也要提示风险\n- 语言专业但易懂\n\n对话历史：\n{CONVERSATION}\n\n请生成该章节内容（纯Markdown格式）：`,

            market_analysis: `你是市场研究专家。基于用户创意对话，生成商业计划书的【市场分析】章节。\n\n输出要求：\n- 字数：1000-1200字\n- 格式：Markdown\n- 结构：\n  1. 市场规模分析（TAM/SAM/SOM）\n  2. 目标用户画像（人口统计、行为特征）\n  3. 用户痛点分析（核心问题是什么）\n  4. 市场趋势（增长动力、驱动因素）\n  5. 市场机会（为什么现在是好时机）\n\n分析要求：\n- 使用行业通用数据（如"中国XX市场规模约XXX亿"）\n- 标注数据来源或注明"参考行业数据"\n- 客观分析市场现状和未来潜力\n\n对话历史：\n{CONVERSATION}\n\n请生成该章节内容（纯Markdown格式）：`,

            solution: `你是产品战略顾问。基于用户创意对话，生成商业计划书的【解决方案】章节。\n\n输出要求：\n- 字数：900-1100字\n- 格式：Markdown\n- 结构：\n  1. 产品定位（一句话价值主张）\n  2. 核心功能（3-5个主要功能）\n  3. 技术方案（技术选型、架构亮点）\n  4. 差异化优势（与竞品的区别）\n  5. 产品路线图（MVP → 迭代方向）\n\n分析要求：\n- 清晰描述产品如何解决用户痛点\n- 技术方案要实际可行\n- 强调独特性和创新性\n\n对话历史：\n{CONVERSATION}\n\n请生成该章节内容（纯Markdown格式）：`,

            business_model: `你是商业模式设计专家。基于用户创意对话，生成商业计划书的【商业模式】章节。\n\n输出要求：\n- 字数：800-1000字\n- 格式：Markdown\n- 结构：\n  1. 收入模式（如何赚钱）\n  2. 定价策略（价格体系、定价依据）\n  3. 成本结构（主要成本项）\n  4. 盈利预测（何时盈亏平衡）\n  5. 规模化路径（如何扩大收入）\n\n分析要求：\n- 商业模式要清晰可行\n- 定价要合理且有竞争力\n- 成本估算要实际\n\n对话历史：\n{CONVERSATION}\n\n请生成该章节内容（纯Markdown格式）：`,

            competitive_landscape: `你是竞争分析专家。基于用户创意对话，生成商业计划书的【竞争格局】章节。\n\n输出要求：\n- 字数：900-1100字\n- 格式：Markdown\n- 结构：\n  1. 竞争对手分析（列举3-5个主要竞品）\n  2. 竞争优势对比（功能、价格、体验等）\n  3. 差异化策略（如何脱颖而出）\n  4. 进入壁垒（我们的护城河）\n  5. 竞争风险（可能的威胁）\n\n分析要求：\n- 客观评价竞品优劣\n- 清晰阐述差异化优势\n- 识别真实的竞争风险\n\n对话历史：\n{CONVERSATION}\n\n请生成该章节内容（纯Markdown格式）：`
        };
    }

    /**
     * 初始化章节代理信息
     */
    _initializeChapterAgents() {
        return {
            executive_summary: { name: '综合分析师', emoji: '🤖', estimatedTime: 30 },
            market_analysis: { name: '市场分析师', emoji: '📊', estimatedTime: 45 },
            solution: { name: '产品专家', emoji: '💡', estimatedTime: 40 },
            business_model: { name: '商业顾问', emoji: '💰', estimatedTime: 35 },
            competitive_landscape: { name: '竞争分析师', emoji: '⚔️', estimatedTime: 40 }
        };
    }
}

/**
 * 商业计划书应用服务
 * 协调领域对象和应用逻辑
 */
export class BusinessPlanApplicationService {
    constructor(businessPlanRepository) {
        this._useCase = new BusinessPlanUseCase(businessPlanRepository);
    }

    /**
     * 创建商业计划书
     */
    async createBusinessPlan(createDto) {
        return await this._useCase.createBusinessPlan(createDto);
    }

    /**
     * 生成单个章节
     */
    async generateChapter(businessPlanId, generateDto) {
        return await this._useCase.generateChapter(businessPlanId, generateDto);
    }

    /**
     * 批量生成章节
     */
    async generateBatchChapters(businessPlanId, generateBatchDto) {
        return await this._useCase.generateBatchChapters(businessPlanId, generateBatchDto);
    }

    /**
     * 完成商业计划书
     */
    async completeBusinessPlan(businessPlanId) {
        return await this._useCase.completeBusinessPlan(businessPlanId);
    }

    /**
     * 获取商业计划书
     */
    async getBusinessPlan(businessPlanId) {
        return await this._useCase.getBusinessPlan(businessPlanId);
    }

    /**
     * 获取项目的商业计划书
     */
    async getBusinessPlanByProject(projectId) {
        return await this._useCase.getBusinessPlanByProject(projectId);
    }

    /**
     * 获取用户的所有商业计划书
     */
    async getUserBusinessPlans(userId) {
        return await this._useCase.getUserBusinessPlans(userId);
    }

    /**
     * 获取可用章节列表
     */
    getAvailableChapters() {
        return this._useCase.getAvailableChapters();
    }
}
