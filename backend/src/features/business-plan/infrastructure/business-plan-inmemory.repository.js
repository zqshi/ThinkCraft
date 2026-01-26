/**
 * 商业计划书内存仓库实现
 * 用于开发和测试环境
 */
import { IBusinessPlanRepository } from '../domain/business-plan.repository.js';

export class BusinessPlanInMemoryRepository extends IBusinessPlanRepository {
  constructor() {
    super();
    this._businessPlans = new Map();
  }

  /**
   * 保存商业计划书
   */
  async save(businessPlan) {
    this._businessPlans.set(businessPlan.id.value, businessPlan);
    return businessPlan;
  }

  /**
   * 根据ID查找商业计划书
   */
  async findById(id) {
    return this._businessPlans.get(id.value) || null;
  }

  /**
   * 根据项目ID查找商业计划书
   */
  async findByProjectId(projectId) {
    for (const businessPlan of this._businessPlans.values()) {
      if (businessPlan.projectId === projectId) {
        return businessPlan;
      }
    }
    return null;
  }

  /**
   * 查找用户的所有商业计划书
   */
  async findByUserId(userId) {
    const result = [];
    for (const businessPlan of this._businessPlans.values()) {
      if (businessPlan.generatedBy === userId) {
        result.push(businessPlan);
      }
    }
    return result;
  }

  /**
   * 删除商业计划书
   */
  async delete(id) {
    return this._businessPlans.delete(id.value);
  }

  /**
   * 清空所有数据（仅用于测试）
   */
  async clear() {
    this._businessPlans.clear();
  }

  /**
   * 获取数量（仅用于测试）
   */
  get count() {
    return this._businessPlans.size;
  }
}
