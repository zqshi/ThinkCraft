import { ReportUseCase } from '../application/report.use-case.js';
import { getRepository } from '../../../shared/infrastructure/repository.factory.js';
import { ReportGenerationService } from '../application/report-generation.service.js';
import {
  CreateReportRequestDto,
  AddReportSectionRequestDto,
  GenerateReportRequestDto
} from '../application/report.dto.js';
import { AnalysisReportModel } from '../infrastructure/analysis-report.model.js';
import { mongoManager } from '../../../../config/database.js';
import { ok, fail } from '../../../../middleware/response.js';
import { ReportAiService } from '../application/report-ai.service.js';
import { ChatModel } from '../../chat/infrastructure/chat.model.js';
import mongoose from 'mongoose';

function pickDefined(source, fields) {
  const target = {};
  fields.forEach(field => {
    if (source[field] !== undefined) {
      target[field] = source[field];
    }
  });
  return target;
}

export class ReportController {
  constructor() {
    this.reportUseCase = new ReportUseCase(getRepository('report'), new ReportGenerationService());
    this.chatRepository = getRepository('chat');
    this.reportAiService = new ReportAiService();
  }

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

  async updateSection(req, res) {
    try {
      const result = await this.reportUseCase.updateSection(
        req.params.reportId,
        req.params.sectionId,
        pickDefined(req.body, ['title', 'content', 'order', 'metadata'])
      );
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  async removeSection(req, res) {
    try {
      const result = await this.reportUseCase.removeSection(req.params.reportId, req.params.sectionId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  async generateReport(req, res) {
    try {
      if (req.body?.messages && !Array.isArray(req.body.messages)) {
        throw new Error('messages 必须是数组');
      }
      if (Array.isArray(req.body?.messages) && req.body.messages.length === 0) {
        throw new Error('messages 不能为空');
      }

      if (req.body.messages && !req.params.reportId) {
        return await this.handleInsightsReportGeneration(req, res);
      }

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

  async handleInsightsReportGeneration(req, res) {
    const messages = req.body.messages;
    const chatId = req.body.chatId ? String(req.body.chatId) : null;
    const reportKey = req.body.reportKey;
    const force = Boolean(req.body.force);
    const cacheOnly = Boolean(req.body.cacheOnly);
    const dbType = process.env.DB_TYPE || 'memory';
    const canUseMongo = dbType === 'mongodb' && mongoManager.isConnected?.();

    if (chatId) {
      try {
        const chat = await this.chatRepository.findById(chatId);
        if (chat && !chat.titleEdited) {
          const generatedTitle = await this._generateChatTitle(messages);
          if (generatedTitle) {
            chat.updateTitle(generatedTitle);
            chat.setTitleEdited(false);
            await this.chatRepository.save(chat);
          }
        }
      } catch (error) {
        console.warn('[ReportController] 自动生成标题失败，将继续生成报告:', error.message);
      }
    }

    if (reportKey && !force && canUseMongo) {
      const existing = await AnalysisReportModel.findOne({ reportKey }).lean();
      if (existing?.report) {
        await this._persistAnalysisArtifacts({
          chatId,
          reportKey,
          report: existing.report,
          canUseMongo,
          skipReportWrite: true
        });
        return ok(res, { report: existing.report, cached: true });
      }
      if (cacheOnly) {
        return fail(res, '缓存未命中', 404);
      }
    } else if (cacheOnly) {
      return fail(res, '缓存不可用', 400);
    }

    const report = await this._generateInsightsReport(messages);
    await this._persistAnalysisArtifacts({
      chatId,
      reportKey,
      report,
      canUseMongo,
      skipReportWrite: false
    });

    return ok(res, { report, cached: false });
  }

  async _persistAnalysisArtifacts({
    chatId,
    reportKey,
    report,
    canUseMongo,
    skipReportWrite = false
  }) {
    if (!canUseMongo) {
      return;
    }

    const shouldWriteReport = Boolean(reportKey) && !skipReportWrite;
    const shouldWriteChat = Boolean(chatId);
    if (!shouldWriteReport && !shouldWriteChat) {
      return;
    }

    const analysisState = {
      status: 'completed',
      progress: { current: 1, total: 1, percentage: 100 },
      updatedAt: new Date().toISOString(),
      source: 'report-generate'
    };

    const ensureReportStateObject = async (targetChatId, session = null) => {
      const updateOptions = session ? { session } : {};
      await ChatModel.updateOne(
        {
          _id: String(targetChatId),
          $or: [{ reportState: null }, { reportState: { $exists: false } }]
        },
        { $set: { reportState: {} } },
        updateOptions
      );
    };

    if (shouldWriteReport && shouldWriteChat) {
      let shouldFallbackToNonTxn = false;
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await AnalysisReportModel.findOneAndUpdate(
            { reportKey },
            { report, chatId: String(chatId), updatedAt: new Date() },
            { upsert: true, new: true, setDefaultsOnInsert: true, session }
          );
          await ensureReportStateObject(chatId, session);
          const updatedChat = await ChatModel.findByIdAndUpdate(
            String(chatId),
            {
              $set: {
                analysisCompleted: true,
                'reportState.analysis': analysisState,
                updatedAt: new Date()
              }
            },
            { session }
          );
          if (!updatedChat) {
            console.warn('[ReportController] 分析报告已生成，但未找到对应chat进行状态回填', {
              chatId: String(chatId),
              reportKey: reportKey || null
            });
          }
        });
        return;
      } catch (error) {
        const message = String(error?.message || '');
        const unsupportedTxn =
          error?.code === 20 ||
          message.includes('Transaction numbers are only allowed on a replica set member or mongos');
        if (unsupportedTxn) {
          shouldFallbackToNonTxn = true;
          console.warn('[ReportController] MongoDB 不支持事务，降级为非事务写入');
        } else {
          throw error;
        }
      } finally {
        await session.endSession();
      }

      if (!shouldFallbackToNonTxn) {
        return;
      }
    }

    if (shouldWriteReport) {
      await AnalysisReportModel.findOneAndUpdate(
        { reportKey },
        { report, chatId: chatId ? String(chatId) : null, updatedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    if (shouldWriteChat) {
      await ensureReportStateObject(chatId);
      const updatedChat = await ChatModel.findByIdAndUpdate(String(chatId), {
        $set: {
          analysisCompleted: true,
          'reportState.analysis': analysisState,
          updatedAt: new Date()
        }
      });
      if (!updatedChat) {
        console.warn('[ReportController] 分析报告已生成，但未找到对应chat进行状态回填(非事务)', {
          chatId: String(chatId),
          reportKey: reportKey || null
        });
      }
    }
  }

  async updateReport(req, res) {
    try {
      const result = await this.reportUseCase.updateReport(
        req.params.reportId,
        pickDefined(req.body, ['title', 'description', 'metadata'])
      );
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  async archiveReport(req, res) {
    try {
      const result = await this.reportUseCase.archiveReport(req.params.reportId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  async getReport(req, res) {
    try {
      const result = await this.reportUseCase.getReport(req.params.reportId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 404);
    }
  }

  async getReports(req, res) {
    try {
      const result = await this.reportUseCase.getReports(
        pickDefined(req.query, ['projectId', 'type', 'status'])
      );
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  async deleteReport(req, res) {
    try {
      await this.reportUseCase.deleteReport(req.params.reportId);
      ok(res, null, 'Report deleted successfully');
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  async getReportExportFormats(req, res) {
    try {
      const result = await this.reportUseCase.getReportExportFormats(req.params.reportId);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  async getReportTemplates(req, res) {
    try {
      const result = await this.reportUseCase.getReportTemplates(req.params.reportType);
      ok(res, result);
    } catch (error) {
      fail(res, error.message, 400);
    }
  }

  async _generateInsightsReport(messages) {
    return this.reportAiService.generateInsightsReport(messages);
  }

  async _generateChatTitle(messages) {
    return this.reportAiService.generateChatTitle(messages);
  }
}

export default ReportController;
