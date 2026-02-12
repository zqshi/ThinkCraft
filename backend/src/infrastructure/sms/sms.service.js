/**
 * 短信服务
 * 支持发送验证码、通知等短信
 *
 * 支持的短信服务商：
 * - 阿里云SMS
 * - 腾讯云SMS
 */
import { logger } from '../../../middleware/logger.js';

export class SmsService {
  constructor(config = {}) {
    const provider = config.provider || process.env.SMS_PROVIDER;
    if (!provider) {
      throw new Error('SMS_PROVIDER 未配置');
    }
    this.provider = provider;
    this.config = config;

    // 生产环境强制检查
    if (process.env.NODE_ENV === 'production' && this.provider === 'mock') {
      throw new Error('生产环境不允许使用mock短信服务，请配置SMS_PROVIDER为aliyun或tencent');
    }

    // 初始化对应的短信服务商
    this._initProvider();
  }

  /**
   * 初始化短信服务商
   */
  _initProvider() {
    switch (this.provider) {
      case 'aliyun':
        this._initAliyun();
        break;
      case 'tencent':
        this._initTencent();
        break;
      case 'mock':
        if (process.env.NODE_ENV !== 'test') {
          logger.warn('SMS服务运行在模拟模式，仅用于开发/测试环境');
        }
        break;
      default:
        throw new Error(`不支持的短信服务商: ${this.provider}`);
    }
  }

  /**
   * 初始化阿里云SMS
   */
  _initAliyun() {
    this.aliyunConfig = {
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || this.config.accessKeyId,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || this.config.accessKeySecret,
      signName: process.env.ALIYUN_SMS_SIGN_NAME || this.config.signName
    };
    logger.info('初始化阿里云SMS服务');
  }

  /**
   * 初始化腾讯云SMS
   */
  _initTencent() {
    this.tencentConfig = {
      secretId: process.env.TENCENT_SECRET_ID || this.config.secretId,
      secretKey: process.env.TENCENT_SECRET_KEY || this.config.secretKey,
      region: process.env.TENCENT_REGION || this.config.region || 'ap-guangzhou',
      appId: process.env.TENCENT_SMS_APP_ID || this.config.appId,
      sign: process.env.TENCENT_SMS_SIGN || this.config.sign,
      templates: {
        register:
          process.env.TENCENT_SMS_TEMPLATE_REGISTER || this.config?.templates?.register || '',
        login: process.env.TENCENT_SMS_TEMPLATE_LOGIN || this.config?.templates?.login || '',
        reset: process.env.TENCENT_SMS_TEMPLATE_RESET || this.config?.templates?.reset || ''
      }
    };
    this.tencentSmsClient = null;
    logger.info('初始化腾讯云SMS服务');
  }

  /**
   * 发送验证码
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   * @param {string} template - 模板类型 (register|login|reset)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendVerificationCode(phone, code, template = 'register') {
    try {
      // 验证手机号格式
      if (!this._validatePhone(phone)) {
        throw new Error('手机号格式不正确');
      }

      // 验证码格式检查
      if (!code || code.length !== 6) {
        throw new Error('验证码必须是6位数字');
      }

      logger.info(`发送验证码到 ${this._maskPhone(phone)}, 模板: ${template}`);

      // 根据服务商发送短信
      let result;
      switch (this.provider) {
        case 'aliyun':
          result = await this._sendAliyunSms(phone, code, template);
          break;
        case 'tencent':
          result = await this._sendTencentSms(phone, code, template);
          break;
        case 'mock':
          result = await this._sendMockSms(phone, code, template);
          break;
        default:
          throw new Error(`不支持的短信服务商: ${this.provider}`);
      }

      logger.info(`验证码发送成功: ${this._maskPhone(phone)}`);
      return result;
    } catch (error) {
      logger.error(`验证码发送失败: ${error.message}`, { phone: this._maskPhone(phone), error });
      throw error;
    }
  }

  /**
   * 发送通知短信
   * @param {string} phone - 手机号
   * @param {string} message - 消息内容
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendNotification(phone, message) {
    try {
      if (!this._validatePhone(phone)) {
        throw new Error('手机号格式不正确');
      }

      logger.info(`发送通知短信到 ${this._maskPhone(phone)}`);

      // 模拟模式直接返回成功
      if (this.provider === 'mock') {
        logger.info(`[模拟模式] 通知短信: ${message}`);
        return {
          success: true,
          messageId: `mock_${Date.now()}`
        };
      }

      switch (this.provider) {
        case 'aliyun':
          return await this._sendAliyunNotification(phone, message);
        case 'tencent':
          return await this._sendTencentNotification(phone, message);
        default:
          throw new Error(`不支持的短信服务商: ${this.provider}`);
      }
    } catch (error) {
      logger.error(`通知短信发送失败: ${error.message}`, { phone: this._maskPhone(phone), error });
      throw error;
    }
  }

  /**
   * 阿里云SMS发送
   */
  async _sendAliyunSms(_phone, _code, _template) {
    throw new Error('阿里云SMS暂未集成，请配置SMS_PROVIDER=tencent或使用mock');
  }

  /**
   * 腾讯云SMS发送
   */
  async _sendTencentSms(phone, code, template) {
    const client = await this._getTencentSmsClient();
    const templateId = this.tencentConfig?.templates?.[template] || '';
    if (!templateId) {
      throw new Error(`腾讯云短信模板未配置: ${template}`);
    }
    const response = await client.SendSms({
      SmsSdkAppId: String(this.tencentConfig.appId),
      SignName: this.tencentConfig.sign,
      TemplateId: String(templateId),
      PhoneNumberSet: [`+86${phone}`],
      TemplateParamSet: [String(code)]
    });
    const status = response?.SendStatusSet?.[0];
    if (!status || status.Code !== 'Ok') {
      throw new Error(`腾讯云短信发送失败: ${status?.Message || '未知错误'}`);
    }
    return {
      success: true,
      messageId: status.SerialNo || `tencent_${Date.now()}`,
      provider: 'tencent'
    };
  }

  async _sendAliyunNotification(_phone, _message) {
    throw new Error('阿里云SMS暂未集成，请配置SMS_PROVIDER=tencent或使用mock');
  }

  async _sendTencentNotification(phone, message) {
    const client = await this._getTencentSmsClient();
    const templateId =
      process.env.TENCENT_SMS_TEMPLATE_NOTIFICATION || this.config?.templates?.notification;
    if (!templateId) {
      throw new Error('腾讯云通知短信模板未配置: TENCENT_SMS_TEMPLATE_NOTIFICATION');
    }
    const response = await client.SendSms({
      SmsSdkAppId: String(this.tencentConfig.appId),
      SignName: this.tencentConfig.sign,
      TemplateId: String(templateId),
      PhoneNumberSet: [`+86${phone}`],
      TemplateParamSet: [String(message)]
    });
    const status = response?.SendStatusSet?.[0];
    if (!status || status.Code !== 'Ok') {
      throw new Error(`腾讯云通知短信发送失败: ${status?.Message || '未知错误'}`);
    }
    return {
      success: true,
      messageId: status.SerialNo || `tencent_${Date.now()}`,
      provider: 'tencent'
    };
  }

  async _getTencentSmsClient() {
    if (this.tencentSmsClient) {
      return this.tencentSmsClient;
    }
    const { secretId, secretKey, region, appId, sign } = this.tencentConfig || {};
    if (!secretId || !secretKey || !appId || !sign) {
      throw new Error('腾讯云短信配置不完整，请检查 secretId/secretKey/appId/sign');
    }
    let tencentcloud;
    try {
      tencentcloud = await import('tencentcloud-sdk-nodejs');
    } catch (_error) {
      throw new Error('tencentcloud-sdk-nodejs未安装，请在backend目录执行 npm install');
    }
    const SmsClient = tencentcloud.sms.v20210111.Client;
    this.tencentSmsClient = new SmsClient({
      credential: {
        secretId,
        secretKey
      },
      region,
      profile: {
        httpProfile: {
          endpoint: 'sms.tencentcloudapi.com'
        }
      }
    });
    return this.tencentSmsClient;
  }

  /**
   * 模拟SMS发送（开发环境）
   */
  async _sendMockSms(phone, code, template) {
    logger.warn('[SMS] 模拟模式验证码仅在控制台输出');

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100));

    // 在开发环境下，将验证码输出到日志
    logger.info(`[模拟短信] 手机号: ${this._maskPhone(phone)}, 验证码: ${code}, 模板: ${template}`);

    // 在控制台高亮显示验证码（方便开发测试）
    console.log('\n' + '='.repeat(50));
    console.log(`📱 验证码短信 (${template})`);
    console.log(`手机号: ${this._maskPhone(phone)}`);
    console.log(`验证码: ${code}`);
    console.log('有效期: 10分钟');
    console.log('='.repeat(50) + '\n');

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      provider: 'mock'
    };
  }

  /**
   * 验证手机号格式
   * @param {string} phone - 手机号
   * @returns {boolean}
   */
  _validatePhone(phone) {
    // 中国大陆手机号：1开头，第二位是3-9，共11位
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 手机号脱敏
   * @param {string} phone - 手机号
   * @returns {string}
   */
  _maskPhone(phone) {
    if (!phone || phone.length < 11) {
      return phone;
    }
    return phone.substring(0, 3) + '****' + phone.substring(7);
  }

  /**
   * 生成6位数字验证码
   * @returns {string}
   */
  static generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// 创建单例实例
let smsServiceInstance = null;

/**
 * 获取SMS服务实例
 * @returns {SmsService}
 */
export function getSmsService() {
  if (!smsServiceInstance) {
    smsServiceInstance = new SmsService({
      provider: process.env.SMS_PROVIDER
    });
  }
  return smsServiceInstance;
}
