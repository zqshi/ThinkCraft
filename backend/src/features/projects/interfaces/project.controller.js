import { projectUseCase } from '../application/project.use-case.js';
import {
  CreateProjectRequestDTO,
  UpdateProjectRequestDTO,
  CustomizeWorkflowRequestDTO,
  SearchProjectsRequestDTO
} from '../application/project.dto.js';
import { ProjectModel } from '../infrastructure/project.model.js';
import { BusinessPlanModel } from '../../business-plan/infrastructure/business-plan.model.js';
import { AnalysisReportModel } from '../../report/infrastructure/analysis-report.model.js';
import { ChatModel } from '../../chat/infrastructure/chat.model.js';

function pickDefined(source, fields) {
  const result = {};
  fields.forEach(field => {
    if (source[field] !== undefined) {
      result[field] = source[field];
    }
  });
  return result;
}

export class ProjectController {
  constructor() {
    this.createProject = this.createProject.bind(this);
    this.getProject = this.getProject.bind(this);
    this.getAllProjects = this.getAllProjects.bind(this);
    this.updateProject = this.updateProject.bind(this);
    this.deleteProject = this.deleteProject.bind(this);
    this.customizeWorkflow = this.customizeWorkflow.bind(this);
    this.getProjectByIdeaId = this.getProjectByIdeaId.bind(this);
    this.getProjectStatistics = this.getProjectStatistics.bind(this);
    this.searchProjects = this.searchProjects.bind(this);
    this.getProjectProgress = this.getProjectProgress.bind(this);
    this.getRelatedProjects = this.getRelatedProjects.bind(this);
    this.archiveProject = this.archiveProject.bind(this);
    this.duplicateProject = this.duplicateProject.bind(this);
    this.batchUpdateStatus = this.batchUpdateStatus.bind(this);
    this.clearProjectSpace = this.clearProjectSpace.bind(this);
    this.getEligibleIdeas = this.getEligibleIdeas.bind(this);
  }

  sendSuccess(res, message, data, status = 200) {
    return res.status(status).json({ code: 0, message, data });
  }

  sendError(res, error, fallback, status = 400) {
    return res.status(status).json({ code: -1, error: error?.message || fallback });
  }

  async createProject(req, res) {
    try {
      const { ideaId, name, mode } = req.body;
      const response = await projectUseCase.createProject(
        new CreateProjectRequestDTO(ideaId, name, mode, req.user?.userId)
      );
      return this.sendSuccess(res, '项目创建成功', response, 201);
    } catch (error) {
      console.error('[ProjectController] 创建项目失败:', error);
      return this.sendError(res, error, '创建项目失败');
    }
  }

  async getProject(req, res) {
    try {
      const project = await projectUseCase.getProject(req.params.id, req.user?.userId);
      const stages = project.workflow?.stages || [];
      const artifacts = stages.flatMap(stage => stage.artifacts || []);
      return this.sendSuccess(res, '获取项目成功', { project, stages, artifacts });
    } catch (error) {
      console.error('[ProjectController] 获取项目失败:', error);
      return this.sendError(res, error, '项目不存在', 404);
    }
  }

  async getAllProjects(req, res) {
    try {
      const filters = pickDefined(req.query, ['mode', 'status', 'sortBy']);
      if (req.query.limit) {
        filters.limit = parseInt(req.query.limit, 10);
      }
      if (req.query.offset) {
        filters.offset = parseInt(req.query.offset, 10);
      }
      const response = await projectUseCase.getAllProjects(filters, req.user?.userId);
      return this.sendSuccess(res, '获取项目列表成功', response);
    } catch (error) {
      console.error('[ProjectController] 获取项目列表失败:', error);
      return this.sendError(res, error, '获取项目列表失败', 500);
    }
  }

  async updateProject(req, res) {
    try {
      const project = await projectUseCase.updateProject(
        req.params.id,
        new UpdateProjectRequestDTO(req.body),
        req.user?.userId
      );
      return this.sendSuccess(res, '项目更新成功', { project });
    } catch (error) {
      console.error('[ProjectController] 更新项目失败:', error);
      return this.sendError(res, error, '更新项目失败');
    }
  }

  async deleteProject(req, res) {
    try {
      await projectUseCase.deleteProject(req.params.id, req.user?.userId);
      return this.sendSuccess(res, '项目删除成功', { success: true });
    } catch (error) {
      console.error('[ProjectController] 删除项目失败:', error);
      return this.sendError(res, error, '删除项目失败');
    }
  }

  async customizeWorkflow(req, res) {
    try {
      const response = await projectUseCase.customizeWorkflow(
        req.params.id,
        new CustomizeWorkflowRequestDTO(req.body.stages),
        req.user?.userId
      );
      return this.sendSuccess(res, '工作流自定义成功', response);
    } catch (error) {
      console.error('[ProjectController] 自定义工作流失败:', error);
      return this.sendError(res, error, '自定义工作流失败');
    }
  }

  async getProjectByIdeaId(req, res) {
    try {
      const project = await projectUseCase.getProjectByIdeaId(req.params.ideaId, req.user?.userId);
      return this.sendSuccess(res, '获取项目成功', { project });
    } catch (error) {
      console.error('[ProjectController] 根据创意ID获取项目失败:', error);
      if (error?.message?.includes('尚未创建项目')) {
        return this.sendSuccess(res, '项目不存在', { project: null });
      }
      return this.sendError(res, error, '项目查询失败', 500);
    }
  }

  async getProjectStatistics(req, res) {
    try {
      const statistics = await projectUseCase.getProjectStatistics(req.user?.userId);
      return this.sendSuccess(res, '获取项目统计成功', statistics);
    } catch (error) {
      console.error('[ProjectController] 获取项目统计失败:', error);
      return this.sendError(res, error, '获取项目统计失败', 500);
    }
  }

  async searchProjects(req, res) {
    try {
      const searchRequest = new SearchProjectsRequestDTO(req.query.q, {
        mode: req.query.mode,
        status: req.query.status
      });
      const response = await projectUseCase.searchProjects(searchRequest, req.user?.userId);
      return this.sendSuccess(res, '搜索项目成功', response);
    } catch (error) {
      console.error('[ProjectController] 搜索项目失败:', error);
      return this.sendError(res, error, '搜索项目失败');
    }
  }

  async getProjectProgress(req, res) {
    try {
      const progress = await projectUseCase.getProjectProgress(req.params.id, req.user?.userId);
      return this.sendSuccess(res, '获取项目进度成功', progress);
    } catch (error) {
      console.error('[ProjectController] 获取项目进度失败:', error);
      return this.sendError(res, error, '项目不存在', 404);
    }
  }

  async getRelatedProjects(req, res) {
    try {
      const response = await projectUseCase.getRelatedProjects(
        req.params.id,
        parseInt(req.query.limit || '5', 10),
        req.user?.userId
      );
      return this.sendSuccess(res, '获取相关项目成功', response);
    } catch (error) {
      console.error('[ProjectController] 获取相关项目失败:', error);
      return this.sendError(res, error, '项目不存在', 404);
    }
  }

  async archiveProject(req, res) {
    try {
      const project = await projectUseCase.archiveProject(req.params.id, req.user?.userId);
      return this.sendSuccess(res, '项目归档成功', { project });
    } catch (error) {
      console.error('[ProjectController] 归档项目失败:', error);
      return this.sendError(res, error, '归档项目失败');
    }
  }

  async duplicateProject(req, res) {
    try {
      const response = await projectUseCase.duplicateProject(
        req.params.id,
        req.body.name,
        req.user?.userId
      );
      return this.sendSuccess(res, '项目复制成功', response, 201);
    } catch (error) {
      console.error('[ProjectController] 复制项目失败:', error);
      return this.sendError(res, error, '复制项目失败');
    }
  }

  async batchUpdateStatus(req, res) {
    try {
      const response = await projectUseCase.batchUpdateStatus(
        req.body.projectIds,
        req.body.status,
        req.user?.userId
      );
      return this.sendSuccess(res, '批量更新项目状态成功', response);
    } catch (error) {
      console.error('[ProjectController] 批量更新项目状态失败:', error);
      return this.sendError(res, error, '批量更新项目状态失败');
    }
  }

  async clearProjectSpace(req, res) {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return this.sendError(res, new Error('仅开发环境允许清理数据'), '仅开发环境允许清理数据', 403);
      }

      const [projectResult, planResult, reportResult] = await Promise.all([
        ProjectModel.deleteMany({}),
        BusinessPlanModel.deleteMany({}),
        AnalysisReportModel.deleteMany({})
      ]);

      return this.sendSuccess(res, '项目空间已清理', {
        projects: projectResult.deletedCount,
        businessPlans: planResult.deletedCount,
        analysisReports: reportResult.deletedCount
      });
    } catch (error) {
      console.error('[ProjectController] 清理项目空间失败:', error);
      return this.sendError(res, error, '清理项目空间失败', 500);
    }
  }

  buildAnalysisReportKey(messages = []) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return '';
    }
    const content = messages.map(msg => String(msg?.content || '')).join('|');
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash;
    }
    return Math.abs(hash).toString(36);
  }

  hasReportContent(report) {
    const data = report?.report || report?.data || report || {};
    const chapters = data?.chapters;
    const hasChapters = Array.isArray(chapters)
      ? chapters.length > 0
      : chapters && typeof chapters === 'object'
        ? Object.keys(chapters).length > 0
        : false;
    const hasDocument = typeof data?.document === 'string' && data.document.trim().length > 0;
    return hasChapters || hasDocument;
  }

  hasAnalysisCompletionMarker(messages = []) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return false;
    }
    return messages.some(msg => {
      const content = String(msg?.content || '');
      return (
        content.includes('[ANALYSIS_COMPLETE]') ||
        /报告生成完毕|生成报告已完成|分析报告已生成|查看完整分析报告/.test(content)
      );
    });
  }

  async getEligibleIdeas(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return this.sendError(res, new Error('未提供访问令牌'), '未提供访问令牌', 401);
      }

      // 始终使用当前用户口径，避免弹窗出现“被其他用户项目引用”的假关联。
      const chatQuery = { userId, status: { $ne: 'deleted' } };
      const projectQuery = { userId, status: { $ne: 'deleted' } };

      const [projects, chats] = await Promise.all([
        ProjectModel.find(projectQuery)
          .select({ _id: 1, ideaId: 1, name: 1, status: 1, updatedAt: 1 })
          .lean(),
        ChatModel.find(chatQuery)
          .select({
            _id: 1,
            title: 1,
            updatedAt: 1,
            createdAt: 1,
            analysisCompleted: 1,
            reportState: 1,
            messages: 1
          })
          .lean()
      ]);
      const chatIdSet = new Set((chats || []).map(chat => String(chat?._id || '').trim()).filter(Boolean));

      const projectByIdeaId = new Map();
      (projects || []).forEach(project => {
        const ideaId = project?.ideaId ? String(project.ideaId).trim() : '';
        if (!ideaId || projectByIdeaId.has(ideaId)) {
          return;
        }
        projectByIdeaId.set(ideaId, {
          id: project._id,
          name: project.name || '未命名项目',
          status: project.status
        });
      });

      const pendingReportLookup = [];
      const pendingChatIds = new Set();

      (chats || []).forEach(chat => {
        const chatId = String(chat?._id || '').trim();
        if (!chatId) {
          return;
        }
        const reportStatus = String(chat?.reportState?.analysis?.status || '').toLowerCase();
        const markedCompleted =
          chat?.analysisCompleted === true ||
          reportStatus === 'completed' ||
          reportStatus === 'success' ||
          reportStatus === 'done' ||
          reportStatus === 'finished' ||
          this.hasAnalysisCompletionMarker(chat?.messages || []);

        if (markedCompleted) {
          return;
        }

        pendingChatIds.add(chatId);
        const reportKey = this.buildAnalysisReportKey(chat?.messages || []);
        if (!reportKey) {
          return;
        }
        pendingReportLookup.push(reportKey);
      });

      const reportKeyWithContent = new Set();
      if (pendingReportLookup.length > 0) {
        const uniqueKeys = [...new Set(pendingReportLookup)];
        const reports = await AnalysisReportModel.find({ reportKey: { $in: uniqueKeys } })
          .select({ reportKey: 1, report: 1 })
          .lean();
        (reports || []).forEach(report => {
          if (this.hasReportContent(report)) {
            reportKeyWithContent.add(String(report.reportKey));
          }
        });
      }

      const reportChatIdWithContent = new Set();
      if (pendingChatIds.size > 0) {
        const reports = await AnalysisReportModel.find({ chatId: { $in: [...pendingChatIds] } })
          .select({ chatId: 1, report: 1 })
          .lean();
        (reports || []).forEach(report => {
          if (this.hasReportContent(report) && report?.chatId) {
            reportChatIdWithContent.add(String(report.chatId));
          }
        });
      }

      const ideas = (chats || [])
        .map(chat => {
          const chatId = String(chat?._id || '').trim();
          if (!chatId) {
            return null;
          }
          const reportStatus = String(chat?.reportState?.analysis?.status || '').toLowerCase();
          let completed =
            chat?.analysisCompleted === true ||
            reportStatus === 'completed' ||
            reportStatus === 'success' ||
            reportStatus === 'done' ||
            reportStatus === 'finished' ||
            this.hasAnalysisCompletionMarker(chat?.messages || []);

          if (!completed) {
            const reportKey = this.buildAnalysisReportKey(chat?.messages || []);
            if (reportKey && reportKeyWithContent.has(reportKey)) {
              completed = true;
            }
          }
          if (!completed && reportChatIdWithContent.has(chatId)) {
            completed = true;
          }

          if (!completed) {
            return null;
          }

          const linked = projectByIdeaId.get(chatId) || null;
          const safeTitle =
            typeof chat.title === 'string' && chat.title.trim().length > 0
              ? chat.title.trim()
              : `创意 ${chatId.slice(0, 8)}`;
          return {
            id: chatId,
            title: safeTitle,
            updatedAt: chat.updatedAt || chat.createdAt || Date.now(),
            hasProject: Boolean(linked),
            projectId: linked?.id || null,
            projectName: linked?.name || null,
            analysisCompleted: true
          };
        })
        .filter(Boolean)
        .sort((a, b) => Number(new Date(b.updatedAt || 0)) - Number(new Date(a.updatedAt || 0)));

      const chatIdsToBackfill = (chats || [])
        .filter(chat => {
          const chatId = String(chat?._id || '').trim();
          if (!chatId || !reportChatIdWithContent.has(chatId)) {
            return false;
          }
          const reportStatus = String(chat?.reportState?.analysis?.status || '').toLowerCase();
          const markedCompleted =
            chat?.analysisCompleted === true ||
            reportStatus === 'completed' ||
            reportStatus === 'success' ||
            reportStatus === 'done' ||
            reportStatus === 'finished';
          return !markedCompleted;
        })
        .map(chat => String(chat?._id || '').trim())
        .filter(Boolean);

      if (chatIdsToBackfill.length > 0) {
        const nowIso = new Date().toISOString();
        await ChatModel.updateMany(
          { _id: { $in: chatIdsToBackfill } },
          {
            $set: {
              analysisCompleted: true,
              'reportState.analysis': {
                status: 'completed',
                completedAt: nowIso,
                source: 'eligible-ideas-reconcile'
              },
              updatedAt: new Date()
            }
          }
        );
      }

      const orphanReportChatIds = [...reportChatIdWithContent].filter(chatId => !chatIdSet.has(chatId));
      console.info('[ProjectController] eligible-ideas diagnostics', {
        userId,
        chatTotal: (chats || []).length,
        projectTotal: (projects || []).length,
        reportKeyMatchedCount: reportKeyWithContent.size,
        reportChatIdMatchedCount: reportChatIdWithContent.size,
        orphanReportChatIdCount: orphanReportChatIds.length,
        orphanReportChatIdSamples: orphanReportChatIds.slice(0, 10),
        ideasTotal: ideas.length,
        backfilledChats: chatIdsToBackfill.length
      });

      return this.sendSuccess(res, '获取可选创意成功', {
        ideas,
        total: ideas.length
      });
    } catch (error) {
      console.error('[ProjectController] 获取可选创意失败:', error);
      return this.sendError(res, error, '获取可选创意失败', 500);
    }
  }
}

export const projectController = new ProjectController();
