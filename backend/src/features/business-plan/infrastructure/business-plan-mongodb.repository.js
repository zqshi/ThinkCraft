/**
 * BusinessPlan MongoDB仓库实现
 * 处理商业计划书的持久化
 */
import { BusinessPlanModel } from './business-plan.model.js';
import { BusinessPlan } from '../domain/business-plan.aggregate.js';
import { BusinessPlanId } from '../domain/value-objects/business-plan-id.vo.js';
import { BusinessPlanStatus } from '../domain/value-objects/business-plan-status.vo.js';
import { ChapterId } from '../domain/value-objects/chapter-id.vo.js';
import { logger } from '../../../../middleware/logger.js';

export class BusinessPlanMongoRepository {
  /**
   * 根据ID查找商业计划书
   */
  async findById(businessPlanId) {
    try {
      const doc = await BusinessPlanModel.findById(businessPlanId).lean();
      if (!doc) {
        return null;
      }
      return this._toDomain(doc);
    } catch (error) {
      logger.error('[BusinessPlanMongoRepository] 查找商业计划书失败:', error);
      throw error;
    }
  }

  /**
   * 根据项目ID查找商业计划书
   */
  async findByProjectId(projectId) {
    try {
      const docs = await BusinessPlanModel.find({ projectId }).sort({ createdAt: -1 }).lean();
      return docs.map(doc => this._toDomain(doc));
    } catch (error) {
      logger.error('[BusinessPlanMongoRepository] 根据项目ID查找商业计划书失败:', error);
      throw error;
    }
  }

  /**
   * 根据用户ID查找所有商业计划书
   */
  async findByUserId(userId, options = {}) {
    try {
      const { status, limit = 50, offset = 0 } = options;

      const query = { userId };
      if (status) {
        query.status = status;
      } else {
        query.status = { $ne: 'deleted' };
      }

      const docs = await BusinessPlanModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean();

      return docs.map(doc => this._toDomain(doc));
    } catch (error) {
      logger.error('[BusinessPlanMongoRepository] 查找用户商业计划书失败:', error);
      throw error;
    }
  }

  /**
   * 保存商业计划书
   */
  async save(businessPlan) {
    try {
      const data = this._toPersistence(businessPlan);

      await BusinessPlanModel.findByIdAndUpdate(data._id, data, {
        upsert: true,
        new: true
      });

      // 发布领域事件
      const events = businessPlan.getDomainEvents();
      for (const event of events) {
        // TODO: 发布到事件总线
        logger.info('[BusinessPlanMongoRepository] Domain event:', event.eventName);
      }
      businessPlan.clearDomainEvents();

      return businessPlan;
    } catch (error) {
      logger.error('[BusinessPlanMongoRepository] 保存商业计划书失败:', error);
      throw error;
    }
  }

  /**
   * 删除商业计划书（软删除）
   */
  async delete(businessPlanId) {
    try {
      await BusinessPlanModel.findByIdAndUpdate(businessPlanId, {
        status: 'deleted',
        updatedAt: new Date()
      });
    } catch (error) {
      logger.error('[BusinessPlanMongoRepository] 删除商业计划书失败:', error);
      throw error;
    }
  }

  /**
   * 统计用户商业计划书数量
   */
  async countByUserId(userId, options = {}) {
    try {
      const { status } = options;
      const query = { userId };

      if (status) {
        query.status = status;
      } else {
        query.status = { $ne: 'deleted' };
      }

      return await BusinessPlanModel.countDocuments(query);
    } catch (error) {
      logger.error('[BusinessPlanMongoRepository] 统计商业计划书数量失败:', error);
      throw error;
    }
  }

  /**
   * 将数据库文档转换为领域对象
   */
  _toDomain(doc) {
    const businessPlanId = new BusinessPlanId(doc._id);
    const status = BusinessPlanStatus.fromString(doc.status);

    // 转换章节Map
    const chapters = new Map();
    if (doc.chapters && Array.isArray(doc.chapters)) {
      doc.chapters.forEach(chapter => {
        chapters.set(chapter.id, {
          id: new ChapterId(chapter.id),
          content: chapter.content,
          tokens: chapter.tokens,
          cost: chapter.cost,
          generatedAt: new Date(chapter.generatedAt)
        });
      });
    }

    const businessPlan = new BusinessPlan(businessPlanId, {
      title: doc.title,
      status,
      projectId: doc.projectId,
      chapters,
      generatedBy: doc.generatedBy,
      totalTokens: doc.totalTokens,
      cost: doc.cost,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
      completedAt: doc.completedAt ? new Date(doc.completedAt) : null
    });

    return businessPlan;
  }

  /**
   * 将领域对象转换为数据库文档
   */
  _toPersistence(businessPlan) {
    const json = businessPlan.toJSON();

    // 转换章节数组
    const chapters = json.chapters.map(chapter => ({
      id: chapter.id,
      content: chapter.content,
      tokens: chapter.tokens,
      cost: chapter.cost,
      generatedAt: chapter.generatedAt
    }));

    return {
      _id: json.id,
      projectId: json.projectId,
      userId: json.userId || 'system', // TODO: 从上下文获取userId
      title: json.title,
      status: json.status,
      chapters,
      generatedBy: json.generatedBy,
      totalTokens: json.totalTokens,
      cost: json.cost,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
      completedAt: json.completedAt
    };
  }
}
