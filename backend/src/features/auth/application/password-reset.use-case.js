/**
 * 密码重置用例
 * 处理通过手机验证码重置密码的业务逻辑
 */
import { Password } from '../domain/value-objects/password.vo.js';
import { PhoneVerificationUseCase } from './phone-verification.use-case.js';
import { logger } from '../../../shared/utils/logger.js';

export class PasswordResetUseCase {
  constructor(userRepository, phoneVerificationUseCase = null) {
    this.userRepository = userRepository;
    this.phoneVerificationUseCase = phoneVerificationUseCase || new PhoneVerificationUseCase(userRepository);
  }

  /**
   * 发送密码重置验证码
   * @param {string} phone - 手机号
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async sendResetCode(phone) {
    try {
      // 检查手机号是否已注册
      const user = await this.userRepository.findByPhone(phone);
      if (!user) {
        throw new Error('该手机号未注册');
      }

      // 发送验证码
      const result = await this.phoneVerificationUseCase.sendVerificationCode(phone, 'reset');

      logger.info(`密码重置验证码已发送: ${this._maskPhone(phone)}`);

      return result;
    } catch (error) {
      logger.error(`发送密码重置验证码失败: ${error.message}`, { phone: this._maskPhone(phone) });
      throw error;
    }
  }

  /**
   * 验证验证码并重置密码
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   * @param {string} newPassword - 新密码
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async resetPassword(phone, code, newPassword) {
    try {
      // 验证验证码
      await this.phoneVerificationUseCase.verifyCode(phone, code, 'reset');

      // 查找用户
      const user = await this.userRepository.findByPhone(phone);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 验证新密码
      if (!newPassword || newPassword.length < 6) {
        throw new Error('密码长度至少为6位');
      }

      // 更新密码
      user._password = Password.create(newPassword);

      // 解锁账户（如果被锁定）
      if (user.isLocked()) {
        user.unlockAccount();
      }

      // 保存用户
      await this.userRepository.save(user);

      logger.info(`密码重置成功: ${this._maskPhone(phone)}`);

      return {
        success: true,
        message: '密码重置成功'
      };
    } catch (error) {
      logger.error(`密码重置失败: ${error.message}`, { phone: this._maskPhone(phone) });
      throw error;
    }
  }

  /**
   * 手机号脱敏
   */
  _maskPhone(phone) {
    if (!phone || phone.length < 11) {
      return phone;
    }
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }
}
