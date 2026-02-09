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
import { logger } from '../../../../middleware/logger.js';

export class ProjectMongoRepository {
  /**
   * 根据ID查找项目
   */
  async findById(projectId) {
    try {
      // 使用 findOne 而不是 findById，因为我们使用自定义字符串 ID
      const doc = await ProjectModel.findOne({ _id: projectId }).lean();
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

      const query = { userId, status: { $ne: ProjectStatus.DELETED.value } };
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
  async findByIdeaId(ideaId, userId) {
    try {
      const ideaIdValue = ideaId instanceof IdeaId ? ideaId.value : ideaId;
      const query = {
        ideaId: ideaIdValue,
        status: { $ne: ProjectStatus.DELETED.value }
      };
      if (userId) {
        query.userId = userId;
      }

      const doc = await ProjectModel.findOne(query).lean();

      if (!doc) {
        return null;
      }

      return this._toDomain(doc);
    } catch (error) {
      logger.error('[ProjectMongoRepository] 根据IdeaID查找项目失败:', error);
      throw error;
    }
  }

  /**
   * 检查创意是否已有有效项目
   */
  async existsByIdeaId(ideaId, userId) {
    try {
      const ideaIdValue = ideaId instanceof IdeaId ? ideaId.value : ideaId;

      const query = {
        ideaId: ideaIdValue,
        status: { $ne: ProjectStatus.DELETED.value }
      };
      if (userId) {
        query.userId = userId;
      }

      const count = await ProjectModel.countDocuments(query);

      return count > 0;
    } catch (error) {
      logger.error('[ProjectMongoRepository] 检查创意项目存在性失败:', error);
      throw error;
    }
  }

  /**
   * 保存项目
   */
  async save(project) {
    try {
      const data = this._toPersistence(project);
      const normalizeWorkflow = workflow => {
        if (!workflow) {
          return workflow;
        }
        if (Array.isArray(workflow.stages)) {
          return workflow;
        }
        if (workflow.stages) {
          return { ...workflow, stages: [workflow.stages] };
        }
        if (workflow.id && workflow.name && workflow.status) {
          return { stages: [workflow] };
        }
        return { ...workflow, stages: [] };
      };
      data.workflow = normalizeWorkflow(data.workflow);
      if (data.workflow) {
        data.workflow = JSON.parse(JSON.stringify(data.workflow));
        const stagesValue = data.workflow.stages;
        if (Array.isArray(stagesValue)) {
          data.workflow.stages = stagesValue;
        } else if (stagesValue && typeof stagesValue === 'object') {
          data.workflow.stages =
            stagesValue.id || stagesValue.name || stagesValue.status
              ? [stagesValue]
              : Object.values(stagesValue);
        } else {
          data.workflow.stages = [];
        }
        if (!Array.isArray(data.workflow.stages)) {
          logger.warn('[ProjectMongoRepository] workflow.stages仍非数组，已重置为空数组');
          data.workflow.stages = [];
        }
      }

      logger.debug(
        '[ProjectMongoRepository] save - project status:',
        project.status?.value || project._status?.value
      );
      logger.debug('[ProjectMongoRepository] save - data.status:', data.status);
      logger.debug('[ProjectMongoRepository] save - data._id:', data._id);

      // 使用 updateOne 而不是 findByIdAndUpdate，因为我们使用自定义字符串 ID
      const { _id, ...updateData } = data;
      await ProjectModel.collection.updateOne({ _id }, { $set: updateData }, { upsert: true });

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
      // 使用 updateOne 而不是 findByIdAndUpdate，因为我们使用自定义字符串 ID
      await ProjectModel.updateOne(
        { _id: projectId },
        {
          status: 'deleted',
          updatedAt: new Date()
        }
      );
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
   * 查找所有项目
   */
  async findAll(filters = {}) {
    try {
      const { status, mode, limit = 50, offset = 0, sortBy = 'updatedAt', userId } = filters;

      const query = {};

      // 排除已删除的项目
      query.status = { $ne: 'deleted' };

      if (userId) {
        query.userId = userId;
      }
      if (status) {
        query.status = status;
      }
      if (mode) {
        query.mode = mode;
      }

      const docs = await ProjectModel.find(query)
        .sort({ [sortBy]: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return docs.map(doc => this._toDomain(doc));
    } catch (error) {
      logger.error('[ProjectMongoRepository] 查找所有项目失败:', error);
      throw error;
    }
  }

  /**
   * 统计项目数量
   */
  async count(filters = {}) {
    try {
      const { status, mode, userId } = filters;

      const query = {};

      // 排除已删除的项目
      query.status = { $ne: 'deleted' };

      if (userId) {
        query.userId = userId;
      }
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
   * 按状态统计项目数量
   */
  async countByStatus(userId) {
    const match = { status: { $ne: 'deleted' } };
    if (userId) {
      match.userId = userId;
    }

    const results = await ProjectModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  /**
   * 按模式统计项目数量
   */
  async countByMode(userId) {
    const match = { status: { $ne: 'deleted' } };
    if (userId) {
      match.userId = userId;
    }

    const results = await ProjectModel.aggregate([
      { $match: match },
      { $group: { _id: '$mode', count: { $sum: 1 } } }
    ]);

    return results.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  /**
   * 获取最近的项目
   */
  async findRecent(limit = 10, userId) {
    const query = { status: { $ne: 'deleted' } };
    if (userId) {
      query.userId = userId;
    }

    const docs = await ProjectModel.find(query).sort({ updatedAt: -1 }).limit(limit).lean();

    return docs.map(doc => this._toDomain(doc));
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
      const rawStages = doc.workflow.stages;
      const stages = Array.isArray(rawStages)
        ? rawStages
        : rawStages &&
            typeof rawStages === 'object' &&
            (rawStages.id || rawStages.name || rawStages.status)
          ? [rawStages]
          : Object.values(rawStages || {});
      workflow = Workflow.fromJSON({
        ...doc.workflow,
        stages
      });
    }

    const project = new Project(
      projectId,
      doc.userId,
      ideaId,
      name,
      mode,
      status,
      workflow,
      doc.workflowCategory || 'product-development',
      doc.assignedAgents || [],
      doc.collaborationSuggestion || null,
      Boolean(doc.collaborationExecuted),
      doc.missingRecommendedAgents || [],
      doc.artifactRoot || null
    );

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
    const normalizeStages = stages => {
      if (!stages) {
        return [];
      }
      const list = Array.isArray(stages)
        ? stages
        : stages && typeof stages === 'object' && (stages.id || stages.name || stages.status)
          ? [stages]
          : Object.values(stages);
      return list.filter(Boolean).map((stage, index) => ({
        id: stage.id || stage.stageId || `stage-${index + 1}`,
        name: stage.name || `阶段${index + 1}`,
        orderNumber: Number.isFinite(stage.orderNumber)
          ? stage.orderNumber
          : Number.isFinite(stage.order)
            ? stage.order
            : index + 1,
        description: stage.description || '',
        status: stage.status || 'pending',
        agents: Array.isArray(stage.agents) ? stage.agents : [],
        agentRoles: Array.isArray(stage.agentRoles) ? stage.agentRoles : [],
        dependencies: Array.isArray(stage.dependencies) ? stage.dependencies : [],
        priority: stage.priority,
        outputs: Array.isArray(stage.outputs) ? stage.outputs : [],
        outputsDetailed: Array.isArray(stage.outputsDetailed) ? stage.outputsDetailed : [],
        artifacts: Array.isArray(stage.artifacts) ? stage.artifacts : [],
        startedAt: stage.startedAt || null,
        completedAt: stage.completedAt || null
      }));
    };

    const normalizedStages = json.workflow ? normalizeStages(json.workflow.stages) : [];
    const workflow = json.workflow
      ? {
          stages: normalizedStages,
          currentStage: json.workflow.currentStage || json.workflow.currentStageId || null,
          isCustomized: Boolean(
            json.workflow.isCustomized !== undefined
              ? json.workflow.isCustomized
              : json.workflow.isCustom
          )
        }
      : null;

    if (workflow && !Array.isArray(workflow.stages)) {
      workflow.stages = workflow.stages ? [workflow.stages] : [];
    }

    const idValue = json.id?.value || json.id;
    return {
      _id: idValue,
      ideaId: json.ideaId,
      userId: json.userId,
      name: json.name,
      mode: json.mode,
      status: json.status,
      workflowCategory: json.workflowCategory || 'product-development',
      assignedAgents: json.assignedAgents || [],
      collaborationSuggestion: json.collaborationSuggestion || null,
      collaborationExecuted: Boolean(json.collaborationExecuted),
      missingRecommendedAgents: json.missingRecommendedAgents || [],
      workflow,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt
    };
  }
}
