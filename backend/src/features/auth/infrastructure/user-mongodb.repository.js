/**
 * 用户MongoDB仓库实现
 * 使用Mongoose进行数据持久化
 */
import { UserRepository } from '../domain/user.repository.js';
import { User } from '../domain/user.aggregate.js';
import { UserId } from '../domain/value-objects/user-id.vo.js';
import { Username } from '../domain/value-objects/username.vo.js';
import { Email } from '../domain/value-objects/email.vo.js';
import { Password } from '../domain/value-objects/password.vo.js';
import { UserStatus } from '../domain/value-objects/user-status.vo.js';
import { UserModel } from './user.model.js';

export class UserMongoRepository extends UserRepository {
  /**
   * 将领域模型转换为Mongoose文档
   */
  toDocument(user) {
    return {
      userId: user.id.value,
      username: user.username.value,
      email: user.email.value,
      passwordHash: user.password.hash,
      status: user.status.value,
      lastLoginAt: user.lastLoginAt,
      loginAttempts: user.loginAttempts,
      lockedUntil: user.lockedUntil,
      emailVerified: user.emailVerified || false,
      emailVerificationToken: user.emailVerificationToken || null,
      emailVerificationExpires: user.emailVerificationExpires || null,
      passwordResetToken: user.passwordResetToken || null,
      passwordResetExpires: user.passwordResetExpires || null,
      loginHistory: user.loginHistory || [],
      preferences: user.preferences || {
        language: 'zh-CN',
        theme: 'light',
        notifications: { email: true, push: true }
      },
      deletedAt: user.deletedAt || null
    };
  }

  /**
   * 将Mongoose文档转换为领域模型
   */
  toDomain(doc) {
    if (!doc) return null;

    const user = new User(
      UserId.fromString(doc.userId),
      new Username(doc.username),
      new Email(doc.email),
      Password.fromHash(doc.passwordHash),
      UserStatus.fromString(doc.status)
    );

    // 设置其他属性
    user._lastLoginAt = doc.lastLoginAt;
    user._loginAttempts = doc.loginAttempts;
    user._lockedUntil = doc.lockedUntil;
    user.emailVerified = doc.emailVerified;
    user.emailVerificationToken = doc.emailVerificationToken;
    user.emailVerificationExpires = doc.emailVerificationExpires;
    user.passwordResetToken = doc.passwordResetToken;
    user.passwordResetExpires = doc.passwordResetExpires;
    user.loginHistory = doc.loginHistory;
    user.preferences = doc.preferences;
    user.deletedAt = doc.deletedAt;
    user.createdAt = doc.createdAt;
    user.updatedAt = doc.updatedAt;

    return user;
  }

  /**
   * 根据ID查找用户
   */
  async findById(id) {
    try {
      const userId = id instanceof UserId ? id.value : id;
      const doc = await UserModel.findOne({ userId });
      return this.toDomain(doc);
    } catch (error) {
      console.error('[UserMongoRepository] findById error:', error);
      throw error;
    }
  }

  /**
   * 根据用户名查找用户
   */
  async findByUsername(username) {
    try {
      const usernameValue = username instanceof Username ? username.value : username.toLowerCase().trim();
      const doc = await UserModel.findOne({ username: usernameValue });
      return this.toDomain(doc);
    } catch (error) {
      console.error('[UserMongoRepository] findByUsername error:', error);
      throw error;
    }
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email) {
    try {
      const emailValue = email instanceof Email ? email.value : email.toLowerCase().trim();
      const doc = await UserModel.findOne({ email: emailValue });
      return this.toDomain(doc);
    } catch (error) {
      console.error('[UserMongoRepository] findByEmail error:', error);
      throw error;
    }
  }

  /**
   * 保存用户
   */
  async save(user) {
    try {
      // 验证用户
      user.validate();

      const data = this.toDocument(user);

      // 更新或创建
      const doc = await UserModel.findOneAndUpdate(
        { userId: data.userId },
        data,
        { upsert: true, new: true, runValidators: true }
      );

      // 发布领域事件（这里可以集成事件总线）
      const events = user.getDomainEvents();
      for (const event of events) {
        // TODO: 发布到事件总线
        console.log('[UserMongoRepository] Domain event:', event.eventName);
      }

      // 清除领域事件
      user.clearDomainEvents();

      return this.toDomain(doc);
    } catch (error) {
      console.error('[UserMongoRepository] save error:', error);
      throw error;
    }
  }

  /**
   * 删除用户（软删除）
   */
  async delete(id) {
    try {
      const userId = id instanceof UserId ? id.value : id;
      const result = await UserModel.updateOne(
        { userId },
        { deletedAt: new Date() }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('[UserMongoRepository] delete error:', error);
      throw error;
    }
  }

  /**
   * 物理删除用户（仅用于测试）
   */
  async hardDelete(id) {
    try {
      const userId = id instanceof UserId ? id.value : id;
      const result = await UserModel.deleteOne({ userId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('[UserMongoRepository] hardDelete error:', error);
      throw error;
    }
  }

  /**
   * 检查用户名是否已存在
   */
  async existsByUsername(username) {
    try {
      const usernameValue = username instanceof Username ? username.value : username.toLowerCase().trim();
      const count = await UserModel.countDocuments({ username: usernameValue });
      return count > 0;
    } catch (error) {
      console.error('[UserMongoRepository] existsByUsername error:', error);
      throw error;
    }
  }

  /**
   * 检查邮箱是否已存在
   */
  async existsByEmail(email) {
    try {
      const emailValue = email instanceof Email ? email.value : email.toLowerCase().trim();
      const count = await UserModel.countDocuments({ email: emailValue });
      return count > 0;
    } catch (error) {
      console.error('[UserMongoRepository] existsByEmail error:', error);
      throw error;
    }
  }

  /**
   * 获取所有用户
   */
  async findAll() {
    try {
      const docs = await UserModel.find().sort({ createdAt: -1 });
      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('[UserMongoRepository] findAll error:', error);
      throw error;
    }
  }

  /**
   * 统计用户数量
   */
  async count() {
    try {
      return await UserModel.countDocuments();
    } catch (error) {
      console.error('[UserMongoRepository] count error:', error);
      throw error;
    }
  }

  /**
   * 清空所有用户（仅用于测试）
   */
  async clear() {
    try {
      await UserModel.deleteMany({});
    } catch (error) {
      console.error('[UserMongoRepository] clear error:', error);
      throw error;
    }
  }

  /**
   * 获取下一个ID
   */
  nextId() {
    return UserId.generate();
  }
}
