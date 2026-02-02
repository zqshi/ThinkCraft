/**
 * 项目用例
 * 实现项目管理相关的业务用例
 */
import {
  CreateProjectRequestDTO,
  CreateProjectResponseDTO,
  UpdateProjectRequestDTO,
  ProjectResponseDTO,
  ProjectListResponseDTO,
  CustomizeWorkflowRequestDTO,
  ProjectProgressDTO,
  ProjectStatisticsDTO,
  SearchProjectsRequestDTO
} from './project.dto.js';
import { ProjectService } from '../domain/project.service.js';
import { projectRepository } from '../infrastructure/index.js';

export class ProjectUseCase {
  constructor() {
    this.projectService = new ProjectService(projectRepository);
  }

  /**
   * 创建项目
   */
  async createProject(createRequest) {
    try {
      // 验证请求数据
      createRequest.validate();

      // 执行创建项目用例
      const project = await this.projectService.createProject(
        createRequest.ideaId,
        createRequest.name,
        createRequest.mode,
        createRequest.userId
      );

      // 返回响应
      return new CreateProjectResponseDTO(project);
    } catch (error) {
      console.error('[ProjectUseCase] 创建项目失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目详情
   */
  async getProject(projectId, userId) {
    try {
      // 查找项目
      const project = await projectRepository.findById(projectId);
      if (!project) {
        throw new Error('项目不存在');
      }
      if (userId && project.userId !== userId) {
        throw new Error('无权访问该项目');
      }

      // 返回响应
      return new ProjectResponseDTO(project);
    } catch (error) {
      console.error('[ProjectUseCase] 获取项目失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有项目
   */
  async getAllProjects(filters = {}, userId) {
    try {
      if (userId) {
        filters.userId = userId;
      }
      // 查找项目
      const projects = await projectRepository.findAll(filters);
      const total = await projectRepository.count(filters);

      // 返回响应
      return new ProjectListResponseDTO(projects, total);
    } catch (error) {
      console.error('[ProjectUseCase] 获取项目列表失败:', error);
      throw error;
    }
  }

  /**
   * 更新项目
   */
  async updateProject(projectId, updateRequest, userId) {
    try {
      // 验证请求数据
      updateRequest.validate();

      const existing = await projectRepository.findById(projectId);
      if (!existing) {
        throw new Error('项目不存在');
      }
      if (userId && existing.userId !== userId) {
        throw new Error('无权访问该项目');
      }

      // 执行更新项目用例
      const project = await this.projectService.updateProject(
        projectId,
        updateRequest.updates,
        userId
      );

      // 返回响应
      return new ProjectResponseDTO(project);
    } catch (error) {
      console.error('[ProjectUseCase] 更新项目失败:', error);
      throw error;
    }
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId, userId) {
    try {
      const existing = await projectRepository.findById(projectId);
      if (!existing) {
        throw new Error('项目不存在');
      }
      if (userId && existing.userId !== userId) {
        throw new Error('无权访问该项目');
      }

      // 执行删除项目用例
      await this.projectService.deleteProject(projectId, userId);

      return { success: true };
    } catch (error) {
      console.error('[ProjectUseCase] 删除项目失败:', error);
      throw error;
    }
  }

  /**
   * 自定义工作流
   */
  async customizeWorkflow(projectId, customizeRequest, userId) {
    try {
      // 验证请求数据
      customizeRequest.validate();

      // 执行自定义工作流用例
      const project = await this.projectService.customizeWorkflow(
        projectId,
        customizeRequest.stages,
        userId
      );

      // 返回响应
      return {
        workflow: project.workflow.toJSON()
      };
    } catch (error) {
      console.error('[ProjectUseCase] 自定义工作流失败:', error);
      throw error;
    }
  }

  /**
   * 根据创意ID获取项目
   */
  async getProjectByIdeaId(ideaId, userId) {
    try {
      // 查找项目
      const project = await projectRepository.findByIdeaId(ideaId, userId);
      if (!project) {
        throw new Error('该创意尚未创建项目');
      }

      // 返回响应
      return new ProjectResponseDTO(project);
    } catch (error) {
      console.error('[ProjectUseCase] 根据创意ID获取项目失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStatistics(userId) {
    try {
      // 获取统计信息
      const statistics = await this.projectService.getProjectStatistics(userId);

      // 返回响应
      return new ProjectStatisticsDTO(statistics);
    } catch (error) {
      console.error('[ProjectUseCase] 获取项目统计失败:', error);
      throw error;
    }
  }

  /**
   * 搜索项目
   */
  async searchProjects(searchRequest, userId) {
    try {
      // 验证请求数据
      searchRequest.validate();

      // 执行搜索
      const projects = await this.projectService.searchProjects(
        searchRequest.query,
        searchRequest.filters,
        userId
      );

      const total = projects.length;

      // 返回响应
      return new ProjectListResponseDTO(projects, total);
    } catch (error) {
      console.error('[ProjectUseCase] 搜索项目失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目进度
   */
  async getProjectProgress(projectId, userId) {
    try {
      // 获取项目进度
      const progress = await this.projectService.getProjectProgress(projectId, userId);

      // 返回响应
      return new ProjectProgressDTO(progress);
    } catch (error) {
      console.error('[ProjectUseCase] 获取项目进度失败:', error);
      throw error;
    }
  }

  /**
   * 获取相关项目
   */
  async getRelatedProjects(projectId, limit = 5, userId) {
    try {
      // 获取相关项目
      const relatedProjects = await this.projectService.findRelatedProjects(
        projectId,
        limit,
        userId
      );

      // 返回响应
      return {
        projects: relatedProjects.map(p => new ProjectResponseDTO(p)),
        total: relatedProjects.length
      };
    } catch (error) {
      console.error('[ProjectUseCase] 获取相关项目失败:', error);
      throw error;
    }
  }

  /**
   * 归档项目
   */
  async archiveProject(projectId, userId) {
    try {
      // 执行归档项目用例
      const project = await this.projectService.archiveProject(projectId, userId);

      // 返回响应
      return new ProjectResponseDTO(project);
    } catch (error) {
      console.error('[ProjectUseCase] 归档项目失败:', error);
      throw error;
    }
  }

  /**
   * 复制项目
   */
  async duplicateProject(projectId, newName, userId) {
    try {
      // 执行复制项目用例
      const newProject = await this.projectService.duplicateProject(projectId, newName, userId);

      // 返回响应
      return new CreateProjectResponseDTO(newProject);
    } catch (error) {
      console.error('[ProjectUseCase] 复制项目失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新项目状态
   */
  async batchUpdateStatus(projectIds, status, userId) {
    try {
      // 执行批量更新
      const results = await this.projectService.batchUpdateStatus(projectIds, status, userId);

      // 返回响应
      return {
        results,
        total: results.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length
      };
    } catch (error) {
      console.error('[ProjectUseCase] 批量更新项目状态失败:', error);
      throw error;
    }
  }
}

// 导出用例实例
export const projectUseCase = new ProjectUseCase();
