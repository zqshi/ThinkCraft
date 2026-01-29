/**
 * 项目内存仓库实现
 * 用于演示和测试
 */
import { ProjectRepository } from '../domain/project.repository.js';
import { Project } from '../domain/project.aggregate.js';
import { ProjectId } from '../domain/value-objects/project-id.vo.js';
import { ProjectName } from '../domain/value-objects/project-name.vo.js';
import { ProjectMode } from '../domain/value-objects/project-mode.vo.js';
import { ProjectStatus } from '../domain/value-objects/project-status.vo.js';
import { IdeaId } from '../domain/value-objects/idea-id.vo.js';
import { Workflow } from '../domain/entities/workflow.entity.js';

export class ProjectInMemoryRepository extends ProjectRepository {
  constructor() {
    super();
    this.projects = new Map();
  }

  /**
   * 根据ID查找项目
   */
  async findById(id) {
    const projectId = id instanceof ProjectId ? id : ProjectId.fromString(id);
    return this.projects.get(projectId.value) || null;
  }

  /**
   * 根据创意ID查找项目
   */
  async findByIdeaId(ideaId) {
    const ideaIdObj = ideaId instanceof IdeaId ? ideaId : new IdeaId(ideaId);

    for (const project of this.projects.values()) {
      if (project.ideaId.equals(ideaIdObj)) {
        return project;
      }
    }

    return null;
  }

  /**
   * 查找所有项目
   */
  async findAll(filters = {}) {
    let projectList = Array.from(this.projects.values());

    // 应用过滤器
    if (filters.ideaId) {
      const ideaIdObj = new IdeaId(filters.ideaId);
      projectList = projectList.filter(p => p.ideaId.equals(ideaIdObj));
    }

    if (filters.mode) {
      const modeObj = ProjectMode.fromString(filters.mode);
      projectList = projectList.filter(p => p.mode.equals(modeObj));
    }

    if (filters.status) {
      const statusObj = ProjectStatus.fromString(filters.status);
      projectList = projectList.filter(p => p.status.equals(statusObj));
    }

    if (filters.excludeIds) {
      const excludeIds = filters.excludeIds.map(id => (id instanceof ProjectId ? id.value : id));
      projectList = projectList.filter(p => !excludeIds.includes(p.id.value));
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      projectList = projectList.filter(
        p =>
          p.name.value.toLowerCase().includes(searchTerm) ||
          p.ideaId.value.toLowerCase().includes(searchTerm)
      );
    }

    // 排序
    if (filters.sortBy === 'createdAt') {
      projectList.sort((a, b) => b.createdAt - a.createdAt);
    } else if (filters.sortBy === 'updatedAt') {
      projectList.sort((a, b) => b.updatedAt - a.updatedAt);
    } else if (filters.sortBy === 'name') {
      projectList.sort((a, b) => a.name.value.localeCompare(b.name.value));
    } else {
      // 默认按更新时间倒序
      projectList.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    // 分页
    if (filters.limit) {
      const offset = filters.offset || 0;
      projectList = projectList.slice(offset, offset + filters.limit);
    }

    return projectList;
  }

  /**
   * 保存项目
   */
  async save(project) {
    // 验证项目
    project.validate();

    // 保存项目
    this.projects.set(project.id.value, project);

    // 发布领域事件
    const events = project.getDomainEvents();
    for (const event of events) {
    }

    // 清除领域事件
    project.clearDomainEvents();

    return project;
  }

  /**
   * 删除项目
   */
  async delete(id) {
    const projectId = id instanceof ProjectId ? id : ProjectId.fromString(id);
    return this.projects.delete(projectId.value);
  }

  /**
   * 检查创意是否已有项目
   */
  async existsByIdeaId(ideaId) {
    const project = await this.findByIdeaId(ideaId);
    return project !== null;
  }

  /**
   * 统计项目数量
   */
  async count(filters = {}) {
    const projects = await this.findAll(filters);
    return projects.length;
  }

  /**
   * 按状态统计项目数量
   */
  async countByStatus() {
    const countByStatus = {};

    for (const project of this.projects.values()) {
      const status = project.status.value;
      countByStatus[status] = (countByStatus[status] || 0) + 1;
    }

    return countByStatus;
  }

  /**
   * 按模式统计项目数量
   */
  async countByMode() {
    const countByMode = {};

    for (const project of this.projects.values()) {
      const mode = project.mode.value;
      countByMode[mode] = (countByMode[mode] || 0) + 1;
    }

    return countByMode;
  }

  /**
   * 获取最近的项目
   */
  async findRecent(limit = 10) {
    return this.findAll({
      sortBy: 'updatedAt',
      limit: limit
    });
  }

  /**
   * 清空所有项目（仅用于测试）
   */
  async clear() {
    this.projects.clear();
  }

  /**
   * 获取下一个ID
   */
  nextId() {
    return ProjectId.generate();
  }
}

// 导出单例实例
export const projectRepository = new ProjectInMemoryRepository();
