/**
 * 账号管理用例
 * 处理个人信息管理、安全设置、偏好设置等业务逻辑
 */
import { PhoneVerificationUseCase } from './phone-verification.use-case.js';
import { logger } from '../../../../middleware/logger.js';

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
   * @param {string} code - 验证码
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deleteAccount(userId, code) {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      if (!user.phone) {
        throw new Error('未绑定手机号，无法注销账号');
      }

      await this.phoneVerificationUseCase.verifyCode(user.phone.value, code, 'login');

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
