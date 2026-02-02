/**
 * Report 控制器
 */
import { ReportUseCase } from '../application/report.use-case.js';
import { getRepository } from '../../../shared/infrastructure/repository.factory.js';
import { ReportGenerationService } from '../application/report-generation.service.js';
import {
  CreateReportRequestDto,
  AddReportSectionRequestDto,
  GenerateReportRequestDto
} from '../application/report.dto.js';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import { AnalysisReportModel } from '../infrastructure/analysis-report.model.js';
import { mongoManager } from '../../../../config/database.js';
import promptLoader from '../../../utils/prompt-loader.js';
import { ok, fail } from '../../../../middleware/response.js';

export class ReportController {
  constructor() {
    this.reportUseCase = new ReportUseCase(getRepository('report'), new ReportGenerationService());
  }

  /**
   * 创建报告
   */
  async createReport(req, res) {
    try {
      const requestDto = new CreateReportRequestDto({
        projectId: req.body.projectId,
        type: req.body.type,
        title: req.body.title,
        description: req.body.description,
        metadata: req.body.metadata
      });

      const result = await this.reportUseCase.createReport(requestDto);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 添加报告章节
   */
  async addSection(req, res) {
    try {
      const requestDto = new AddReportSectionRequestDto({
        title: req.body.title,
        content: req.body.content,
        type: req.body.type,
        order: req.body.order,
        metadata: req.body.metadata
      });

      const result = await this.reportUseCase.addSection(req.params.reportId, requestDto);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 更新报告章节
   */
  async updateSection(req, res) {
    try {
      const updates = {};
      if (req.body.title !== undefined) {
        updates.title = req.body.title;
      }
      if (req.body.content !== undefined) {
        updates.content = req.body.content;
      }
      if (req.body.order !== undefined) {
        updates.order = req.body.order;
      }
      if (req.body.metadata !== undefined) {
        updates.metadata = req.body.metadata;
      }

      const result = await this.reportUseCase.updateSection(
        req.params.reportId,
        req.params.sectionId,
        updates
      );
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 删除报告章节
   */
  async removeSection(req, res) {
    try {
      const result = await this.reportUseCase.removeSection(
        req.params.reportId,
        req.params.sectionId
      );
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 生成报告
   */
  async generateReport(req, res) {
    try {
      if (req.body?.messages && !Array.isArray(req.body.messages)) {
        throw new Error('messages 必须是数组');
      }
      if (Array.isArray(req.body?.messages) && req.body.messages.length === 0) {
        throw new Error('messages 不能为空');
      }
      // 兼容旧API：如果传递了 messages 参数，使用简化的报告生成逻辑
      if (req.body.messages && !req.params.reportId) {
        // 创意分析报告生成
        const messages = req.body.messages;
        const reportKey = req.body.reportKey;
        const force = Boolean(req.body.force);
        const cacheOnly = Boolean(req.body.cacheOnly);
        const dbType = process.env.DB_TYPE || 'memory';
        const canUseMongo = dbType === 'mongodb' && mongoManager.isConnected?.();

        if (reportKey && !force && canUseMongo) {
          const existing = await AnalysisReportModel.findOne({ reportKey }).lean();
          if (existing?.report) {
            return ok(res, {
              report: existing.report,
              cached: true
            });
          }
          if (cacheOnly) {
            return fail(res, '缓存未命中', 404);
          }
        } else if (cacheOnly) {
          return fail(res, '缓存不可用', 400);
        }

        // 调用AI生成创意分析报告
        const report = await this._generateInsightsReport(messages);

        if (reportKey && canUseMongo) {
          await AnalysisReportModel.findOneAndUpdate(
            { reportKey },
            { report, updatedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }

        return ok(res, {
          report: report,
          cached: false
        });
      }

      // 标准 DDD 流程
      const requestDto = new GenerateReportRequestDto({
        reportId: req.params.reportId,
        template: req.body.template,
        dataSource: req.body.dataSource,
        options: req.body.options
      });

      const result = await this.reportUseCase.generateReport(requestDto);
      ok(res, result);
    } catch (error) {
      console.error('[ReportController] generateReport failed:', error?.message || error);
      if (error?.stack) {
        console.error(error.stack);
      }
      fail(res, error.message, 400);
    }
  }

  /**
   * 更新报告
   */
  async updateReport(req, res) {
    try {
      const updates = {};
      if (req.body.title !== undefined) {
        updates.title = req.body.title;
      }
      if (req.body.description !== undefined) {
        updates.description = req.body.description;
      }
      if (req.body.metadata !== undefined) {
        updates.metadata = req.body.metadata;
      }

      const result = await this.reportUseCase.updateReport(req.params.reportId, updates);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 归档报告
   */
  async archiveReport(req, res) {
    try {
      const result = await this.reportUseCase.archiveReport(req.params.reportId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 获取报告详情
   */
  async getReport(req, res) {
    try {
      const result = await this.reportUseCase.getReport(req.params.reportId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 404);
    }
  }

  /**
   * 获取报告列表
   */
  async getReports(req, res) {
    try {
      const filters = {};
      if (req.query.projectId) {
        filters.projectId = req.query.projectId;
      }
      if (req.query.type) {
        filters.type = req.query.type;
      }
      if (req.query.status) {
        filters.status = req.query.status;
      }

      const result = await this.reportUseCase.getReports(filters);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 删除报告
   */
  async deleteReport(req, res) {
    try {
      await this.reportUseCase.deleteReport(req.params.reportId);
      ok(res, null, 'Report deleted successfully');
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 获取报告导出格式
   */
  async getReportExportFormats(req, res) {
    try {
      const result = await this.reportUseCase.getReportExportFormats(req.params.reportId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 获取报告模板
   */
  async getReportTemplates(req, res) {
    try {
      const reportType = req.params.reportType;
      const result = await this.reportUseCase.getReportTemplates(reportType);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  /**
   * 生成创意分析报告（私有方法）
   * 调用AI生成符合前端期望的6章节结构报告
   */
  async _generateInsightsReport(messages) {
    // 构建对话历史上下文
    const conversationContext = messages
      .map(msg => {
        const role = msg.role === 'user' ? '用户' : 'AI助手';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');

    const promptTemplate = await promptLoader.load('scene-1-dialogue/analysis-report/full-document');
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
5. 必须输出 JSON，禁止附加说明文本`;

    try {
      // 调用DeepSeek API生成报告
      // callDeepSeekAPI 期望 (messages, systemPrompt, options)
      const response = await callDeepSeekAPI(
        [{ role: 'user', content: systemPrompt }],
        null,
        {
          temperature: 0.7,
          max_tokens: 4000,
          timeout: 120000
        }
      );

      // 解析AI返回的JSON（兼容代码块包装）
      const rawContent = String(response.content || '').trim();
      let jsonText = rawContent;
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```[a-zA-Z]*\s*/i, '').replace(/```$/, '').trim();
      }
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && (firstBrace !== 0 || lastBrace !== jsonText.length - 1)) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }

      let reportData = JSON.parse(jsonText);

      const placeholderPattern = /(待补充|暂无|空白|略|tbd|n\/a)/i;
      const hasPlaceholder = value => typeof value === 'string' && placeholderPattern.test(value);
      const isEmptyText = value => value === undefined || value === null || String(value).trim() === '';
      const hasInvalidArray = arr => !Array.isArray(arr) || arr.length < 3 || arr.some(item => isEmptyText(item) || hasPlaceholder(item));
      const hasInvalidMidterm = plan => {
        if (!plan || typeof plan !== 'object') return true;
        return ['userResearch', 'marketResearch', 'prototyping', 'partnerships'].some(
          key => isEmptyText(plan[key]) || hasPlaceholder(plan[key])
        );
      };
      const hasInvalidQuestions = list => {
        if (!Array.isArray(list) || list.length < 3) return true;
        return list.some(item => isEmptyText(item?.question) || isEmptyText(item?.validation) || hasPlaceholder(item?.question) || hasPlaceholder(item?.validation));
      };
      const isLowQuality = data => {
        const ch6 = data?.chapters?.chapter6 || {};
        const ch5 = data?.chapters?.chapter5 || {};
        return (
          hasInvalidArray(ch6.immediateActions) ||
          hasInvalidArray(ch6.extendedIdeas) ||
          hasInvalidArray(ch6.validationMethods) ||
          hasInvalidArray(ch6.successMetrics) ||
          hasInvalidMidterm(ch6.midtermPlan) ||
          hasInvalidArray(ch5.blindSpots) ||
          hasInvalidQuestions(ch5.keyQuestions)
        );
      };

      if (isLowQuality(reportData)) {
        const repairPrompt = `${systemPrompt}

你的上一次输出包含占位语或空内容，请重新生成完整JSON，确保所有字段充实且可执行。禁止占位语。仅输出JSON。`;

        const repairResponse = await callDeepSeekAPI(
          [{ role: 'user', content: repairPrompt }],
          null,
          {
            temperature: 0.6,
            max_tokens: 4000,
            timeout: 120000
          }
        );

        const repairRaw = String(repairResponse.content || '').trim();
        let repairText = repairRaw;
        if (repairText.startsWith('```')) {
          repairText = repairText.replace(/^```[a-zA-Z]*\s*/i, '').replace(/```$/, '').trim();
        }
        const repairFirst = repairText.indexOf('{');
        const repairLast = repairText.lastIndexOf('}');
        if (repairFirst !== -1 && repairLast !== -1 && (repairFirst !== 0 || repairLast !== repairText.length - 1)) {
          repairText = repairText.slice(repairFirst, repairLast + 1);
        }
        reportData = JSON.parse(repairText);
      }

      // 在返回前验证数据完整性
      if (!reportData || !reportData.chapters) {
        throw new Error('AI返回的报告数据缺少chapters字段');
      }

      // 验证必需的章节
      const requiredChapters = ['chapter1', 'chapter2', 'chapter3', 'chapter4', 'chapter5', 'chapter6'];
      for (const ch of requiredChapters) {
        if (!reportData.chapters[ch]) {
          throw new Error(`报告缺少必需章节: ${ch}`);
        }
      }

      return reportData;
    } catch (error) {
      console.error('[ReportController] 生成创意分析报告失败:', error);
      throw new Error(`报告生成失败: ${error.message}。请检查: 1) 对话内容是否足够 2) AI服务是否正常 3) 网络连接是否稳定`);
    }
  }
}

export default ReportController;
