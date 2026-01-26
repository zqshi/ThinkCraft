/**
 * 手机验证码用例
 * 处理发送验证码和验证验证码的业务逻辑
 */
import { getSmsService, SmsService } from '../../../infrastructure/sms/sms.service.js';
import { cacheService } from '../../../infrastructure/cache/redis-cache.service.js';
import { logger } from '../../../../middleware/logger.js';

export class PhoneVerificationUseCase {
  constructor(userRepository, smsService = null, cacheServiceInstance = null) {
    this.userRepository = userRepository;
    this.smsService = smsService || getSmsService();
    this.cacheService = cacheServiceInstance || cacheService;
  }

  /**
   * 发送验证码
   * @param {string} phone - 手机号
   * @param {string} type - 验证类型 (register|login|reset|bind)
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async sendVerificationCode(phone, type = 'register') {
    try {
      // 验证手机号格式
      if (!this._validatePhone(phone)) {
        throw new Error('手机号格式不正确');
      }

      // 检查发送频率限制（60秒内只能发送一次）
      const rateLimitKey = `sms:rate:${phone}`;
      const lastSendTime = await this.cacheService.get(rateLimitKey);
      if (lastSendTime) {
        const elapsed = Date.now() - parseInt(lastSendTime);
        const remaining = Math.ceil((60000 - elapsed) / 1000);
        throw new Error(`请${remaining}秒后再试`);
      }

      // 检查每日发送次数限制（每天最多10次）
      const dailyLimitKey = `sms:daily:${phone}`;
      const dailyCount = await this.cacheService.get(dailyLimitKey);
      if (dailyCount && parseInt(dailyCount) >= 10) {
        throw new Error('今日发送次数已达上限');
      }

      // 根据类型检查业务逻辑
      await this._validateBusinessLogic(phone, type);

      // 生成6位数字验证码
      const code = SmsService.generateCode();

      // 存储验证码到Redis（10分钟有效期）
      const codeKey = `sms:code:${phone}:${type}`;
      await this.cacheService.set(codeKey, code, 600); // 10分钟

      // 发送短信
      await this.smsService.sendVerificationCode(phone, code, type);

      // 记录发送时间（60秒限制）
      await this.cacheService.set(rateLimitKey, Date.now().toString(), 60);

      // 增加每日发送计数（24小时过期）
      const newCount = dailyCount ? parseInt(dailyCount) + 1 : 1;
      await this.cacheService.set(dailyLimitKey, newCount.toString(), 86400);

      logger.info(`验证码发送成功: ${this._maskPhone(phone)}, 类型: ${type}`);

      return {
        success: true,
        message: '验证码已发送'
      };
    } catch (error) {
      logger.error(`验证码发送失败: ${error.message}`, { phone: this._maskPhone(phone), type });
      throw error;
    }
  }

  /**
   * 验证验证码
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   * @param {string} type - 验证类型
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async verifyCode(phone, code, type = 'register') {
    try {
      // 验证手机号格式
      if (!this._validatePhone(phone)) {
        throw new Error('手机号格式不正确');
      }

      // 验证码格式检查
      if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
        throw new Error('验证码格式不正确');
      }

      // 从Redis获取验证码
      const codeKey = `sms:code:${phone}:${type}`;
      const storedCode = await this.cacheService.get(codeKey);

      if (!storedCode) {
        throw new Error('验证码已过期或不存在');
      }

      // 验证码比对
      if (storedCode !== code) {
        // 记录失败次数
        const failKey = `sms:fail:${phone}`;
        const failCount = await this.cacheService.get(failKey);
        const newFailCount = failCount ? parseInt(failCount) + 1 : 1;

        if (newFailCount >= 5) {
          // 失败5次后删除验证码
          await this.cacheService.delete(codeKey);
          await this.cacheService.delete(failKey);
          throw new Error('验证码错误次数过多，请重新获取');
        }

        await this.cacheService.set(failKey, newFailCount.toString(), 600);
        throw new Error(`验证码错误，还有${5 - newFailCount}次机会`);
      }

      // 验证成功，删除验证码和失败记录
      await this.cacheService.delete(codeKey);
      await this.cacheService.delete(`sms:fail:${phone}`);

      logger.info(`验证码验证成功: ${this._maskPhone(phone)}, 类型: ${type}`);

      return {
        success: true,
        message: '验证成功'
      };
    } catch (error) {
      logger.error(`验证码验证失败: ${error.message}`, { phone: this._maskPhone(phone), type });
      throw error;
    }
  }

  /**
   * 验证业务逻辑
   */
  async _validateBusinessLogic(phone, type) {
    switch (type) {
    case 'register': {
      // 注册时检查手机号是否已存在
      const existingUser = await this.userRepository.findByPhone(phone);
      if (existingUser) {
        throw new Error('该手机号已注册');
      }
      break;
    }

    case 'reset': {
      // 重置密码时检查手机号是否存在
      const user = await this.userRepository.findByPhone(phone);
      if (!user) {
        throw new Error('该手机号未注册');
      }
      break;
    }

    case 'bind': {
      // 绑定手机号时检查是否已被其他用户使用
      const boundUser = await this.userRepository.findByPhone(phone);
      if (boundUser) {
        throw new Error('该手机号已被其他用户绑定');
      }
      break;
    }

    case 'login':
      // 登录验证码，不需要额外检查
      break;

    default:
      throw new Error(`不支持的验证类型: ${type}`);
    }
  }

  /**
   * 验证手机号格式
   */
  _validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
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
