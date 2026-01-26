/**
 * 项目仓库接口
 * 定义项目聚合根的持久化操作
 */
import { Repository } from '../../../shared/domain/repository.base.js';

export class ProjectRepository extends Repository {
  /**
   * 根据ID查找项目
   */
  async findById(id) {
    throw new Error('子类必须实现findById方法');
  }

  /**
   * 根据创意ID查找项目
   */
  async findByIdeaId(ideaId) {
    throw new Error('子类必须实现findByIdeaId方法');
  }

  /**
   * 查找所有项目
   */
  async findAll(filters = {}) {
    throw new Error('子类必须实现findAll方法');
  }

  /**
   * 保存项目
   */
  async save(project) {
    throw new Error('子类必须实现save方法');
  }

  /**
   * 删除项目
   */
  async delete(id) {
    throw new Error('子类必须实现delete方法');
  }

  /**
   * 检查创意是否已有项目
   */
  async existsByIdeaId(ideaId) {
    throw new Error('子类必须实现existsByIdeaId方法');
  }

  /**
   * 统计项目数量
   */
  async count(filters = {}) {
    throw new Error('子类必须实现count方法');
  }

  /**
   * 按状态统计项目数量
   */
  async countByStatus() {
    throw new Error('子类必须实现countByStatus方法');
  }

  /**
   * 按模式统计项目数量
   */
  async countByMode() {
    throw new Error('子类必须实现countByMode方法');
  }

  /**
   * 获取最近的项目
   */
  async findRecent(limit = 10) {
    throw new Error('子类必须实现findRecent方法');
  }
}
