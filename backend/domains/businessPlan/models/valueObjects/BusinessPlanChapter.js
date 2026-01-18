/**
 * 商业计划书章节定义（值对象）
 * 包含所有章节的提示词模板和元信息
 */

/**
 * 章节提示词模板
 */
export const CHAPTER_PROMPTS = {
  executive_summary: `你是资深商业分析师。基于用户与AI的创意对话，生成商业计划书的【执行摘要】章节。

输出要求：
- 字数：800-1000字
- 格式：Markdown
- 结构：
  1. 业务概述（2-3句话说明是什么）
  2. 市场机会（目标市场规模、增长趋势）
  3. 解决方案（核心价值主张）
  4. 商业模式（如何赚钱）
  5. 竞争优势（为什么是我们）
  6. 融资需求（如果对话中提到）

分析原则：
- 基于对话中明确提到的信息
- 如果信息不足，用"建议进一步调研"等表述
- 客观中立，既要展示机会也要提示风险
- 语言专业但易懂

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  market_analysis: `你是市场研究专家。基于用户创意对话，生成商业计划书的【市场分析】章节。

输出要求：
- 字数：1000-1200字
- 格式：Markdown
- 结构：
  1. 市场规模分析（TAM/SAM/SOM）
  2. 目标用户画像（人口统计、行为特征）
  3. 用户痛点分析（核心问题是什么）
  4. 市场趋势（增长动力、驱动因素）
  5. 市场机会（为什么现在是好时机）

分析要求：
- 使用行业通用数据（如"中国XX市场规模约XXX亿"）
- 标注数据来源或注明"参考行业数据"
- 客观分析市场现状和未来潜力

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  solution: `你是产品战略顾问。基于用户创意对话，生成商业计划书的【解决方案】章节。

输出要求：
- 字数：900-1100字
- 格式：Markdown
- 结构：
  1. 产品定位（一句话价值主张）
  2. 核心功能（3-5个主要功能）
  3. 技术方案（技术选型、架构亮点）
  4. 差异化优势（与竞品的区别）
  5. 产品路线图（MVP → 迭代方向）

分析要求：
- 清晰描述产品如何解决用户痛点
- 技术方案要实际可行
- 强调独特性和创新性

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  business_model: `你是商业模式设计专家。基于用户创意对话，生成商业计划书的【商业模式】章节。

输出要求：
- 字数：800-1000字
- 格式：Markdown
- 结构：
  1. 收入模式（如何赚钱）
  2. 定价策略（价格体系、定价依据）
  3. 成本结构（主要成本项）
  4. 盈利预测（何时盈亏平衡）
  5. 规模化路径（如何扩大收入）

分析要求：
- 商业模式要清晰可行
- 定价要合理且有竞争力
- 成本估算要实际

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  competitive_landscape: `你是竞争分析专家。基于用户创意对话，生成商业计划书的【竞争格局】章节。

输出要求：
- 字数：900-1100字
- 格式：Markdown
- 结构：
  1. 竞争对手分析（列举3-5个主要竞品）
  2. 竞争优势对比（功能、价格、体验等）
  3. 差异化策略（如何脱颖而出）
  4. 进入壁垒（我们的护城河）
  5. 竞争风险（可能的威胁）

分析要求：
- 客观评价竞品优劣
- 清晰阐述差异化优势
- 识别真实的竞争风险

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  marketing_strategy: `你是营销策略专家。基于用户创意对话，生成商业计划书的【市场策略】章节。

输出要求：
- 字数：900-1100字
- 格式：Markdown
- 结构：
  1. 目标客户获取（如何找到第一批用户）
  2. 营销渠道（线上/线下渠道）
  3. 品牌定位（品牌调性、传播策略）
  4. 增长策略（如何实现用户增长）
  5. 营销预算（各渠道预算分配）

分析要求：
- 营销策略要具体可执行
- 渠道选择要符合目标用户特征
- 预算分配要合理

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  team_structure: `你是组织架构顾问。基于用户创意对话，生成商业计划书的【团队架构】章节。

输出要求：
- 字数：700-900字
- 格式：Markdown
- 结构：
  1. 核心团队（创始团队背景）
  2. 组织架构（部门设置、职责分工）
  3. 人才需求（关键岗位、招聘计划）
  4. 股权激励（期权池、激励机制）
  5. 团队文化（价值观、工作方式）

分析要求：
- 团队背景要与业务匹配
- 组织架构要适应当前阶段
- 人才需求要具体

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  financial_projection: `你是财务分析专家。基于用户创意对话，生成商业计划书的【财务预测】章节。

输出要求：
- 字数：1000-1200字
- 格式：Markdown
- 结构：
  1. 收入预测（未来3年收入预估）
  2. 成本预算（固定成本、变动成本）
  3. 现金流分析（月度现金流规划）
  4. 盈亏平衡点（何时实现盈亏平衡）
  5. 融资需求（需要多少资金、如何使用）

分析要求：
- 数据要合理可信
- 假设要明确说明
- 提供乐观/中性/悲观三种情景

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  risk_assessment: `你是风险管理专家。基于用户创意对话，生成商业计划书的【风险评估】章节。

输出要求：
- 字数：800-1000字
- 格式：Markdown
- 结构：
  1. 市场风险（市场需求变化、竞争加剧）
  2. 技术风险（技术实现难度、替代技术）
  3. 运营风险（团队、供应链、合规）
  4. 财务风险（现金流、融资风险）
  5. 应对策略（每种风险的缓解措施）

分析要求：
- 识别真实存在的风险
- 不回避问题，客观评估
- 提供可行的应对方案

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  implementation_plan: `你是项目管理专家。基于用户创意对话，生成商业计划书的【实施计划】章节。

输出要求：
- 字数：900-1100字
- 格式：Markdown
- 结构：
  1. 里程碑规划（6个月、1年、2年目标）
  2. 产品开发计划（MVP开发、迭代计划）
  3. 市场推广计划（各阶段营销重点）
  4. 团队扩张计划（人员招聘时间表）
  5. 关键指标（KPI设定、监控机制）

分析要求：
- 计划要具体可执行
- 时间节点要合理
- KPI要可量化

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`,

  appendix: `你是商业文档撰写专家。基于用户创意对话，生成商业计划书的【附录】章节。

输出要求：
- 字数：600-800字
- 格式：Markdown
- 结构：
  1. 术语表（行业专业术语解释）
  2. 参考资料（数据来源、研究报告）
  3. 补充材料（产品截图、用户反馈）
  4. 联系方式（团队联系方式）

分析要求：
- 术语解释要清晰易懂
- 参考资料要可信
- 补充材料要有价值

对话历史：
{CONVERSATION}

请生成该章节内容（纯Markdown格式）：`
};

/**
 * 章节Agent信息
 */
export const CHAPTER_AGENTS = {
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
 * 章节中文名称映射
 */
export const CHAPTER_NAMES = {
  executive_summary: '执行摘要',
  market_analysis: '市场分析',
  solution: '解决方案',
  business_model: '商业模式',
  competitive_landscape: '竞争格局',
  marketing_strategy: '市场策略',
  team_structure: '团队架构',
  financial_projection: '财务预测',
  risk_assessment: '风险评估',
  implementation_plan: '实施计划',
  appendix: '附录'
};

/**
 * BusinessPlanChapter 值对象工具类
 */
export class BusinessPlanChapter {
  /**
   * 获取所有章节ID列表
   * @returns {Array<string>}
   */
  static getAllChapterIds() {
    return Object.keys(CHAPTER_PROMPTS);
  }

  /**
   * 获取所有章节信息
   * @returns {Array<Object>}
   */
  static getAllChapters() {
    return this.getAllChapterIds().map(id => ({
      id,
      name: CHAPTER_NAMES[id],
      ...CHAPTER_AGENTS[id]
    }));
  }

  /**
   * 根据ID获取章节信息
   * @param {string} chapterId
   * @returns {Object|null}
   */
  static getChapterById(chapterId) {
    if (!CHAPTER_PROMPTS[chapterId]) {
      return null;
    }

    return {
      id: chapterId,
      name: CHAPTER_NAMES[chapterId],
      ...CHAPTER_AGENTS[chapterId],
      prompt: CHAPTER_PROMPTS[chapterId]
    };
  }

  /**
   * 验证章节ID是否有效
   * @param {string} chapterId
   * @returns {boolean}
   */
  static isValidChapterId(chapterId) {
    return !!CHAPTER_PROMPTS[chapterId];
  }

  /**
   * 获取章节提示词模板
   * @param {string} chapterId
   * @returns {string|null}
   */
  static getPromptTemplate(chapterId) {
    return CHAPTER_PROMPTS[chapterId] || null;
  }

  /**
   * 获取章节Agent信息
   * @param {string} chapterId
   * @returns {Object|null}
   */
  static getAgentInfo(chapterId) {
    return CHAPTER_AGENTS[chapterId] || null;
  }

  /**
   * 计算预估总时间
   * @param {Array<string>} chapterIds
   * @returns {number} 总预估时间（秒）
   */
  static calculateEstimatedTime(chapterIds) {
    return chapterIds.reduce((total, id) => {
      const agent = CHAPTER_AGENTS[id];
      return total + (agent ? agent.estimatedTime : 0);
    }, 0);
  }

  /**
   * 按类别分组章节（示例分类）
   * @returns {Object}
   */
  static groupByCategory() {
    return {
      core: ['executive_summary', 'market_analysis', 'solution'],
      business: ['business_model', 'competitive_landscape', 'marketing_strategy'],
      operations: ['team_structure', 'financial_projection', 'risk_assessment'],
      other: ['implementation_plan', 'appendix']
    };
  }

  /**
   * 获取推荐的生成顺序
   * @returns {Array<string>}
   */
  static getRecommendedOrder() {
    return [
      'market_analysis',
      'solution',
      'business_model',
      'competitive_landscape',
      'marketing_strategy',
      'team_structure',
      'financial_projection',
      'risk_assessment',
      'implementation_plan',
      'executive_summary', // 最后生成，因为需要综合前面的信息
      'appendix'
    ];
  }
}

export default BusinessPlanChapter;
