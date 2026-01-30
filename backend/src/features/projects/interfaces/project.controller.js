/**
 * 项目控制器
 * 处理HTTP请求和响应
 */
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

export class ProjectController {
  /**
   * 创建项目
   */
  async createProject(req, res) {
    try {
      const { ideaId, name, mode } = req.body;

      // 创建创建项目请求DTO
      const createRequest = new CreateProjectRequestDTO(ideaId, name, mode);

      // 执行创建项目用例
      const response = await projectUseCase.createProject(createRequest);

      // 返回成功响应
      res.status(201).json({
        code: 0,
        message: '项目创建成功',
        data: response
      });
    } catch (error) {
      console.error('[ProjectController] 创建项目失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '创建项目失败'
      });
    }
  }

  /**
   * 获取项目详情
   */
  async getProject(req, res) {
    try {
      const { id } = req.params;

      // 执行获取项目用例
      const project = await projectUseCase.getProject(id);

      // 提取相关信息
      const stages = project.workflow?.stages || [];
      const artifacts = stages.flatMap(s => s.artifacts || []);

      // 返回成功响应
      res.json({
        code: 0,
        message: '获取项目成功',
        data: {
          project,
          stages,
          artifacts
        }
      });
    } catch (error) {
      console.error('[ProjectController] 获取项目失败:', error);

      // 返回错误响应
      res.status(404).json({
        code: -1,
        error: error.message || '项目不存在'
      });
    }
  }

  /**
   * 获取所有项目
   */
  async getAllProjects(req, res) {
    try {
      const { mode, status, limit, offset, sortBy } = req.query;

      // 构建过滤器
      const filters = {};
      if (mode) {
        filters.mode = mode;
      }
      if (status) {
        filters.status = status;
      }
      if (limit) {
        filters.limit = parseInt(limit);
      }
      if (offset) {
        filters.offset = parseInt(offset);
      }
      if (sortBy) {
        filters.sortBy = sortBy;
      }

      // 执行获取所有项目用例
      const response = await projectUseCase.getAllProjects(filters);

      // 返回成功响应
      res.json({
        code: 0,
        message: '获取项目列表成功',
        data: response
      });
    } catch (error) {
      console.error('[ProjectController] 获取项目列表失败:', error);

      // 返回错误响应
      res.status(500).json({
        code: -1,
        error: error.message || '获取项目列表失败'
      });
    }
  }

  /**
   * 更新项目
   */
  async updateProject(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // 创建更新项目请求DTO
      const updateRequest = new UpdateProjectRequestDTO(updates);

      // 执行更新项目用例
      const project = await projectUseCase.updateProject(id, updateRequest);

      // 返回成功响应
      res.json({
        code: 0,
        message: '项目更新成功',
        data: { project }
      });
    } catch (error) {
      console.error('[ProjectController] 更新项目失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '更新项目失败'
      });
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(req, res) {
    try {
      const { id } = req.params;

      // 执行删除项目用例
      await projectUseCase.deleteProject(id);

      // 返回成功响应
      res.json({
        code: 0,
        message: '项目删除成功',
        data: { success: true }
      });
    } catch (error) {
      console.error('[ProjectController] 删除项目失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '删除项目失败'
      });
    }
  }

  /**
   * 自定义工作流
   */
  async customizeWorkflow(req, res) {
    try {
      const { id } = req.params;
      const { stages } = req.body;

      // 创建自定义工作流请求DTO
      const customizeRequest = new CustomizeWorkflowRequestDTO(stages);

      // 执行自定义工作流用例
      const response = await projectUseCase.customizeWorkflow(id, customizeRequest);

      // 返回成功响应
      res.json({
        code: 0,
        message: '工作流自定义成功',
        data: response
      });
    } catch (error) {
      console.error('[ProjectController] 自定义工作流失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '自定义工作流失败'
      });
    }
  }

  /**
   * 根据创意ID获取项目
   */
  async getProjectByIdeaId(req, res) {
    try {
      const { ideaId } = req.params;

      // 执行根据创意ID获取项目用例
      const project = await projectUseCase.getProjectByIdeaId(ideaId);

      // 返回成功响应
      res.json({
        code: 0,
        message: '获取项目成功',
        data: { project }
      });
    } catch (error) {
      console.error('[ProjectController] 根据创意ID获取项目失败:', error);

      // 返回错误响应
      res.status(404).json({
        code: -1,
        error: error.message || '项目不存在'
      });
    }
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStatistics(req, res) {
    try {
      // 执行获取项目统计用例
      const statistics = await projectUseCase.getProjectStatistics();

      // 返回成功响应
      res.json({
        code: 0,
        message: '获取项目统计成功',
        data: statistics
      });
    } catch (error) {
      console.error('[ProjectController] 获取项目统计失败:', error);

      // 返回错误响应
      res.status(500).json({
        code: -1,
        error: error.message || '获取项目统计失败'
      });
    }
  }

  /**
   * 搜索项目
   */
  async searchProjects(req, res) {
    try {
      const { q, mode, status } = req.query;

      // 创建搜索请求DTO
      const searchRequest = new SearchProjectsRequestDTO(q, { mode, status });

      // 执行搜索项目用例
      const response = await projectUseCase.searchProjects(searchRequest);

      // 返回成功响应
      res.json({
        code: 0,
        message: '搜索项目成功',
        data: response
      });
    } catch (error) {
      console.error('[ProjectController] 搜索项目失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '搜索项目失败'
      });
    }
  }

  /**
   * 获取项目进度
   */
  async getProjectProgress(req, res) {
    try {
      const { id } = req.params;

      // 执行获取项目进度用例
      const progress = await projectUseCase.getProjectProgress(id);

      // 返回成功响应
      res.json({
        code: 0,
        message: '获取项目进度成功',
        data: progress
      });
    } catch (error) {
      console.error('[ProjectController] 获取项目进度失败:', error);

      // 返回错误响应
      res.status(404).json({
        code: -1,
        error: error.message || '项目不存在'
      });
    }
  }

  /**
   * 获取相关项目
   */
  async getRelatedProjects(req, res) {
    try {
      const { id } = req.params;
      const { limit = 5 } = req.query;

      // 执行获取相关项目用例
      const response = await projectUseCase.getRelatedProjects(id, parseInt(limit));

      // 返回成功响应
      res.json({
        code: 0,
        message: '获取相关项目成功',
        data: response
      });
    } catch (error) {
      console.error('[ProjectController] 获取相关项目失败:', error);

      // 返回错误响应
      res.status(404).json({
        code: -1,
        error: error.message || '项目不存在'
      });
    }
  }

  /**
   * 归档项目
   */
  async archiveProject(req, res) {
    try {
      const { id } = req.params;

      // 执行归档项目用例
      const project = await projectUseCase.archiveProject(id);

      // 返回成功响应
      res.json({
        code: 0,
        message: '项目归档成功',
        data: { project }
      });
    } catch (error) {
      console.error('[ProjectController] 归档项目失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '归档项目失败'
      });
    }
  }

  /**
   * 复制项目
   */
  async duplicateProject(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      // 执行复制项目用例
      const response = await projectUseCase.duplicateProject(id, name);

      // 返回成功响应
      res.status(201).json({
        code: 0,
        message: '项目复制成功',
        data: response
      });
    } catch (error) {
      console.error('[ProjectController] 复制项目失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '复制项目失败'
      });
    }
  }

  /**
   * 批量更新项目状态
   */
  async batchUpdateStatus(req, res) {
    try {
      const { projectIds, status } = req.body;

      // 执行批量更新项目状态用例
      const response = await projectUseCase.batchUpdateStatus(projectIds, status);

      // 返回成功响应
      res.json({
        code: 0,
        message: '批量更新项目状态成功',
        data: response
      });
    } catch (error) {
      console.error('[ProjectController] 批量更新项目状态失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '批量更新项目状态失败'
      });
    }
  }

  /**
   * 清理项目空间数据（仅开发环境）
   */
  async clearProjectSpace(req, res) {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
          code: -1,
          error: '仅开发环境允许清理数据'
        });
      }

      const [projectResult, planResult, reportResult] = await Promise.all([
        ProjectModel.deleteMany({}),
        BusinessPlanModel.deleteMany({}),
        AnalysisReportModel.deleteMany({})
      ]);

      res.json({
        code: 0,
        message: '项目空间已清理',
        data: {
          projects: projectResult.deletedCount,
          businessPlans: planResult.deletedCount,
          analysisReports: reportResult.deletedCount
        }
      });
    } catch (error) {
      console.error('[ProjectController] 清理项目空间失败:', error);
      res.status(500).json({
        code: -1,
        error: error.message || '清理项目空间失败'
      });
    }
  }
}

// 导出控制器实例
export const projectController = new ProjectController();
