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
  UpgradeProjectResponseDTO,
  CustomizeWorkflowRequestDTO,
  UpdateDemoCodeRequestDTO,
  ProjectProgressDTO,
  ProjectStatisticsDTO,
  SearchProjectsRequestDTO
} from './project.dto.js';
import { ProjectService } from '../domain/project.service.js';
import { projectRepository } from '../infrastructure/project-inmemory.repository.js';

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
        createRequest.mode
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
  async getProject(projectId) {
    try {
      // 查找项目
      const project = await projectRepository.findById(projectId);
      if (!project) {
        throw new Error('项目不存在');
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
  async getAllProjects(filters = {}) {
    try {
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
  async updateProject(projectId, updateRequest) {
    try {
      // 验证请求数据
      updateRequest.validate();

      // 执行更新项目用例
      const project = await this.projectService.updateProject(projectId, updateRequest.updates);

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
  async deleteProject(projectId) {
    try {
      // 执行删除项目用例
      await this.projectService.deleteProject(projectId);

      return { success: true };
    } catch (error) {
      console.error('[ProjectUseCase] 删除项目失败:', error);
      throw error;
    }
  }

  /**
   * 升级项目模式
   */
  async upgradeProjectMode(projectId) {
    try {
      // 执行升级项目模式用例
      const project = await this.projectService.upgradeProjectMode(projectId);

      // 检查是否有迁移的产物
      const migratedArtifacts = [];
      if (project.workflow) {
        const developmentStage = project.workflow.getStage('development');
        if (developmentStage && developmentStage.artifacts.length > 0) {
          migratedArtifacts.push('demo-code');
        }
      }

      // 返回响应
      return new UpgradeProjectResponseDTO(project, migratedArtifacts);
    } catch (error) {
      console.error('[ProjectUseCase] 升级项目模式失败:', error);
      throw error;
    }
  }

  /**
   * 自定义工作流
   */
  async customizeWorkflow(projectId, customizeRequest) {
    try {
      // 验证请求数据
      customizeRequest.validate();

      // 执行自定义工作流用例
      const project = await this.projectService.customizeWorkflow(
        projectId,
        customizeRequest.stages
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
   * 更新Demo代码
   */
  async updateDemoCode(projectId, updateRequest) {
    try {
      // 验证请求数据
      updateRequest.validate();

      // 执行更新Demo代码用例
      const project = await this.projectService.updateDemoCode(
        projectId,
        updateRequest.code,
        updateRequest.type,
        updateRequest.previewUrl,
        updateRequest.downloadUrl
      );

      // 返回响应
      return new ProjectResponseDTO(project);
    } catch (error) {
      console.error('[ProjectUseCase] 更新Demo代码失败:', error);
      throw error;
    }
  }

  /**
   * 根据创意ID获取项目
   */
  async getProjectByIdeaId(ideaId) {
    try {
      // 查找项目
      const project = await projectRepository.findByIdeaId(ideaId);
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
  async getProjectStatistics() {
    try {
      // 获取统计信息
      const statistics = await this.projectService.getProjectStatistics();

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
  async searchProjects(searchRequest) {
    try {
      // 验证请求数据
      searchRequest.validate();

      // 执行搜索
      const projects = await this.projectService.searchProjects(
        searchRequest.query,
        searchRequest.filters
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
  async getProjectProgress(projectId) {
    try {
      // 获取项目进度
      const progress = await this.projectService.getProjectProgress(projectId);

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
  async getRelatedProjects(projectId, limit = 5) {
    try {
      // 获取相关项目
      const relatedProjects = await this.projectService.findRelatedProjects(projectId, limit);

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
  async archiveProject(projectId) {
    try {
      // 执行归档项目用例
      const project = await this.projectService.archiveProject(projectId);

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
  async duplicateProject(projectId, newName) {
    try {
      // 执行复制项目用例
      const newProject = await this.projectService.duplicateProject(projectId, newName);

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
  async batchUpdateStatus(projectIds, status) {
    try {
      // 执行批量更新
      const results = await this.projectService.batchUpdateStatus(projectIds, status);

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
