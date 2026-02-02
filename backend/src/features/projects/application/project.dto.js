/**
 * 项目DTO（数据传输对象）
 * 用于在应用层和接口层之间传输数据
 */

export class CreateProjectRequestDTO {
  constructor(ideaId, name, mode, userId) {
    this.ideaId = ideaId;
    this.name = name;
    this.mode = mode || 'development';
    this.userId = userId;
  }

  validate() {
    if (!this.ideaId || typeof this.ideaId !== 'string') {
      throw new Error('创意ID不能为空');
    }

    if (!this.name || typeof this.name !== 'string') {
      throw new Error('项目名称不能为空');
    }

    if (this.mode && typeof this.mode !== 'string') {
      throw new Error('项目模式必须是字符串');
    }

    if (this.mode && !['development'].includes(this.mode)) {
      throw new Error('项目模式必须是 development');
    }

    if (this.name.length < 1 || this.name.length > 100) {
      throw new Error('项目名称长度必须在1-100个字符之间');
    }

    if (/[<>'"&]/.test(this.name)) {
      throw new Error('项目名称不能包含特殊字符: <>"\'&');
    }

    if (!this.userId || typeof this.userId !== 'string') {
      throw new Error('用户ID不能为空');
    }
  }
}

export class CreateProjectResponseDTO {
  constructor(project) {
    this.project = {
      id: project.id.value,
      userId: project.userId,
      ideaId: project.ideaId.value,
      name: project.name.value,
      mode: project.mode.value,
      status: project.status.value,
      workflowCategory: project.workflowCategory,
      assignedAgents: project.assignedAgents,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };

    if (project.workflow) {
      this.workflow = project.workflow.toJSON();
    }
  }
}

export class UpdateProjectRequestDTO {
  constructor(updates) {
    this.updates = updates;
  }

  validate() {
    if (!this.updates || typeof this.updates !== 'object') {
      throw new Error('更新数据不能为空');
    }

    if (this.updates.name !== undefined) {
      if (typeof this.updates.name !== 'string') {
        throw new Error('项目名称必须是字符串');
      }

      if (this.updates.name.length < 1 || this.updates.name.length > 100) {
        throw new Error('项目名称长度必须在1-100个字符之间');
      }

      if (/[<>'"&]/.test(this.updates.name)) {
        throw new Error('项目名称不能包含特殊字符: <>"\'&');
      }
    }

    if (this.updates.status !== undefined) {
      const validStatuses = [
        'planning',
        'in_progress',
        'testing',
        'completed',
        'on_hold',
        'cancelled'
      ];
      if (!validStatuses.includes(this.updates.status)) {
        throw new Error(`无效的项目状态: ${this.updates.status}`);
      }
    }

    if (this.updates.workflowCategory !== undefined) {
      if (typeof this.updates.workflowCategory !== 'string') {
        throw new Error('流程类型必须是字符串');
      }
    }

    if (this.updates.assignedAgents !== undefined) {
      if (!Array.isArray(this.updates.assignedAgents)) {
        throw new Error('assignedAgents 必须是数组');
      }
    }
  }
}

export class ProjectResponseDTO {
  constructor(project) {
    this.id = project.id.value;
    this.userId = project.userId;
    this.ideaId = project.ideaId.value;
    this.name = project.name.value;
    this.mode = project.mode.value;
    this.status = project.status.value;
    this.workflowCategory = project.workflowCategory;
    this.assignedAgents = project.assignedAgents;
    this.createdAt = project.createdAt;
    this.updatedAt = project.updatedAt;

    if (project.workflow) {
      this.workflow = project.workflow.toJSON();
    }
  }
}

export class ProjectListResponseDTO {
  constructor(projects, total) {
    this.projects = projects.map(project => new ProjectResponseDTO(project));
    this.total = total;
  }
}

export class CustomizeWorkflowRequestDTO {
  constructor(stages) {
    this.stages = stages;
  }

  validate() {
    if (!Array.isArray(this.stages) || this.stages.length === 0) {
      throw new Error('工作流阶段不能为空数组');
    }

    this.stages.forEach((stage, index) => {
      if (!stage.id || typeof stage.id !== 'string') {
        throw new Error(`阶段 ${index} 的ID不能为空`);
      }

      if (!stage.name || typeof stage.name !== 'string') {
        throw new Error(`阶段 ${index} 的名称不能为空`);
      }

      if (stage.status && !['pending', 'in_progress', 'completed'].includes(stage.status)) {
        throw new Error(`阶段 ${index} 的状态无效`);
      }
    });
  }
}

export class ProjectProgressDTO {
  constructor(progress) {
    this.percentage = progress.percentage;
    this.currentStage = progress.currentStage;
    this.completedStages = progress.completedStages;
    this.totalStages = progress.totalStages;
  }
}

export class ProjectStatisticsDTO {
  constructor(statistics) {
    this.totalCount = statistics.totalCount;
    this.countByStatus = statistics.countByStatus;
    this.countByMode = statistics.countByMode;
    this.recentProjects = statistics.recentProjects.map(p => new ProjectResponseDTO(p));
  }
}

export class SearchProjectsRequestDTO {
  constructor(query, filters = {}) {
    this.query = query;
    this.filters = filters;
  }

  validate() {
    if (!this.query || typeof this.query !== 'string') {
      throw new Error('搜索查询不能为空');
    }

    if (this.query.length < 2) {
      throw new Error('搜索查询至少需要2个字符');
    }

    if (this.filters.mode && !['development'].includes(this.filters.mode)) {
      throw new Error('项目模式必须是 development');
    }

    if (this.filters.status) {
      const validStatuses = [
        'planning',
        'in_progress',
        'testing',
        'completed',
        'on_hold',
        'cancelled'
      ];
      if (!validStatuses.includes(this.filters.status)) {
        throw new Error(`无效的项目状态: ${this.filters.status}`);
      }
    }
  }
}
