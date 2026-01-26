/**
 * 用户内存仓库实现
 * 用于演示和测试
 */
import { UserRepository } from '../domain/user.repository.js';
import { User } from '../domain/user.aggregate.js';
import { UserId } from '../domain/value-objects/user-id.vo.js';
import { Username } from '../domain/value-objects/username.vo.js';
import { Email } from '../domain/value-objects/email.vo.js';
import { Password } from '../domain/value-objects/password.vo.js';
import { UserStatus } from '../domain/value-objects/user-status.vo.js';

export class UserInMemoryRepository extends UserRepository {
  constructor() {
    super();
    this.users = new Map();
    this.initDemoData();
  }

  /**
   * 初始化演示数据
   */
  initDemoData() {
    // 创建演示用户
    const demoUser = new User(
      UserId.fromString('user-1'),
      new Username('demo'),
      new Email('demo@example.com'),
      Password.create('demo123'),
      UserStatus.ACTIVE
    );

    this.users.set(demoUser.id.value, demoUser);
  }

  /**
   * 根据ID查找用户
   */
  async findById(id) {
    const userId = id instanceof UserId ? id : UserId.fromString(id);
    return this.users.get(userId.value) || null;
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username) {
    const usernameObj = username instanceof Username ? username : new Username(username);

    for (const user of this.users.values()) {
      if (user.username.equals(usernameObj)) {
        return user;
      }
    }

    return null;
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email) {
    const emailObj = email instanceof Email ? email : new Email(email);

    for (const user of this.users.values()) {
      if (user.email.equals(emailObj)) {
        return user;
      }
    }

    return null;
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
   * 检查用户名是否已存在
   */
  async existsByUsername(username) {
    const user = await this.findByUsername(username);
    return user !== null;
  }

  /**
   * 检查邮箱是否已存在
   */
  async existsByEmail(email) {
    const user = await this.findByEmail(email);
    return user !== null;
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
}

// 导出单例实例
export const userRepository = new UserInMemoryRepository();
