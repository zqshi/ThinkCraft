/**
 * 用户MongoDB仓库实现
 * 使用Mongoose进行数据持久化
 */
import { UserRepository } from '../domain/user.repository.js';
import { User } from '../domain/user.aggregate.js';
import { UserId } from '../domain/value-objects/user-id.vo.js';
import { Phone } from '../domain/value-objects/phone.vo.js';
import { UserStatus } from '../domain/value-objects/user-status.vo.js';
import { UserModel } from './user.model.js';
import { eventBus } from '../../../infrastructure/events/event-bus.js';

export class UserMongoRepository extends UserRepository {
  /**
   * 将领域模型转换为Mongoose文档
   */
  toDocument(user) {
    return {
      userId: user.id.value,
      phone: user.phone ? user.phone.value : null,
      phoneVerified: user.phoneVerified || false,
      status: user.status.value,
      lastLoginAt: user.lastLoginAt,
      loginAttempts: user.loginAttempts,
      lockedUntil: user.lockedUntil,
      loginHistory: user.loginHistory || [],
      preferences: user.preferences || {
        language: 'zh-CN',
        theme: 'light',
        notifications: { sms: true, push: true }
      },
      deletedAt: user.deletedAt || null
    };
  }

  /**
   * 将Mongoose文档转换为领域模型
   */
  toDomain(doc) {
    if (!doc) {
      return null;
    }

    const user = new User(
      UserId.fromString(doc.userId),
      UserStatus.fromString(doc.status),
      doc.phone ? new Phone(doc.phone) : null
    );

    // 设置其他属性
    user._phoneVerified = doc.phoneVerified || false;
    user._lastLoginAt = doc.lastLoginAt;
    user._loginAttempts = doc.loginAttempts;
    user._lockedUntil = doc.lockedUntil;
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
   * 根据手机号查找用户
   */
  async findByPhone(phone) {
    try {
      const phoneValue = typeof phone === 'string' ? phone.trim() : phone;
      const doc = await UserModel.findOne({ phone: phoneValue });
      return this.toDomain(doc);
    } catch (error) {
      console.error('[UserMongoRepository] findByPhone error:', error);
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
      const doc = await UserModel.findOneAndUpdate({ userId: data.userId }, data, {
        upsert: true,
        new: true,
        runValidators: true
      });

      // 发布领域事件到事件总线
      const events = user.getDomainEvents();
      for (const event of events) {
        await eventBus.publish(event);
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
      const result = await UserModel.updateOne({ userId }, { deletedAt: new Date() });
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
