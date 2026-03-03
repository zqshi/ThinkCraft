import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import promptLoader from '../../../utils/prompt-loader.js';

export class ReportAiService {
  static REPORT_MAX_ATTEMPTS = 4;

  async generateChatTitle(messages = []) {
    const list = Array.isArray(messages) ? messages : [];
    const normalized = list
      .filter(msg => msg && typeof msg.content === 'string')
      .map(msg => ({
        role: msg.role || msg.sender || 'user',
        content: String(msg.content).slice(0, 2000)
      }))
      .slice(-12);

    if (normalized.length === 0) {
      return '';
    }

    const userPrompt = [
      '请基于以下对话生成一个中文标题（不超过18个字）。',
      '要求：简洁、明确、不要标点、不要引号、不要"对话"这类词。',
      '',
      ...normalized.map(msg => `${msg.role === 'assistant' ? '助手' : '用户'}: ${msg.content}`)
    ].join('\n');

    const result = await callDeepSeekAPI(
      [{ role: 'user', content: userPrompt }],
      '你是标题生成助手，只输出标题文本。',
      {
        max_tokens: 64,
        temperature: 0.2,
        timeout: 20000
      }
    );

    const title = String(result?.content || '')
      .replace(/[\n\r]/g, ' ')
      .replace(/["'`]/g, '')
      .trim()
      .slice(0, 30);

    return title;
  }

  async generateInsightsReport(messages) {
    const conversationContext = messages
      .map(msg => {
        const role = msg.role === 'user' ? '用户' : 'AI助手';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    const promptTemplate = await promptLoader.load(
      'scene-1-dialogue/analysis-report/full-document'
    );
    const basePrompt = promptTemplate.replace('{CONVERSATION_HISTORY}', conversationContext);
    const systemPrompt = `${basePrompt}

## 输出JSON结构（必须严格匹配，禁止占位语）
\`\`\`json
{
  "initialIdea": "用户最初提出的创意原始表述",
  "coreDefinition": "经过对话后的核心定义（一句话概括）",
  "problem": "解决的根本问题",
  "solution": "提供的独特价值",
  "targetUser": "目标受益者",
  "chapters": {
    "chapter1": {
      "title": "创意定义与演化",
      "originalIdea": "原始创意表述",
      "evolution": "创意如何在对话中演变的说明"
    },
    "chapter2": {
      "title": "核心洞察与根本假设",
      "surfaceNeed": "表层需求描述",
      "deepMotivation": "深层动力分析",
      "assumptions": ["假设1", "假设2", "假设3"]
    },
    "chapter3": {
      "title": "边界条件与应用场景",
      "idealScenario": "理想应用场景描述",
      "limitations": ["限制1", "限制2", "限制3"],
      "prerequisites": {
        "technical": "技术基础要求",
        "resources": "资源要求",
        "partnerships": "合作基础要求"
      }
    },
    "chapter4": {
      "title": "可行性分析与关键挑战",
      "stages": [
        { "stage": "阶段1名称", "goal": "阶段目标", "tasks": "关键任务" },
        { "stage": "阶段2名称", "goal": "阶段目标", "tasks": "关键任务" }
      ],
      "biggestRisk": "最大单一风险点",
      "mitigation": "预防措施"
    },
    "chapter5": {
      "title": "思维盲点与待探索问题",
      "blindSpots": ["盲点1", "盲点2", "盲点3"],
      "keyQuestions": [
        {
          "category": "问题类别",
          "question": "具体问题",
          "validation": "验证方法",
          "why": "为什么重要（可选）"
        }
      ]
    },
    "chapter6": {
      "title": "结构化行动建议",
      "immediateActions": ["行动1", "行动2", "行动3"],
      "midtermPlan": {
        "userResearch": "用户研究计划（目标/方法/样本/周期/产出）",
        "marketResearch": "市场调研计划（目标/方法/对象/周期/产出）",
        "prototyping": "原型开发计划（目标/方法/对象/周期/产出）",
        "partnerships": "合作探索计划（目标/对象/方式/周期/产出）"
      },
      "extendedIdeas": ["延伸方向1", "延伸方向2", "延伸方向3"],
      "validationMethods": ["验证方法1", "验证方法2", "验证方法3"],
      "successMetrics": ["成功指标1", "成功指标2", "成功指标3"]
    }
  }
}
\`\`\`

## 质量约束
1. 禁止出现"待补充/暂无/空白/略/TBD/N/A"等占位语
2. 所有数组至少 3 条，stages 至少 2 个阶段
3. 中期探索方向必须具体到目标/方法/对象或样本/周期/产出
4. 概念延伸提示必须给出关联理由与验证切入点（写入 extendedIdeas 句子中）
5. 必须输出 JSON，禁止附加说明文本
6. 每个字符串字段尽量简洁（建议<=120字），避免冗长描述导致输出截断`;

    try {
      const reportData = await this.generateStructuredReportJson(systemPrompt);

      if (!reportData || !reportData.chapters) {
        throw new Error('AI返回的报告数据缺少chapters字段');
      }

      const requiredChapters = [
        'chapter1',
        'chapter2',
        'chapter3',
        'chapter4',
        'chapter5',
        'chapter6'
      ];
      for (const chapter of requiredChapters) {
        if (!reportData.chapters[chapter]) {
          throw new Error(`报告缺少必需章节: ${chapter}`);
        }
      }

      return reportData;
    } catch (error) {
      console.error('[ReportAiService] 生成创意分析报告失败:', error);
      throw new Error(
        `报告生成失败: ${error.message}。请检查: 1) 对话内容是否足够 2) AI服务是否正常 3) 网络连接是否稳定`
      );
    }
  }

  async generateStructuredReportJson(basePrompt) {
    let lastError = null;
    let prompt = basePrompt;
    let tokenBudget = 4000;

    for (let attempt = 1; attempt <= ReportAiService.REPORT_MAX_ATTEMPTS; attempt++) {
      const response = await callDeepSeekAPI([{ role: 'user', content: prompt }], null, {
        temperature: attempt === 1 ? 0.7 : 0.35,
        max_tokens: tokenBudget,
        timeout: 120000,
        response_format: { type: 'json_object' }
      });

      const finishReason = String(response?.finish_reason || '').toLowerCase();
      const rawContent = String(response?.content || '');

      if (finishReason === 'length') {
        lastError = new Error(`模型输出被截断（attempt=${attempt}, finish_reason=length）`);
        prompt = this.buildRegenerationPrompt(basePrompt, rawContent, lastError.message);
        tokenBudget = 5000;
        continue;
      }

      try {
        const parsed = this.parseJsonResponse(rawContent);
        if (!this.isLowQuality(parsed)) {
          return parsed;
        }
        lastError = new Error(`模型输出质量不足（attempt=${attempt}）`);
      } catch (parseError) {
        lastError = parseError;
      }

      try {
        const repaired = await this.repairJsonWithModel(rawContent, lastError);
        if (!this.isLowQuality(repaired)) {
          return repaired;
        }
        lastError = new Error(`修复后JSON质量不足（attempt=${attempt}）`);
      } catch (repairError) {
        lastError = repairError;
      }

      prompt = this.buildRegenerationPrompt(
        basePrompt,
        rawContent,
        lastError?.message || 'unknown'
      );
      tokenBudget = 5000;
    }

    throw new Error(lastError?.message || '结构化JSON生成失败');
  }

  buildRegenerationPrompt(basePrompt, previousContent, reason) {
    const snippet = String(previousContent || '').slice(0, 8000);
    return `${basePrompt}

上一次输出未通过校验，原因：${reason}

请重新生成完整 JSON，强约束如下：
1) 只输出 JSON 对象，不要解释
2) 严格遵循既定字段结构，不得缺字段
3) 文本精炼：每个字符串建议不超过 80-120 字
4) 数组控制在 3-5 条，避免冗长
5) 禁止 markdown 代码块标记

以下是上一次输出片段（仅供参考，勿原样复制）：
${snippet}`;
  }

  parseJsonResponse(content) {
    const raw = String(content || '').trim();
    const text = this.extractJsonBlock(raw);

    try {
      return JSON.parse(text);
    } catch (firstError) {
      const normalized = this.normalizeJsonLikeText(text);
      try {
        return JSON.parse(normalized);
      } catch (secondError) {
        throw new Error(`${firstError.message}; normalize failed: ${secondError.message}`);
      }
    }
  }

  async repairJsonWithModel(rawContent, reason) {
    const rawText = String(rawContent || '').slice(0, 18000);
    const repairPrompt = [
      '你是 JSON 修复器。',
      '将下面文本修复为严格 JSON：',
      '- 只能输出 JSON 对象，不要解释',
      '- 保留原字段语义和层级',
      '- 补全缺失逗号/引号/括号',
      '',
      '待修复内容：',
      rawText,
      '',
      `解析错误参考：${String(reason?.message || reason || 'unknown parse error')}`
    ].join('\n');

    const repaired = await callDeepSeekAPI([{ role: 'user', content: repairPrompt }], null, {
      temperature: 0.0,
      max_tokens: 4000,
      timeout: 90000,
      response_format: { type: 'json_object' }
    });

    return this.parseJsonResponse(repaired?.content);
  }

  extractJsonBlock(rawText) {
    let text = String(rawText || '').trim();
    if (!text) {
      return text;
    }

    if (text.startsWith('```')) {
      text = text
        .replace(/^```[a-zA-Z]*\s*/i, '')
        .replace(/```$/, '')
        .trim();
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (
      firstBrace !== -1 &&
      lastBrace !== -1 &&
      (firstBrace !== 0 || lastBrace !== text.length - 1)
    ) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    return text;
  }

  normalizeJsonLikeText(rawText) {
    let text = String(rawText || '');
    if (!text) {
      return text;
    }

    // 常见 AI 输出容错：中文引号/全角标点/零宽字符/尾逗号
    text = text
      .replace(/\uFEFF/g, '')
      .replace(/[\u200B-\u200D\u2060]/g, '')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/：/g, ':')
      .replace(/，/g, ',')
      .replace(/；/g, ';');

    // 如果外层仍有冗余文本，再次提取 JSON 主体
    text = this.extractJsonBlock(text);

    // 去掉对象/数组尾部多余逗号，降低解析失败概率
    text = text.replace(/,\s*([}\]])/g, '$1');

    return text.trim();
  }

  isLowQuality(data) {
    const placeholderPattern = /(待补充|暂无|空白|略|tbd|n\/a)/i;
    const hasPlaceholder = value => typeof value === 'string' && placeholderPattern.test(value);
    const isEmptyText = value =>
      value === undefined || value === null || String(value).trim() === '';
    const hasInvalidArray = arr =>
      !Array.isArray(arr) ||
      arr.length < 3 ||
      arr.some(item => isEmptyText(item) || hasPlaceholder(item));
    const hasInvalidMidterm = plan => {
      if (!plan || typeof plan !== 'object') {
        return true;
      }
      return ['userResearch', 'marketResearch', 'prototyping', 'partnerships'].some(
        key => isEmptyText(plan[key]) || hasPlaceholder(plan[key])
      );
    };
    const hasInvalidQuestions = list => {
      if (!Array.isArray(list) || list.length < 3) {
        return true;
      }
      return list.some(
        item =>
          isEmptyText(item?.question) ||
          isEmptyText(item?.validation) ||
          hasPlaceholder(item?.question) ||
          hasPlaceholder(item?.validation)
      );
    };

    const chapter6 = data?.chapters?.chapter6 || {};
    const chapter5 = data?.chapters?.chapter5 || {};
    return (
      hasInvalidArray(chapter6.immediateActions) ||
      hasInvalidArray(chapter6.extendedIdeas) ||
      hasInvalidArray(chapter6.validationMethods) ||
      hasInvalidArray(chapter6.successMetrics) ||
      hasInvalidMidterm(chapter6.midtermPlan) ||
      hasInvalidArray(chapter5.blindSpots) ||
      hasInvalidQuestions(chapter5.keyQuestions)
    );
  }
}
