/**
 * 账号管理用例
 * 处理个人信息管理、安全设置、偏好设置等业务逻辑
 */
import { Username } from '../domain/value-objects/username.vo.js';
import { Email } from '../domain/value-objects/email.vo.js';
import { PhoneVerificationUseCase } from './phone-verification.use-case.js';
import { logger } from '../../../shared/utils/logger.js';

export class AccountManagementUseCase {
  constructor(userRepository, phoneVerificationUseCase = null) {
    this.userRepository = userRepository;
    this.phoneVerificationUseCase = phoneVerificationUseCase || new PhoneVerificationUseCase(userRepository);
  }

  /**
   * 获取用户信息
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>}
   */
  async getUserInfo(userId) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      return {
        success: true,
        data: {
          userId: user.id.value,
          username: user.username.value,
          email: user.email.value,
          phone: user.phone ? user.phone.value : null,
          phoneVerified: user.phoneVerified,
          status: user.status.value,
          lastLoginAt: user.lastLoginAt,
          preferences: user.preferences,
          createdAt: user.createdAt
        }
      };
    } catch (error) {
      logger.error(`获取用户信息失败: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * 修改用户名
   * @param {string} userId - 用户ID
   * @param {string} newUsername - 新用户名
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async changeUsername(userId, newUsername) {
    try {
      // 查找用户
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查新用户名是否已被使用
      const existingUser = await this.userRepository.findByUsername(newUsername);
      if (existingUser && existingUser.id.value !== userId) {
        throw new Error('用户名已被使用');
      }

      // 更新用户名
      user._username = new Username(newUsername);

      // 保存
      await this.userRepository.save(user);

      logger.info(`用户名修改成功: ${userId}`);

      return {
        success: true,
        message: '用户名修改成功'
      };
    } catch (error) {
      logger.error(`修改用户名失败: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * 修改邮箱
   * @param {string} userId - 用户ID
   * @param {string} newEmail - 新邮箱
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async changeEmail(userId, newEmail) {
    try {
      // 查找用户
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查新邮箱是否已被使用
      const existingUser = await this.userRepository.findByEmail(newEmail);
      if (existingUser && existingUser.id.value !== userId) {
        throw new Error('邮箱已被使用');
      }

      // 更新邮箱
      user._email = new Email(newEmail);
      user.emailVerified = false; // 需要重新验证

      // 保存
      await this.userRepository.save(user);

      logger.info(`邮箱修改成功: ${userId}`);

      return {
        success: true,
        message: '邮箱修改成功，请重新验证'
      };
    } catch (error) {
      logger.error(`修改邮箱失败: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * 绑定手机号
   * @param {string} userId - 用户ID
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async bindPhone(userId, phone, code) {
    try {
      // 验证验证码
      await this.phoneVerificationUseCase.verifyCode(phone, code, 'bind');

      // 查找用户
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 绑定手机号
      user.bindPhone(phone);
      user.verifyPhone();

      // 保存
      await this.userRepository.save(user);

      logger.info(`手机号绑定成功: ${userId}`);

      return {
        success: true,
        message: '手机号绑定成功'
      };
    } catch (error) {
      logger.error(`绑定手机号失败: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * 更换手机号
   * @param {string} userId - 用户ID
   * @param {string} newPhone - 新手机号
   * @param {string} code - 验证码
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async changePhone(userId, newPhone, code) {
    try {
      // 验证验证码
      await this.phoneVerificationUseCase.verifyCode(newPhone, code, 'bind');

      // 查找用户
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 更换手机号
      user.changePhone(newPhone);
      user.verifyPhone();

      // 保存
      await this.userRepository.save(user);

      logger.info(`手机号更换成功: ${userId}`);

      return {
        success: true,
        message: '手机号更换成功'
      };
    } catch (error) {
      logger.error(`更换手机号失败: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * 修改密码
   * @param {string} userId - 用户ID
   * @param {string} oldPassword - 旧密码
   * @param {string} newPassword - 新密码
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // 查找用户
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 修改密码
      user.changePassword(oldPassword, newPassword);

      // 保存
      await this.userRepository.save(user);

      logger.info(`密码修改成功: ${userId}`);

      return {
        success: true,
        message: '密码修改成功'
      };
    } catch (error) {
      logger.error(`修改密码失败: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * 获取登录历史
   * @param {string} userId - 用户ID
   * @param {number} limit - 返回数量限制
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  async getLoginHistory(userId, limit = 10) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const history = (user.loginHistory || [])
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return {
        success: true,
        data: history
      };
    } catch (error) {
      logger.error(`获取登录历史失败: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * 更新偏好设置
   * @param {string} userId - 用户ID
   * @param {Object} preferences - 偏好设置
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async updatePreferences(userId, preferences) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 合并偏好设置
      user.preferences = {
        ...user.preferences,
        ...preferences
      };

      // 保存
      await this.userRepository.save(user);

      logger.info(`偏好设置更新成功: ${userId}`);

      return {
        success: true,
        message: '偏好设置更新成功'
      };
    } catch (error) {
      logger.error(`更新偏好设置失败: ${error.message}`, { userId });
      throw error;
    }
  }

  /**
   * 注销账号（软删除）
   * @param {string} userId - 用户ID
   * @param {string} password - 密码确认
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteAccount(userId, password) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证密码
      if (!user._password.verify(password)) {
        throw new Error('密码错误');
      }

      // 软删除
      await this.userRepository.delete(userId);

      logger.info(`账号注销成功: ${userId}`);

      return {
        success: true,
        message: '账号注销成功'
      };
    } catch (error) {
      logger.error(`注销账号失败: ${error.message}`, { userId });
      throw error;
    }
  }
}
