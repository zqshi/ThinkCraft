/**
 * Report 控制器
 */
import { ReportUseCase } from '../application/report.use-case.js';
import { ReportInMemoryRepository } from '../infrastructure/report-inmemory.repository.js';
import { ReportGenerationService } from '../application/report-generation.service.js';
import {
  CreateReportRequestDto,
  AddReportSectionRequestDto,
  GenerateReportRequestDto
} from '../application/report.dto.js';
import { callDeepSeekAPI } from '../../../../config/deepseek.js';
import { AnalysisReportModel } from '../infrastructure/analysis-report.model.js';

export class ReportController {
  constructor() {
    this.reportUseCase = new ReportUseCase(
      new ReportInMemoryRepository(),
      new ReportGenerationService()
    );
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
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 生成报告
   */
  async generateReport(req, res) {
    try {
      // 兼容旧API：如果传递了 messages 参数，使用简化的报告生成逻辑
      if (req.body.messages && !req.params.reportId) {
        // 创意分析报告生成
        const messages = req.body.messages;
        const reportKey = req.body.reportKey;
        const force = Boolean(req.body.force);

        if (reportKey && !force) {
          const existing = await AnalysisReportModel.findOne({ reportKey }).lean();
          if (existing?.report) {
            return res.json({
              code: 0,
              data: {
                report: existing.report,
                cached: true
              }
            });
          }
        }

        // 调用AI生成创意分析报告
        const report = await this._generateInsightsReport(messages);

        if (reportKey) {
          await AnalysisReportModel.findOneAndUpdate(
            { reportKey },
            { report, updatedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        }

        return res.json({
          code: 0,
          data: {
            report: report,
            cached: false
          }
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
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 归档报告
   */
  async archiveReport(req, res) {
    try {
      const result = await this.reportUseCase.archiveReport(req.params.reportId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取报告详情
   */
  async getReport(req, res) {
    try {
      const result = await this.reportUseCase.getReport(req.params.reportId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
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
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 删除报告
   */
  async deleteReport(req, res) {
    try {
      await this.reportUseCase.deleteReport(req.params.reportId);
      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取报告导出格式
   */
  async getReportExportFormats(req, res) {
    try {
      const result = await this.reportUseCase.getReportExportFormats(req.params.reportId);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 获取报告模板
   */
  async getReportTemplates(req, res) {
    try {
      const reportType = req.params.reportType;
      const result = await this.reportUseCase.getReportTemplates(reportType);
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
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

    // 构建AI提示词
    const systemPrompt = `你是一位顶尖的创意分析专家，擅长从对话中提炼核心洞察、识别假设、评估可行性，并给出具有可执行性的下一步建议。

请基于以下对话历史，生成一份结构化的创意分析报告。

## 对话历史
${conversationContext}

## 报告要求

请严格按照以下JSON结构返回报告数据：

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
        {
          "stage": "阶段1名称",
          "goal": "阶段目标",
          "tasks": "关键任务"
        },
        {
          "stage": "阶段2名称",
          "goal": "阶段目标",
          "tasks": "关键任务"
        }
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
          "why": "为什么重要"
        }
      ]
    },
    "chapter6": {
      "title": "下一步行动建议",
      "immediateActions": ["行动1", "行动2", "行动3"],
      "validationMethods": ["验证方法1", "验证方法2"],
      "successMetrics": ["成功指标1", "成功指标2"]
    }
  }
}
\`\`\`

## 注意事项
1. 必须严格按照上述JSON结构返回
2. 所有分析必须基于对话内容，不要编造与对话明显冲突的事实
3. 允许在“对话信息不足”时做合理推断，但必须标注为“待验证假设”，并给出验证方式
4. 每个章节都必须提供建设性、可执行的内容，避免空泛描述
5. 行动建议必须具体可执行，包含动词、对象、时间范围、验证方法与成功指标
6. arrays 字段至少给出 3 条，stages 至少 2 个阶段
7. 输出语言专业、客观、建设性，不要返回任何JSON之外的内容`;

    try {
      // 调用DeepSeek API生成报告
      // callDeepSeekAPI 期望 (messages, systemPrompt, options)
      const response = await callDeepSeekAPI(
        [{ role: 'user', content: systemPrompt }],
        null,
        {
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
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

      const reportData = JSON.parse(jsonText);

      return reportData;
    } catch (error) {
      console.error('[ReportController] 生成创意分析报告失败:', error);
      throw new Error(`报告生成失败: ${error.message}`);
    }
  }
}

export default ReportController;
