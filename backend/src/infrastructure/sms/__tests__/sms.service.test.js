/**
 * SMS服务单元测试
 */
import { SmsService } from '../sms.service.js';
import { logger } from '../../../../../middleware/logger.js';

// Mock logger
jest.mock('../../../../../middleware/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('SmsService', () => {
  let smsService;

  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks();
    // 创建mock模式的SMS服务
    smsService = new SmsService({ provider: 'mock' });
  });

  describe('构造函数', () => {
    it('应该使用默认的mock provider', () => {
      const service = new SmsService();
      expect(service.provider).toBe('mock');
    });

    it('应该使用配置的provider', () => {
      const service = new SmsService({ provider: 'mock' });
      expect(service.provider).toBe('mock');
    });

    it('应该在生产环境拒绝mock provider', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      expect(() => {
        new SmsService({ provider: 'mock' });
      }).toThrow('生产环境不允许使用mock短信服务');

      process.env.NODE_ENV = originalEnv;
    });

    it('应该拒绝不支持的provider', () => {
      expect(() => {
        new SmsService({ provider: 'invalid' });
      }).toThrow('不支持的短信服务商: invalid');
    });
  });

  describe('sendVerificationCode', () => {
    it('应该成功发送验证码', async () => {
      const result = await smsService.sendVerificationCode('13800138000', '123456');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.provider).toBe('mock');
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该验证手机号格式', async () => {
      await expect(smsService.sendVerificationCode('invalid', '123456')).rejects.toThrow(
        '手机号格式不正确'
      );
    });

    it('应该拒绝无效的手机号', async () => {
      const invalidPhones = ['12345678901', '10000000000', '1380013800', ''];

      for (const phone of invalidPhones) {
        await expect(smsService.sendVerificationCode(phone, '123456')).rejects.toThrow(
          '手机号格式不正确'
        );
      }
    });

    it('应该验证验证码格式', async () => {
      await expect(smsService.sendVerificationCode('13800138000', '12345')).rejects.toThrow(
        '验证码必须是6位数字'
      );

      await expect(smsService.sendVerificationCode('13800138000', '1234567')).rejects.toThrow(
        '验证码必须是6位数字'
      );

      await expect(smsService.sendVerificationCode('13800138000', '')).rejects.toThrow(
        '验证码必须是6位数字'
      );
    });

    it('应该接受有效的手机号', async () => {
      const validPhones = ['13800138000', '15912345678', '18888888888', '19999999999'];

      for (const phone of validPhones) {
        const result = await smsService.sendVerificationCode(phone, '123456');
        expect(result.success).toBe(true);
      }
    });

    it('应该支持不同的模板类型', async () => {
      const templates = ['register', 'login', 'reset'];

      for (const template of templates) {
        const result = await smsService.sendVerificationCode('13800138000', '123456', template);
        expect(result.success).toBe(true);
      }
    });

    it('应该记录发送日志', async () => {
      await smsService.sendVerificationCode('13800138000', '123456', 'register');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('发送验证码到'),
        expect.anything()
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('验证码发送成功'),
        expect.anything()
      );
    });

    it('应该在发送失败时记录错误日志', async () => {
      // 创建一个会失败的SMS服务
      const failingService = new SmsService({ provider: 'mock' });
      failingService._sendMockSms = jest.fn().mockRejectedValue(new Error('发送失败'));

      await expect(failingService.sendVerificationCode('13800138000', '123456')).rejects.toThrow(
        '发送失败'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('验证码发送失败'),
        expect.anything()
      );
    });
  });

  describe('sendNotification', () => {
    it('应该成功发送通知短信', async () => {
      const result = await smsService.sendNotification('13800138000', '您的订单已发货');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('应该验证手机号格式', async () => {
      await expect(smsService.sendNotification('invalid', '测试消息')).rejects.toThrow(
        '手机号格式不正确'
      );
    });

    it('应该记录发送日志', async () => {
      await smsService.sendNotification('13800138000', '测试消息');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('发送通知短信到'),
        expect.anything()
      );
    });
  });

  describe('_validatePhone', () => {
    it('应该验证有效的手机号', () => {
      const validPhones = ['13800138000', '15912345678', '18888888888', '19999999999'];

      validPhones.forEach(phone => {
        expect(smsService._validatePhone(phone)).toBe(true);
      });
    });

    it('应该拒绝无效的手机号', () => {
      const invalidPhones = [
        '12345678901', // 不是1开头
        '10000000000', // 第二位是0
        '1380013800', // 少于11位
        '138001380000', // 多于11位
        'abcdefghijk', // 非数字
        ''
      ];

      invalidPhones.forEach(phone => {
        expect(smsService._validatePhone(phone)).toBe(false);
      });
    });
  });

  describe('_maskPhone', () => {
    it('应该正确脱敏手机号', () => {
      expect(smsService._maskPhone('13800138000')).toBe('138****8000');
      expect(smsService._maskPhone('15912345678')).toBe('159****5678');
    });

    it('应该处理短手机号', () => {
      expect(smsService._maskPhone('123')).toBe('123');
      expect(smsService._maskPhone('')).toBe('');
    });

    it('应该处理null和undefined', () => {
      expect(smsService._maskPhone(null)).toBe(null);
      expect(smsService._maskPhone(undefined)).toBe(undefined);
    });
  });

  describe('generateCode', () => {
    it('应该生成6位数字验证码', () => {
      const code = SmsService.generateCode();

      expect(code).toHaveLength(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('应该生成不同的验证码', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(SmsService.generateCode());
      }

      // 100次生成应该有至少90个不同的验证码
      expect(codes.size).toBeGreaterThan(90);
    });

    it('应该生成在100000-999999范围内的验证码', () => {
      for (let i = 0; i < 100; i++) {
        const code = parseInt(SmsService.generateCode());
        expect(code).toBeGreaterThanOrEqual(100000);
        expect(code).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('_sendMockSms', () => {
    it('应该模拟发送延迟', async () => {
      const startTime = Date.now();
      await smsService._sendMockSms('13800138000', '123456', 'register');
      const endTime = Date.now();

      // 应该至少有100ms的延迟
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it('应该返回mock结果', async () => {
      const result = await smsService._sendMockSms('13800138000', '123456', 'register');

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock_\d+$/);
      expect(result.provider).toBe('mock');
    });

    it('应该记录警告日志', async () => {
      await smsService._sendMockSms('13800138000', '123456', 'register');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('当前使用mock模式'),
        expect.anything()
      );
    });
  });

  describe('阿里云和腾讯云SMS', () => {
    it('阿里云SMS应该抛出未实现错误', async () => {
      await expect(smsService._sendAliyunSms('13800138000', '123456', 'register')).rejects.toThrow(
        '阿里云SMS尚未实现'
      );
    });

    it('腾讯云SMS应该抛出未实现错误', async () => {
      await expect(
        smsService._sendTencentSms('13800138000', '123456', 'register')
      ).rejects.toThrow('腾讯云SMS尚未实现');
    });
  });
});
