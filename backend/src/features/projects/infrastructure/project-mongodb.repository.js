/**
 * Project MongoDB仓库实现
 * 处理项目实体的持久化
 */
import { ProjectModel } from './project.model.js';
import { Project } from '../domain/project.aggregate.js';
import { ProjectId } from '../domain/value-objects/project-id.vo.js';
import { ProjectName } from '../domain/value-objects/project-name.vo.js';
import { ProjectMode } from '../domain/value-objects/project-mode.vo.js';
import { ProjectStatus } from '../domain/value-objects/project-status.vo.js';
import { IdeaId } from '../domain/value-objects/idea-id.vo.js';
import { Workflow } from '../domain/entities/workflow.entity.js';
import { Demo } from '../domain/entities/demo.entity.js';
import logger from '../../../infrastructure/logger/logger.js';

export class ProjectMongoRepository {
  /**
   * 根据ID查找项目
   */
  async findById(projectId) {
    try {
      const doc = await ProjectModel.findById(projectId).lean();
      if (!doc) {
        return null;
      }
      return this._toDomain(doc);
    } catch (error) {
      logger.error('[ProjectMongoRepository] 查找项目失败:', error);
      throw error;
    }
  }

  /**
   * 根据用户ID查找所有项目
   */
  async findByUserId(userId, options = {}) {
    try {
      const { status, mode, limit = 50, offset = 0 } = options;

      const query = { userId };
      if (status) {
        query.status = status;
      }
      if (mode) {
        query.mode = mode;
      }

      const docs = await ProjectModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return docs.map(doc => this._toDomain(doc));
    } catch (error) {
      logger.error('[ProjectMongoRepository] 查找用户项目失败:', error);
      throw error;
    }
  }

  /**
   * 根据IdeaID查找项目
   */
  async findByIdeaId(ideaId) {
    try {
      const docs = await ProjectModel.find({ ideaId }).lean();
      return docs.map(doc => this._toDomain(doc));
    } catch (error) {
      logger.error('[ProjectMongoRepository] 根据IdeaID查找项目失败:', error);
      throw error;
    }
  }

  /**
   * 保存项目
   */
  async save(project) {
    try {
      const data = this._toPersistence(project);

      await ProjectModel.findByIdAndUpdate(data._id, data, {
        upsert: true,
        new: true
      });

      // 发布领域事件
      const events = project.getDomainEvents();
      for (const event of events) {
        // TODO: 发布到事件总线
        logger.info('[ProjectMongoRepository] Domain event:', event.eventName);
      }
      project.clearDomainEvents();

      return project;
    } catch (error) {
      logger.error('[ProjectMongoRepository] 保存项目失败:', error);
      throw error;
    }
  }

  /**
   * 删除项目（软删除）
   */
  async delete(projectId) {
    try {
      await ProjectModel.findByIdAndUpdate(projectId, {
        status: 'deleted',
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('[ProjectMongoRepository] 删除项目失败:', error);
      throw error;
    }
  }

  /**
   * 统计用户项目数量
   */
  async countByUserId(userId, options = {}) {
    try {
      const { status, mode } = options;
      const query = { userId };

      if (status) {
        query.status = status;
      }
      if (mode) {
        query.mode = mode;
      }

      return await ProjectModel.countDocuments(query);
    } catch (error) {
      logger.error('[ProjectMongoRepository] 统计项目数量失败:', error);
      throw error;
    }
  }

  /**
   * 将数据库文档转换为领域对象
   */
  _toDomain(doc) {
    const projectId = new ProjectId(doc._id);
    const ideaId = new IdeaId(doc.ideaId);
    const name = new ProjectName(doc.name);
    const mode = ProjectMode.fromString(doc.mode);
    const status = ProjectStatus.fromString(doc.status);

    let workflow = null;
    if (doc.workflow) {
      workflow = Workflow.fromJSON(doc.workflow);
    }

    let demo = null;
    if (doc.demo) {
      demo = Demo.fromJSON(doc.demo);
    }

    const project = new Project(projectId, ideaId, name, mode, status, workflow, demo);

    // 设置时间戳
    project._createdAt = doc.createdAt;
    project._updatedAt = doc.updatedAt;

    return project;
  }

  /**
   * 将领域对象转换为数据库文档
   */
  _toPersistence(project) {
    const json = project.toJSON();

    return {
      _id: json.id,
      ideaId: json.ideaId,
      userId: json.userId || 'system', // TODO: 从上下文获取userId
      name: json.name,
      mode: json.mode,
      status: json.status,
      workflow: json.workflow,
      demo: json.demo,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt
    };
  }
}
