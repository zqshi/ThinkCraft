/**
 * 商业计划书仓库接口
 * 定义商业计划书持久化的基本操作
 */
export class IBusinessPlanRepository {
  /**
   * 保存商业计划书
   */
  async save(businessPlan) {
    throw new Error('必须实现save方法');
  }

  /**
   * 根据ID查找商业计划书
   */
  async findById(id) {
    throw new Error('必须实现findById方法');
  }

  /**
   * 根据项目ID查找商业计划书
   */
  async findByProjectId(projectId) {
    throw new Error('必须实现findByProjectId方法');
  }

  /**
   * 查找用户的所有商业计划书
   */
  async findByUserId(userId) {
    throw new Error('必须实现findByUserId方法');
  }

  /**
   * 删除商业计划书
   */
  async delete(id) {
    throw new Error('必须实现delete方法');
  }
}
