/**
 * 项目领域服务
 * 处理跨聚合根的业务逻辑
 */
import { Project } from './project.aggregate.js';
import { ensureProjectWorkspace } from '../infrastructure/project-files.js';

export class ProjectService {
  constructor(projectRepository) {
    this.projectRepository = projectRepository;
  }

  /**
   * 创建项目
   */
  async createProject(ideaId, name, mode, userId) {
    // 检查创意是否已有有效项目
    const hasActiveProject = await this.projectRepository.existsByIdeaId(ideaId, userId);
    if (hasActiveProject) {
      throw new Error('该创意已创建项目');
    }

    // 创建项目
    const project = Project.create(ideaId, name, mode, userId);

    // 初始化项目文件空间
    try {
      const { artifactRoot } = await ensureProjectWorkspace(project);
      if (!project.artifactRoot && artifactRoot) {
        project.update({ artifactRoot });
      }
    } catch (error) {
      // 不阻塞项目创建，但记录问题
      console.warn('[ProjectService] 初始化项目文件空间失败:', error);
    }

    // 保存项目
    await this.projectRepository.save(project);

    return project;
  }

  /**
   * 更新项目
   */
  async updateProject(projectId, updates, userId) {
    // 查找项目
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
    if (userId && project.userId !== userId) {
      throw new Error('无权访问该项目');
    }

    // 更新项目
    project.update(updates);

    // 保存项目
    await this.projectRepository.save(project);

    return project;
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId, userId) {
    // 查找项目
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
    if (userId && project.userId !== userId) {
      throw new Error('无权访问该项目');
    }

    // 删除项目（软删除）
    project.delete();

    // 保存项目
    await this.projectRepository.save(project);

    return project;
  }

  /**
   * 自定义工作流
   */
  async customizeWorkflow(projectId, stages, userId) {
    // 查找项目
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
    if (userId && project.userId !== userId) {
      throw new Error('无权访问该项目');
    }

    // 自定义工作流
    project.customizeWorkflow(stages);

    // 保存项目
    await this.projectRepository.save(project);

    return project;
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStatistics(userId) {
    const [totalCount, countByStatus, countByMode, recentProjects] = await Promise.all([
      this.projectRepository.count({ userId }),
      this.projectRepository.countByStatus(userId),
      this.projectRepository.countByMode(userId),
      this.projectRepository.findRecent(5, userId)
    ]);

    return {
      totalCount,
      countByStatus,
      countByMode,
      recentProjects
    };
  }

  /**
   * 批量更新项目状态
   */
  async batchUpdateStatus(projectIds, status, userId) {
    const results = [];

    for (const projectId of projectIds) {
      try {
        const project = await this.updateProject(projectId, { status }, userId);
        results.push({
          projectId,
          success: true,
          project
        });
      } catch (error) {
        results.push({
          projectId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 查找相关项目
   */
  async findRelatedProjects(projectId, limit = 5, userId) {
    // 查找当前项目
    const currentProject = await this.projectRepository.findById(projectId);
    if (!currentProject) {
      throw new Error('项目不存在');
    }
    if (userId && currentProject.userId !== userId) {
      throw new Error('无权访问该项目');
    }

    // 查找同一创意的其他项目
    const sameIdeaProjects = await this.projectRepository.findAll({
      ideaId: currentProject.ideaId.value,
      excludeIds: [projectId],
      userId
    });

    if (sameIdeaProjects.length >= limit) {
      return sameIdeaProjects.slice(0, limit);
    }

    // 如果同一创意的项目不够，查找同模式的项目
    const sameModeProjects = await this.projectRepository.findAll({
      mode: currentProject.mode.value,
      excludeIds: [projectId, ...sameIdeaProjects.map(p => p.id.value)],
      userId
    });

    // 合并结果
    const relatedProjects = [...sameIdeaProjects, ...sameModeProjects];
    return relatedProjects.slice(0, limit);
  }

  /**
   * 归档项目
   */
  async archiveProject(projectId, userId) {
    // 查找项目
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
    if (userId && project.userId !== userId) {
      throw new Error('无权访问该项目');
    }

    // 更新状态为已完成
    project.update({ status: 'completed' });

    // 保存项目
    await this.projectRepository.save(project);

    return project;
  }

  /**
   * 复制项目
   */
  async duplicateProject(projectId, newName, userId) {
    // 查找原项目
    const originalProject = await this.projectRepository.findById(projectId);
    if (!originalProject) {
      throw new Error('项目不存在');
    }
    if (userId && originalProject.userId !== userId) {
      throw new Error('无权访问该项目');
    }

    // 创建新项目（使用新的创意ID）
    const newProject = Project.create(
      `duplicate-${originalProject.ideaId.value}-${Date.now()}`,
      newName || `${originalProject.name.value} (副本)`,
      originalProject.mode.value,
      originalProject.userId
    );

    // 复制工作流（如果存在）
    if (originalProject.workflow) {
      const workflowData = originalProject.workflow.toJSON();
      newProject.customizeWorkflow(workflowData.stages);
    }

    // 保存新项目
    await this.projectRepository.save(newProject);

    return newProject;
  }

  /**
   * 搜索项目
   */
  async searchProjects(query, filters = {}, userId) {
    // 构建搜索条件
    const searchFilters = {
      ...filters,
      search: query
    };
    if (userId) {
      searchFilters.userId = userId;
    }

    // 执行搜索
    const projects = await this.projectRepository.findAll(searchFilters);

    return projects;
  }

  /**
   * 获取项目进度
   */
  async getProjectProgress(projectId, userId) {
    // 查找项目
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('项目不存在');
    }
    if (userId && project.userId !== userId) {
      throw new Error('无权访问该项目');
    }

    if (!project.workflow) {
      return {
        percentage: 0,
        currentStage: null,
        completedStages: 0,
        totalStages: 0
      };
    }

    const workflow = project.workflow;
    const currentStage = workflow.getCurrentStage();
    const completedStages = workflow.stages.filter(stage => stage.isCompleted()).length;
    const totalStages = workflow.stages.length;
    const percentage = workflow.getCompletionPercentage();

    return {
      percentage,
      currentStage: currentStage
        ? {
          id: currentStage.id,
          name: currentStage.name,
          status: currentStage.status
        }
        : null,
      completedStages,
      totalStages
    };
  }
}
