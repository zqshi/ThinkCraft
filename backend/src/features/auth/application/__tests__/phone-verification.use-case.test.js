/**
 * 手机验证码用例单元测试
 */
import { PhoneVerificationUseCase } from '../phone-verification.use-case.js';
import { SmsService } from '../../../../infrastructure/sms/sms.service.js';
import { logger } from '../../../../../middleware/logger.js';

// Mock logger
jest.mock('../../../../../middleware/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('PhoneVerificationUseCase', () => {
  let phoneVerificationUseCase;
  let mockUserRepository;
  let mockSmsService;
  let mockCacheService;

  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks();

    // Mock用户仓库
    mockUserRepository = {
      findByPhone: jest.fn()
    };

    // Mock SMS服务
    mockSmsService = {
      sendVerificationCode: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'mock_123'
      })
    };

    // Mock缓存服务
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn()
    };

    // 创建用例实例
    phoneVerificationUseCase = new PhoneVerificationUseCase(
      mockUserRepository,
      mockSmsService,
      mockCacheService
    );
  });

  describe('sendVerificationCode', () => {
    it('应该成功发送注册验证码', async () => {
      // 设置mock返回值
      mockUserRepository.findByPhone.mockResolvedValue(null); // 手机号未注册
      mockCacheService.get.mockResolvedValue(null); // 无频率限制

      const result = await phoneVerificationUseCase.sendVerificationCode('13800138000', 'register');

      expect(result.success).toBe(true);
      expect(result.message).toBe('验证码已发送');
      expect(mockSmsService.sendVerificationCode).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该验证手机号格式', async () => {
      await expect(
        phoneVerificationUseCase.sendVerificationCode('invalid', 'register')
      ).rejects.toThrow('手机号格式不正确');

      expect(mockSmsService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('应该检查发送频率限制', async () => {
      // 模拟60秒内已发送过
      const lastSendTime = Date.now() - 30000; // 30秒前
      mockCacheService.get.mockResolvedValueOnce(lastSendTime.toString());

      await expect(
        phoneVerificationUseCase.sendVerificationCode('13800138000', 'register')
      ).rejects.toThrow(/请.*秒后再试/);

      expect(mockSmsService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('应该检查每日发送次数限制', async () => {
      // 模拟已发送10次
      mockCacheService.get
        .mockResolvedValueOnce(null) // 无频率限制
        .mockResolvedValueOnce('10'); // 每日次数已达上限

      await expect(
        phoneVerificationUseCase.sendVerificationCode('13800138000', 'register')
      ).rejects.toThrow('今日发送次数已达上限');

      expect(mockSmsService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('注册时应该检查手机号是否已存在', async () => {
      mockUserRepository.findByPhone.mockResolvedValue({ id: '123', phone: '13800138000' });
      mockCacheService.get.mockResolvedValue(null);

      await expect(
        phoneVerificationUseCase.sendVerificationCode('13800138000', 'register')
      ).rejects.toThrow('该手机号已注册');

      expect(mockSmsService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('重置密码时应该检查手机号是否存在', async () => {
      mockUserRepository.findByPhone.mockResolvedValue(null); // 手机号未注册
      mockCacheService.get.mockResolvedValue(null);

      await expect(
        phoneVerificationUseCase.sendVerificationCode('13800138000', 'reset')
      ).rejects.toThrow('该手机号未注册');

      expect(mockSmsService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('绑定手机号时应该检查是否已被使用', async () => {
      mockUserRepository.findByPhone.mockResolvedValue({ id: '123', phone: '13800138000' });
      mockCacheService.get.mockResolvedValue(null);

      await expect(
        phoneVerificationUseCase.sendVerificationCode('13800138000', 'bind')
      ).rejects.toThrow('该手机号已被其他用户绑定');

      expect(mockSmsService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('登录验证码不需要额外检查', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await phoneVerificationUseCase.sendVerificationCode('13800138000', 'login');

      expect(result.success).toBe(true);
      expect(mockUserRepository.findByPhone).not.toHaveBeenCalled();
    });

    it('应该拒绝不支持的验证类型', async () => {
      mockCacheService.get.mockResolvedValue(null);

      await expect(
        phoneVerificationUseCase.sendVerificationCode('13800138000', 'invalid')
      ).rejects.toThrow('不支持的验证类型');
    });

    it('应该正确设置缓存过期时间', async () => {
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockCacheService.get.mockResolvedValue(null);

      await phoneVerificationUseCase.sendVerificationCode('13800138000', 'register');

      // 验证码缓存：10分钟（600秒）
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('sms:code:'),
        expect.any(String),
        600
      );

      // 频率限制：60秒
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('sms:rate:'),
        expect.any(String),
        60
      );

      // 每日计数：24小时（86400秒）
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('sms:daily:'),
        expect.any(String),
        86400
      );
    });

    it('应该增加每日发送计数', async () => {
      mockUserRepository.findByPhone.mockResolvedValue(null);
      mockCacheService.get
        .mockResolvedValueOnce(null) // 无频率限制
        .mockResolvedValueOnce('3'); // 已发送3次

      await phoneVerificationUseCase.sendVerificationCode('13800138000', 'register');

      // 应该设置为4
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('sms:daily:'),
        '4',
        86400
      );
    });
  });

  describe('verifyCode', () => {
    it('应该成功验证正确的验证码', async () => {
      mockCacheService.get.mockResolvedValue('123456');

      const result = await phoneVerificationUseCase.verifyCode('13800138000', '123456', 'register');

      expect(result.success).toBe(true);
      expect(result.message).toBe('验证成功');
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        expect.stringContaining('sms:code:')
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该验证手机号格式', async () => {
      await expect(
        phoneVerificationUseCase.verifyCode('invalid', '123456', 'register')
      ).rejects.toThrow('手机号格式不正确');
    });

    it('应该验证验证码格式', async () => {
      const invalidCodes = ['12345', '1234567', 'abcdef', ''];

      for (const code of invalidCodes) {
        await expect(
          phoneVerificationUseCase.verifyCode('13800138000', code, 'register')
        ).rejects.toThrow('验证码格式不正确');
      }
    });

    it('应该处理验证码过期', async () => {
      mockCacheService.get.mockResolvedValue(null); // 验证码不存在

      await expect(
        phoneVerificationUseCase.verifyCode('13800138000', '123456', 'register')
      ).rejects.toThrow('验证码已过期或不存在');
    });

    it('应该处理验证码错误', async () => {
      mockCacheService.get
        .mockResolvedValueOnce('123456') // 存储的验证码
        .mockResolvedValueOnce(null); // 失败次数

      await expect(
        phoneVerificationUseCase.verifyCode('13800138000', '654321', 'register')
      ).rejects.toThrow(/验证码错误，还有.*次机会/);

      // 应该记录失败次数
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('sms:fail:'),
        '1',
        600
      );
    });

    it('应该在失败5次后删除验证码', async () => {
      mockCacheService.get
        .mockResolvedValueOnce('123456') // 存储的验证码
        .mockResolvedValueOnce('4'); // 已失败4次

      await expect(
        phoneVerificationUseCase.verifyCode('13800138000', '654321', 'register')
      ).rejects.toThrow('验证码错误次数过多，请重新获取');

      // 应该删除验证码和失败记录
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        expect.stringContaining('sms:code:')
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        expect.stringContaining('sms:fail:')
      );
    });

    it('验证成功后应该删除验证码和失败记录', async () => {
      mockCacheService.get.mockResolvedValue('123456');

      await phoneVerificationUseCase.verifyCode('13800138000', '123456', 'register');

      expect(mockCacheService.delete).toHaveBeenCalledWith(
        expect.stringContaining('sms:code:')
      );
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        expect.stringContaining('sms:fail:')
      );
    });
  });

  describe('_validatePhone', () => {
    it('应该验证有效的手机号', () => {
      const validPhones = ['13800138000', '15912345678', '18888888888'];

      validPhones.forEach(phone => {
        expect(phoneVerificationUseCase._validatePhone(phone)).toBe(true);
      });
    });

    it('应该拒绝无效的手机号', () => {
      const invalidPhones = ['12345678901', '10000000000', '1380013800', ''];

      invalidPhones.forEach(phone => {
        expect(phoneVerificationUseCase._validatePhone(phone)).toBe(false);
      });
    });
  });

  describe('_maskPhone', () => {
    it('应该正确脱敏手机号', () => {
      expect(phoneVerificationUseCase._maskPhone('13800138000')).toBe('138****8000');
    });

    it('应该处理短手机号', () => {
      expect(phoneVerificationUseCase._maskPhone('123')).toBe('123');
    });
  });
});
