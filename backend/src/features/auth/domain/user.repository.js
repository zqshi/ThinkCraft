/**
 * 用户仓库接口
 * 定义用户聚合根的持久化操作
 */
import { Repository } from '../../../shared/domain/repository.base.js';

export class UserRepository extends Repository {
  /**
   * 根据ID查找用户
   */
  async findById(id) {
    throw new Error('子类必须实现findById方法');
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username) {
    throw new Error('子类必须实现findByUsername方法');
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email) {
    throw new Error('子类必须实现findByEmail方法');
  }

  /**
   * 保存用户
   */
  async save(user) {
    throw new Error('子类必须实现save方法');
  }

  /**
   * 删除用户
   */
  async delete(id) {
    throw new Error('子类必须实现delete方法');
  }

  /**
   * 检查用户名是否已存在
   */
  async existsByUsername(username) {
    throw new Error('子类必须实现existsByUsername方法');
  }

  /**
   * 检查邮箱是否已存在
   */
  async existsByEmail(email) {
    throw new Error('子类必须实现existsByEmail方法');
  }

  /**
   * 获取所有用户
   */
  async findAll() {
    throw new Error('子类必须实现findAll方法');
  }

  /**
   * 统计用户数量
   */
  async count() {
    throw new Error('子类必须实现count方法');
  }
}
