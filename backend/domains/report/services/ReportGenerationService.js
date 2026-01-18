/**
 * ReportGenerationService - 报告生成领域服务
 *
 * 职责：
 * 1. 报告生成业务逻辑
 * 2. 集成DeepSeek API生成报告
 * 3. 报告验证和解析
 * 4. 报告版本管理
 */

import { reportRepository } from '../repositories/ReportRepository.js';
import { callDeepSeekAPI } from '../../../config/deepseek.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';
import { nanoid } from 'nanoid';

const logger = domainLoggers.Report;

// 报告生成专用系统提示词
const REPORT_GENERATION_PROMPT = `你是ThinkCraft的专业报告分析师。你的任务是基于用户与AI助手的对话历史，生成一份结构化的创意分析报告。

**重要要求：**
1. 仔细阅读整个对话历史，提取关键信息
2. 如果信息不足，用合理的推断补充，但要标注为"推测"
3. 输出必须是严格的JSON格式，不要有任何额外文字
4. 保持专业、客观、建设性的分析态度

**输出JSON结构：**
{
  "initialIdea": "用户最初提出的创意（从第一条用户消息提取）",
  "coreDefinition": "经过澄清后的精准定义（一句话概括）",
  "targetUser": "目标用户群体",
  "problem": "要解决的核心痛点",
  "solution": "解决方案描述",
  "validation": "验证指标或成功标准",
  "chapters": {
    "chapter1": {
      "title": "第一章：创意定义与演化",
      "originalIdea": "原始表述",
      "evolution": "从原始想法到精准定义的关键转变点"
    },
    "chapter2": {
      "title": "第二章：核心洞察与根本假设",
      "surfaceNeed": "表层需求",
      "deepMotivation": "深层动力",
      "assumptions": ["假设1", "假设2", "假设3"]
    },
    "chapter3": {
      "title": "第三章：边界条件与应用场景",
      "idealScenario": "最佳应用场景描述",
      "limitations": ["限制条件1", "限制条件2"],
      "prerequisites": {
        "technical": "技术前置条件",
        "resources": "资源要求",
        "partnerships": "合作基础"
      }
    },
    "chapter4": {
      "title": "第四章：可行性分析与关键挑战",
      "stages": [
        {"stage": "第一阶段", "goal": "目标", "tasks": "关键任务"},
        {"stage": "第二阶段", "goal": "目标", "tasks": "关键任务"}
      ],
      "biggestRisk": "最大风险点",
      "mitigation": "应对措施"
    },
    "chapter5": {
      "title": "第五章：思维盲点与待探索问题",
      "blindSpots": ["盲区1", "盲区2", "盲区3"],
      "keyQuestions": [
        {"question": "问题1", "validation": "验证方法"},
        {"question": "问题2", "validation": "验证方法"}
      ]
    },
    "chapter6": {
      "title": "第六章：结构化行动建议",
      "immediateActions": ["本周行动1", "本周行动2", "本周行动3"],
      "midtermPlan": {
        "userResearch": "用户研究计划",
        "marketResearch": "市场调研",
        "prototyping": "原型开发",
        "partnerships": "合作探索"
      },
      "extendedIdeas": ["延伸创意1", "延伸创意2"]
    }
  }
}

**分析要求：**
- 如果对话中明确提到某些信息，直接使用
- 如果对话中未明确提到，基于上下文合理推断，并在描述中使用"可能"、"建议"等词
- 保持客观中立，既要肯定优势，也要指出风险
- 行动建议要具体可执行，避免空泛的建议

现在，请分析以下对话历史并生成报告：`;

export class ReportGenerationService {
  constructor(repository = reportRepository) {
    this.repository = repository;
  }

  /**
   * 生成报告
   * @param {string} conversationId - 对话ID
   * @param {string} userId - 用户ID
   * @param {Array<Object>} messages - 对话消息历史
   * @param {Object} options - 选项
   * @returns {Promise<Object>} 生成的报告
   */
  async generateReport(conversationId, userId, messages, options = {}) {
    try {
      // 验证输入
      if (!conversationId || !userId) {
        throw new Error('对话ID和用户ID不能为空');
      }

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('必须提供有效的对话历史');
      }

      logger.info('开始生成报告', {
        conversationId,
        userId,
        messageCount: messages.length
      });

      // 构建用于报告生成的消息
      const conversationSummary = messages
        .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
        .join('\n\n');

      const reportMessages = [
        {
          role: 'user',
          content: `${REPORT_GENERATION_PROMPT}\n\n=== 对话历史 ===\n${conversationSummary}`
        }
      ];

      // 调用DeepSeek API生成报告
      const response = await callDeepSeekAPI(reportMessages, null);

      // 解析JSON响应
      const reportData = this._parseReportJSON(response.content);

      // 生成报告ID
      const reportId = `report_${nanoid(16)}`;

      // 保存报告到数据库
      const report = await this.repository.createReport({
        id: reportId,
        conversationId,
        userId,
        reportData,
        status: 'draft',
        version: 1
      });

      logger.info('报告生成成功', {
        reportId: report.id,
        conversationId,
        userId,
        tokens: response.usage
      });

      return {
        report,
        tokens: {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens
        }
      };
    } catch (error) {
      logger.error('生成报告失败', error);
      throw error;
    }
  }

  /**
   * 解析AI返回的报告JSON
   * @private
   * @param {string} content - AI返回的内容
   * @returns {Object} 解析后的报告数据
   */
  _parseReportJSON(content) {
    try {
      // 尝试提取JSON（AI可能会在JSON前后添加说明文字）
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        return JSON.parse(content);
      }
    } catch (parseError) {
      logger.error('报告JSON解析失败', { content });
      throw new Error(`AI返回的报告格式无效: ${parseError.message}`);
    }
  }

  /**
   * 获取报告
   * @param {string} reportId - 报告ID
   * @returns {Promise<Object|null>} 报告
   */
  async getReport(reportId) {
    try {
      const report = await this.repository.getReportById(reportId);

      if (!report) {
        logger.warn('报告不存在', { reportId });
        return null;
      }

      return report;
    } catch (error) {
      logger.error('获取报告失败', error);
      throw error;
    }
  }

  /**
   * 根据对话ID获取报告
   * @param {string} conversationId - 对话ID
   * @returns {Promise<Object|null>} 报告
   */
  async getReportByConversationId(conversationId) {
    try {
      const report = await this.repository.getReportByConversationId(conversationId);

      if (!report) {
        logger.debug('该对话暂无报告', { conversationId });
        return null;
      }

      return report;
    } catch (error) {
      logger.error('根据对话ID获取报告失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的报告列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array<Object>>} 报告列表
   */
  async getUserReports(userId, options = {}) {
    try {
      const reports = await this.repository.getUserReports(userId, options);

      logger.debug('获取用户报告列表', {
        userId,
        count: reports.length
      });

      return reports;
    } catch (error) {
      logger.error('获取用户报告列表失败', error);
      throw error;
    }
  }

  /**
   * 更新报告状态
   * @param {string} reportId - 报告ID
   * @param {string} status - 新状态 (draft/final/archived)
   * @returns {Promise<boolean>} 是否成功
   */
  async updateStatus(reportId, status) {
    try {
      // 验证状态值
      if (!['draft', 'final', 'archived'].includes(status)) {
        throw new Error(`无效的报告状态: ${status}`);
      }

      const success = await this.repository.updateStatus(reportId, status);

      if (success) {
        logger.info('更新报告状态成功', { reportId, status });
      } else {
        logger.warn('更新报告状态失败：报告不存在', { reportId });
      }

      return success;
    } catch (error) {
      logger.error('更新报告状态失败', error);
      throw error;
    }
  }

  /**
   * 更新报告数据
   * @param {string} reportId - 报告ID
   * @param {Object} reportData - 新的报告数据
   * @returns {Promise<boolean>} 是否成功
   */
  async updateReportData(reportId, reportData) {
    try {
      if (!reportData || typeof reportData !== 'object') {
        throw new Error('报告数据必须是对象');
      }

      const success = await this.repository.updateReport(reportId, {
        reportData
      });

      if (success) {
        logger.info('更新报告数据成功', { reportId });
      }

      return success;
    } catch (error) {
      logger.error('更新报告数据失败', error);
      throw error;
    }
  }

  /**
   * 删除报告
   * @param {string} reportId - 报告ID
   * @param {string} userId - 用户ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteReport(reportId, userId) {
    try {
      const success = await this.repository.deleteReport(reportId, userId);

      if (success) {
        logger.info('删除报告成功', { reportId, userId });
      } else {
        logger.warn('删除报告失败：报告不存在或无权限', { reportId, userId });
      }

      return success;
    } catch (error) {
      logger.error('删除报告失败', error);
      throw error;
    }
  }

  /**
   * 重新生成报告（更新版本）
   * @param {string} reportId - 报告ID
   * @param {Array<Object>} messages - 新的对话消息历史
   * @returns {Promise<Object>} 更新后的报告
   */
  async regenerateReport(reportId, messages) {
    try {
      // 获取原报告
      const existingReport = await this.repository.getReportById(reportId);
      if (!existingReport) {
        throw new Error('报告不存在');
      }

      logger.info('开始重新生成报告', {
        reportId,
        currentVersion: existingReport.version
      });

      // 生成新报告数据
      const conversationSummary = messages
        .map(msg => `${msg.role === 'user' ? '用户' : 'AI助手'}: ${msg.content}`)
        .join('\n\n');

      const reportMessages = [
        {
          role: 'user',
          content: `${REPORT_GENERATION_PROMPT}\n\n=== 对话历史 ===\n${conversationSummary}`
        }
      ];

      const response = await callDeepSeekAPI(reportMessages, null);
      const reportData = this._parseReportJSON(response.content);

      // 更新报告数据和版本
      await this.repository.updateReport(reportId, {
        reportData
      });
      const newVersion = await this.repository.incrementVersion(reportId);

      logger.info('重新生成报告成功', {
        reportId,
        newVersion,
        tokens: response.usage
      });

      // 返回更新后的报告
      const updatedReport = await this.repository.getReportById(reportId);

      return {
        report: updatedReport,
        tokens: {
          prompt: response.usage.prompt_tokens,
          completion: response.usage.completion_tokens,
          total: response.usage.total_tokens
        }
      };
    } catch (error) {
      logger.error('重新生成报告失败', error);
      throw error;
    }
  }

  /**
   * 获取报告统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const stats = await this.repository.getStats();

      logger.debug('获取报告统计信息', stats);

      return stats;
    } catch (error) {
      logger.error('获取报告统计信息失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的报告统计
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户统计
   */
  async getUserStats(userId) {
    try {
      const stats = await this.repository.getUserStats(userId);

      logger.debug('获取用户报告统计', { userId, ...stats });

      return stats;
    } catch (error) {
      logger.error('获取用户报告统计失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const reportGenerationService = new ReportGenerationService();

export default ReportGenerationService;
