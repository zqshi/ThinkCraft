/**
 * 账号管理用例单元测试
 */
import { AccountManagementUseCase } from '../account-management.use-case.js';
import { Username } from '../../domain/value-objects/username.vo.js';
import { Email } from '../../domain/value-objects/email.vo.js';
import { logger } from '../../../../../middleware/logger.js';

// Mock logger
jest.mock('../../../../../middleware/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

// Mock值对象
jest.mock('../../domain/value-objects/username.vo.js', () => ({
  Username: jest.fn(username => ({ value: username }))
}));

jest.mock('../../domain/value-objects/email.vo.js', () => ({
  Email: jest.fn(email => ({ value: email }))
}));

describe('AccountManagementUseCase', () => {
  let accountManagementUseCase;
  let mockUserRepository;
  let mockPhoneVerificationUseCase;

  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks();

    // Mock用户仓库
    mockUserRepository = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    };

    // Mock手机验证用例
    mockPhoneVerificationUseCase = {
      verifyCode: jest.fn()
    };

    // 创建用例实例
    accountManagementUseCase = new AccountManagementUseCase(
      mockUserRepository,
      mockPhoneVerificationUseCase
    );
  });

  describe('getUserInfo', () => {
    it('应该成功获取用户信息', async () => {
      const mockUser = {
        id: { value: '123' },
        username: { value: 'testuser' },
        email: { value: 'test@example.com' },
        phone: { value: '13800138000' },
        phoneVerified: true,
        status: { value: 'ACTIVE' },
        lastLoginAt: new Date(),
        preferences: { theme: 'dark' },
        createdAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.getUserInfo('123');

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe('123');
      expect(result.data.username).toBe('testuser');
      expect(result.data.email).toBe('test@example.com');
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
    });

    it('应该处理用户不存在的情况', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(accountManagementUseCase.getUserInfo('123')).rejects.toThrow('用户不存在');
    });

    it('应该处理没有手机号的用户', async () => {
      const mockUser = {
        id: { value: '123' },
        username: { value: 'testuser' },
        email: { value: 'test@example.com' },
        phone: null,
        phoneVerified: false,
        status: { value: 'ACTIVE' },
        lastLoginAt: new Date(),
        preferences: {},
        createdAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.getUserInfo('123');

      expect(result.success).toBe(true);
      expect(result.data.phone).toBeNull();
    });
  });

  describe('changeUsername', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = {
        id: { value: '123' },
        _username: { value: 'oldusername' }
      };
    });

    it('应该成功修改用户名', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.changeUsername('123', 'newusername');

      expect(result.success).toBe(true);
      expect(result.message).toBe('用户名修改成功');
      expect(Username).toHaveBeenCalledWith('newusername');
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该检查用户是否存在', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(accountManagementUseCase.changeUsername('123', 'newusername')).rejects.toThrow(
        '用户不存在'
      );

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('应该检查用户名是否已被使用', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue({
        id: { value: '456' },
        username: { value: 'newusername' }
      });

      await expect(accountManagementUseCase.changeUsername('123', 'newusername')).rejects.toThrow(
        '用户名已被使用'
      );

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('应该允许用户使用自己当前的用户名', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.changeUsername('123', 'oldusername');

      expect(result.success).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });

  describe('changeEmail', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = {
        id: { value: '123' },
        _email: { value: 'old@example.com' },
        emailVerified: true
      };
    });

    it('应该成功修改邮箱', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.changeEmail('123', 'new@example.com');

      expect(result.success).toBe(true);
      expect(result.message).toBe('邮箱修改成功，请重新验证');
      expect(Email).toHaveBeenCalledWith('new@example.com');
      expect(mockUser.emailVerified).toBe(false);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('应该检查用户是否存在', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(accountManagementUseCase.changeEmail('123', 'new@example.com')).rejects.toThrow(
        '用户不存在'
      );
    });

    it('应该检查邮箱是否已被使用', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.findByEmail.mockResolvedValue({
        id: { value: '456' },
        email: { value: 'new@example.com' }
      });

      await expect(accountManagementUseCase.changeEmail('123', 'new@example.com')).rejects.toThrow(
        '邮箱已被使用'
      );
    });
  });

  describe('bindPhone', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = {
        id: { value: '123' },
        bindPhone: jest.fn(),
        verifyPhone: jest.fn()
      };
    });

    it('应该成功绑定手机号', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.bindPhone('123', '13800138000', '123456');

      expect(result.success).toBe(true);
      expect(result.message).toBe('手机号绑定成功');
      expect(mockPhoneVerificationUseCase.verifyCode).toHaveBeenCalledWith(
        '13800138000',
        '123456',
        'bind'
      );
      expect(mockUser.bindPhone).toHaveBeenCalledWith('13800138000');
      expect(mockUser.verifyPhone).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('应该验证验证码', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockRejectedValue(new Error('验证码错误'));

      await expect(
        accountManagementUseCase.bindPhone('123', '13800138000', '123456')
      ).rejects.toThrow('验证码错误');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('应该检查用户是否存在', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        accountManagementUseCase.bindPhone('123', '13800138000', '123456')
      ).rejects.toThrow('用户不存在');
    });
  });

  describe('changePhone', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = {
        id: { value: '123' },
        changePhone: jest.fn(),
        verifyPhone: jest.fn()
      };
    });

    it('应该成功更换手机号', async () => {
      mockPhoneVerificationUseCase.verifyCode.mockResolvedValue({
        success: true,
        message: '验证成功'
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.changePhone('123', '13900139000', '123456');

      expect(result.success).toBe(true);
      expect(result.message).toBe('手机号更换成功');
      expect(mockUser.changePhone).toHaveBeenCalledWith('13900139000');
      expect(mockUser.verifyPhone).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('changePassword', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = {
        id: { value: '123' },
        changePassword: jest.fn()
      };
    });

    it('应该成功修改密码', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.changePassword(
        '123',
        'oldPassword',
        'newPassword'
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('密码修改成功');
      expect(mockUser.changePassword).toHaveBeenCalledWith('oldPassword', 'newPassword');
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('应该检查用户是否存在', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(
        accountManagementUseCase.changePassword('123', 'oldPassword', 'newPassword')
      ).rejects.toThrow('用户不存在');
    });

    it('应该传递密码验证错误', async () => {
      mockUser.changePassword.mockImplementation(() => {
        throw new Error('旧密码错误');
      });
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(
        accountManagementUseCase.changePassword('123', 'wrongPassword', 'newPassword')
      ).rejects.toThrow('旧密码错误');
    });
  });

  describe('getLoginHistory', () => {
    it('应该成功获取登录历史', async () => {
      const mockUser = {
        id: { value: '123' },
        loginHistory: [
          { timestamp: new Date('2026-01-27T10:00:00Z'), ip: '192.168.1.1' },
          { timestamp: new Date('2026-01-26T10:00:00Z'), ip: '192.168.1.2' },
          { timestamp: new Date('2026-01-25T10:00:00Z'), ip: '192.168.1.3' }
        ]
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.getLoginHistory('123', 2);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].timestamp).toEqual(new Date('2026-01-27T10:00:00Z'));
    });

    it('应该处理没有登录历史的用户', async () => {
      const mockUser = {
        id: { value: '123' },
        loginHistory: []
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.getLoginHistory('123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('应该使用默认限制', async () => {
      const mockUser = {
        id: { value: '123' },
        loginHistory: Array(15)
          .fill(null)
          .map((_, i) => ({
            timestamp: new Date(Date.now() - i * 86400000),
            ip: '192.168.1.1'
          }))
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.getLoginHistory('123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(10); // 默认限制为10
    });
  });

  describe('updatePreferences', () => {
    it('应该成功更新偏好设置', async () => {
      const mockUser = {
        id: { value: '123' },
        preferences: { theme: 'light', language: 'zh' }
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.updatePreferences('123', { theme: 'dark' });

      expect(result.success).toBe(true);
      expect(result.message).toBe('偏好设置更新成功');
      expect(mockUser.preferences).toEqual({ theme: 'dark', language: 'zh' });
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });

    it('应该合并偏好设置', async () => {
      const mockUser = {
        id: { value: '123' },
        preferences: { theme: 'light', language: 'zh', notifications: true }
      };

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await accountManagementUseCase.updatePreferences('123', {
        theme: 'dark',
        fontSize: 'large'
      });

      expect(mockUser.preferences).toEqual({
        theme: 'dark',
        language: 'zh',
        notifications: true,
        fontSize: 'large'
      });
    });
  });

  describe('deleteAccount', () => {
    let mockUser;

    beforeEach(() => {
      mockUser = {
        id: { value: '123' },
        _password: {
          verify: jest.fn()
        }
      };
    });

    it('应该成功注销账号', async () => {
      mockUser._password.verify.mockReturnValue(true);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(undefined);

      const result = await accountManagementUseCase.deleteAccount('123', 'correctPassword');

      expect(result.success).toBe(true);
      expect(result.message).toBe('账号注销成功');
      expect(mockUser._password.verify).toHaveBeenCalledWith('correctPassword');
      expect(mockUserRepository.delete).toHaveBeenCalledWith('123');
      expect(logger.info).toHaveBeenCalled();
    });

    it('应该检查用户是否存在', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(accountManagementUseCase.deleteAccount('123', 'password')).rejects.toThrow(
        '用户不存在'
      );

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('应该验证密码', async () => {
      mockUser._password.verify.mockReturnValue(false);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(accountManagementUseCase.deleteAccount('123', 'wrongPassword')).rejects.toThrow(
        '密码错误'
      );

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });
  });
});
