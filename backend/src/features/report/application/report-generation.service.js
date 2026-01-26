/**
 * Report生成服务
 * 处理报告的实际生成逻辑
 */
import { callDeepSeekAPI } from '../../../../../config/deepseek.js';
import { ReportType } from '../domain/value-objects/report-type.vo.js';

export class ReportGenerationService {
  constructor() {
    this.reportPrompts = {
      [ReportType.BUSINESS_PLAN]: `你是一个专业的商业顾问。基于以下对话内容，生成一份完整的商业计划书报告。

报告要求：
1. 包含执行摘要、市场分析、产品描述、商业模式、运营计划、财务预测等标准章节
2. 数据准确，逻辑清晰，有说服力
3. 语言专业但不失可读性
4. 每个章节都要有具体的内容和建议

请生成结构化的报告内容，以JSON格式返回：
{
  "sections": [
    {
      "title": "章节标题",
      "content": "章节内容",
      "type": "text",
      "order": 1
    }
  ]
}`,

      [ReportType.PROJECT_SUMMARY]: `你是一个项目管理专家。基于以下对话内容，生成一份项目总结报告。

报告要求：
1. 包含项目概述、主要成果、经验教训、改进建议
2. 突出项目的价值和影响
3. 提供具体的数据和指标（如适用）
4. 为未来项目提供可借鉴的经验

请生成结构化的报告内容，以JSON格式返回。`,

      [ReportType.PROGRESS_REPORT]: `你是一个项目跟踪专家。基于以下对话内容，生成一份进度报告。

报告要求：
1. 包含当前进展、已完成工作、待完成工作、风险与挑战
2. 使用清晰的里程碑和完成百分比
3. 突出关键成就和待解决问题
4. 提供下一步行动计划

请生成结构化的报告内容，以JSON格式返回。`,

      [ReportType.ANALYSIS_REPORT]: `你是一个数据分析专家。基于以下对话内容，生成一份分析报告。

报告要求：
1. 包含问题定义、分析方法、主要发现、结论建议
2. 使用数据驱动的分析逻辑
3. 提供清晰的结论和可执行的建议
4. 逻辑严谨，论证充分

请生成结构化的报告内容，以JSON格式返回。`
    };
  }

  /**
   * 生成报告
   */
  async generateReport(report, dataSource, options = {}) {
    const prompt = this.buildPrompt(report, dataSource, options);

    try {
      // 调用AI API生成报告内容
      const response = await callDeepSeekAPI(prompt, {
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      // 解析生成的报告内容
      const reportData = JSON.parse(response.content);

      // 验证报告结构
      this.validateReportData(reportData);

      // 将内容转换为报告章节
      const sections = this.convertToSections(reportData.sections || []);

      return sections;
    } catch (error) {
      console.error('Report generation failed:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * 构建提示词
   */
  buildPrompt(report, dataSource, options) {
    const basePrompt =
      this.reportPrompts[report.type.value] || this.reportPrompts[ReportType.CUSTOM_REPORT];

    let dataContext = '';

    // 根据数据源类型构建上下文
    if (dataSource.type === 'conversation') {
      dataContext = this.buildConversationContext(dataSource.messages);
    } else if (dataSource.type === 'project_data') {
      dataContext = this.buildProjectDataContext(dataSource.data);
    } else if (dataSource.type === 'mixed') {
      dataContext = this.buildMixedContext(dataSource);
    }

    return `${basePrompt}

=== 数据上下文 ===
${dataContext}

=== 报告要求 ===
标题：${report.title}
类型：${report.type.getDisplayName()}${
  report.description
    ? `
描述：${report.description}`
    : ''
}

=== 额外选项 ===
${JSON.stringify(options, null, 2)}

请严格按照JSON格式返回，不要包含其他解释内容。`;
  }

  /**
   * 构建对话上下文
   */
  buildConversationContext(messages) {
    return messages
      .map(msg => {
        const role = msg.role === 'user' ? '用户' : 'AI助手';
        return `${role}: ${msg.content}`;
      })
      .join('\n\n');
  }

  /**
   * 构建项目数据上下文
   */
  buildProjectDataContext(data) {
    return JSON.stringify(data, null, 2);
  }

  /**
   * 构建混合上下文
   */
  buildMixedContext(dataSource) {
    let context = '';

    if (dataSource.conversation) {
      context += '对话历史：\n' + this.buildConversationContext(dataSource.conversation) + '\n\n';
    }

    if (dataSource.projectData) {
      context += '项目数据：\n' + this.buildProjectDataContext(dataSource.projectData) + '\n\n';
    }

    if (dataSource.additionalContext) {
      context += '额外上下文：\n' + JSON.stringify(dataSource.additionalContext, null, 2);
    }

    return context;
  }

  /**
   * 验证报告数据
   */
  validateReportData(reportData) {
    if (!reportData.sections || !Array.isArray(reportData.sections)) {
      throw new Error('Report data must contain a sections array');
    }

    reportData.sections.forEach((section, index) => {
      if (!section.title || !section.content) {
        throw new Error(`Section at index ${index} must have title and content`);
      }

      if (typeof section.order !== 'number') {
        section.order = index + 1;
      }
    });
  }

  /**
   * 转换为报告章节实体
   */
  convertToSections(sectionsData) {
    return sectionsData.map(sectionData => ({
      title: sectionData.title,
      content: sectionData.content,
      type: sectionData.type || 'text',
      order: sectionData.order,
      metadata: sectionData.metadata || {}
    }));
  }

  /**
   * 生成报告摘要
   */
  generateSummary(sections) {
    const totalLength = sections.reduce((sum, section) => sum + section.content.length, 0);
    const summaryLength = Math.min(500, Math.floor(totalLength * 0.1));

    let summary = sections[0]?.content?.substring(0, summaryLength) || '';

    if (summary.length < summaryLength && sections.length > 1) {
      summary += ' ' + sections[1].content.substring(0, summaryLength - summary.length);
    }

    return summary + (summary.length >= summaryLength ? '...' : '');
  }

  /**
   * 提取关键指标
   */
  extractKeyMetrics(sections) {
    const metrics = {
      sectionCount: sections.length,
      totalCharacters: sections.reduce((sum, section) => sum + section.content.length, 0),
      estimatedReadingTime: Math.ceil(
        sections.reduce((sum, section) => sum + section.content.length, 0) / 1000
      ),
      keyPoints: []
    };

    // 提取关键点（这里简化处理，实际可以根据内容分析）
    sections.slice(0, 3).forEach(section => {
      const sentences = section.content.split(/[.!?]/).filter(s => s.trim().length > 20);
      if (sentences.length > 0) {
        metrics.keyPoints.push(sentences[0].trim());
      }
    });

    return metrics;
  }

  /**
   * 格式化报告内容
   */
  formatContent(content, format) {
    switch (format) {
    case 'html':
      return this.formatAsHtml(content);
    case 'markdown':
      return this.formatAsMarkdown(content);
    case 'plain':
    default:
      return content;
    }
  }

  /**
   * 格式化为HTML
   */
  formatAsHtml(content) {
    return content
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  /**
   * 格式化为Markdown
   */
  formatAsMarkdown(content) {
    // 简单的HTML到Markdown转换
    return content
      .replace(/<strong>(.+?)<\/strong>/g, '**$1**')
      .replace(/<em>(.+?)<\/em>/g, '*$1*')
      .replace(/<p>(.+?)<\/p>/g, '$1\n\n');
  }
}

export default ReportGenerationService;
