/**
 * 用户内存仓库实现
 * 用于演示和测试
 */
import { UserRepository } from '../domain/user.repository.js';
import { User } from '../domain/user.aggregate.js';
import { UserId } from '../domain/value-objects/user-id.vo.js';
import { Phone } from '../domain/value-objects/phone.vo.js';

export class UserInMemoryRepository extends UserRepository {
  constructor() {
    super();
    this.users = new Map();
  }

  /**
   * 根据ID查找用户
   */
  async findById(id) {
    const userId = id instanceof UserId ? id : UserId.fromString(id);
    return this.users.get(userId.value) || null;
  }

  /**
   * 保存用户
   */
  async save(user) {
    // 验证用户
    user.validate();

    // 保存用户
    this.users.set(user.id.value, user);

    // 发布领域事件
    const events = user.getDomainEvents();
    for (const event of events) {
      // 这里可以发布到事件总线
    }

    // 清除领域事件
    user.clearDomainEvents();

    return user;
  }

  /**
   * 删除用户
   */
  async delete(id) {
    const userId = id instanceof UserId ? id : UserId.fromString(id);
    return this.users.delete(userId.value);
  }

  /**
   * 获取所有用户
   */
  async findAll() {
    return Array.from(this.users.values());
  }

  /**
   * 统计用户数量
   */
  async count() {
    return this.users.size;
  }

  /**
   * 清空所有用户（仅用于测试）
   */
  async clear() {
    this.users.clear();
  }

  /**
   * 获取下一个ID
   */
  nextId() {
    return UserId.generate();
  }

  /**
   * 根据手机号查找用户
   */
  async findByPhone(phone) {
    const phoneValue = phone instanceof Phone ? phone.value : phone;
    for (const user of this.users.values()) {
      if (user.phone && user.phone.value === phoneValue) {
        return user;
      }
    }
    return null;
  }
}

// 导出单例实例
export const userRepository = new UserInMemoryRepository();
