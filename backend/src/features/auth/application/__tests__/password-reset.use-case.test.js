/**
 * 密码重置用例单元测试
 */
import { PasswordResetUseCase } from '../password-reset.use-case.js';
import { Password } from '../../domain/value-objects/password.vo.js';
import { logger } from '../../../../../middleware/logger.js';

// Mock logger
jest.mock('../../../../../middleware/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock Password值对象
jest.mock('../../domain/value-objects/password.vo.js', () => ({
  Password: {
    create: jest.fn(password => ({ value: password, isHashed: false }))
  }
}));

describe('PasswordResetUseCase', () => {
  let passwordResetUseCase;
  let mockUserRepository;
  let mockPhoneVerificationUseCase;

  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks();

    // Mock用户仓库
    mockUserRepository = {
      findByPhone: jest.fn(),
      save: jest.fn()
    };

    // Mock手机验证用例
    mockPhoneVerificationUseCase = {
      sendVerificationCode: jest.fn(),
      verifyCode: jest.fn()
    };

    // 创建用例实例
    passwordResetUseCase = new PasswordResetUseCase(
      mockUserRepository,
      mockPhoneVerificationUseCase
    );
  });

  describe('sendResetCode', () => {
    it('应该成功发送密码重置验证码', async () => {
      // 设置mock返回值
      const mockUser = { id: '123', phone: '13800138000' };
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      mockPhoneVerificationUseCase.sendVerificationCode.mockResolvedValue({
        success: true,
        message: '验证码已发送'
      });

      const result = await passwordResetUseCase.sendResetCode('13800138000');

      expect(result.success).toBe(true);
      expect(mockUserRepository.findByPhone).toHaveBeenCalledWith('13800138000');
      expect(mockPhoneVerificationUseCase.sendVerificationCode).toHaveBeenCalledWith(
        '13800138000',
        'reset'
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该拒绝未注册的手机号', async () => {
      mockUserRepository.findByPhone.mockResolvedValue(null);

      await expect(passwordResetUseCase.sendResetCode('13800138000')).rejects.toThrow(
        '该手机号未注册'
      );

      expect(mockPhoneVerificationUseCase.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('应该记录发送日志', async () => {
      const mockUser = { id: '123', phone: '13800138000' };
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      mockPhoneVerificationUseCase.sendVerificationCode.mockResolvedValue({
        success: true,
        message: '验证码已发送'
      });

      await passwordResetUseCase.sendResetCode('13800138000');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('密码重置验证码已发送'),
        expect.anything()
      );
    });

    it('应该在发送失败时记录错误日志', async () => {
      mockUserRepository.findByPhone.mockRejectedValue(new Error('数据库错误'));

      await expect(passwordResetUseCase.sendResetCode('13800138000')).rejects.toThrow(
        '数据库错误'
      );

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('发送密码重置验证码失败'),
        expect.anything()
      );
    });
  });

  describe('resetPassword', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = {
        id: '123',
        phone: '13800138000',
        _password: { value: 'oldPassword' },
        isLocked: jest.fn().mockReturnValue(false),
        unlockAccount: jest.fn()
      };
    });

    it('应该成功重置密码', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await passwordResetUseCase.resetPassword(
        '13800138000',
        '123456',
        'newPassword123'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('密码重置成功');
      expect(mockPhoneVerificationUseCase.verifyCode).toHaveBeenCalledWith(
        '13800138000',
        '123456',
        'reset'
      );
      expect(Password.create).toHaveBeenCalledWith('newPassword123');
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该验证验证码', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockRejectedValue(new Error('验证码错误'));

      await expect(
        passwordResetUseCase.resetPassword('13800138000', '123456', 'newPassword123')
      ).rejects.toThrow('验证码错误');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('应该检查用户是否存在', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findByPhone.mockResolvedValue(null);

      await expect(
        passwordResetUseCase.resetPassword('13800138000', '123456', 'newPassword123')
      ).rejects.toThrow('用户不存在');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('应该验证新密码长度', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);

      // 测试空密码
      await expect(
        passwordResetUseCase.resetPassword('13800138000', '123456', '')
      ).rejects.toThrow('密码长度至少为6位');

      // 测试短密码
      await expect(
        passwordResetUseCase.resetPassword('13800138000', '123456', '12345')
      ).rejects.toThrow('密码长度至少为6位');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('应该接受有效的密码', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const validPasswords = ['123456', 'password123', 'MyP@ssw0rd!'];

      for (const password of validPasswords) {
        const result = await passwordResetUseCase.resetPassword('13800138000', '123456', password);
        expect(result.success).toBe(true);
      }
    });

    it('应该解锁被锁定的账户', async () => {
      mockUser.isLocked.mockReturnValue(true);
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await passwordResetUseCase.resetPassword('13800138000', '123456', 'newPassword123');

      expect(mockUser.unlockAccount).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('不应该解锁未锁定的账户', async () => {
      mockUser.isLocked.mockReturnValue(false);
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await passwordResetUseCase.resetPassword('13800138000', '123456', 'newPassword123');

      expect(mockUser.unlockAccount).not.toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('应该记录成功日志', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await passwordResetUseCase.resetPassword('13800138000', '123456', 'newPassword123');

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('密码重置成功'),
        expect.anything()
      );
    });

    it('应该在重置失败时记录错误日志', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findByPhone.mockResolvedValue(mockUser);
      mockUserRepository.save.mockRejectedValue(new Error('保存失败'));

      await expect(
        passwordResetUseCase.resetPassword('13800138000', '123456', 'newPassword123')
      ).rejects.toThrow('保存失败');

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('密码重置失败'),
        expect.anything()
      );
    });
  });

  describe('_maskPhone', () => {
    it('应该正确脱敏手机号', () => {
      expect(passwordResetUseCase._maskPhone('13800138000')).toBe('138****8000');
      expect(passwordResetUseCase._maskPhone('15912345678')).toBe('159****5678');
    });

    it('应该处理短手机号', () => {
      expect(passwordResetUseCase._maskPhone('123')).toBe('123');
      expect(passwordResetUseCase._maskPhone('')).toBe('');
    });

    it('应该处理null和undefined', () => {
      expect(passwordResetUseCase._maskPhone(null)).toBe(null);
      expect(passwordResetUseCase._maskPhone(undefined)).toBe(undefined);
    });
  });
});
