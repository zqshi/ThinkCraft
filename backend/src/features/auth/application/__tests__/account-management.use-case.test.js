/**
 * 账号管理用例单元测试（手机号体系）
 */
import { jest } from '@jest/globals';
import { AccountManagementUseCase } from '../account-management.use-case.js';
import { logger } from '../../../../../middleware/logger.js';

describe('AccountManagementUseCase', () => {
  let accountManagementUseCase;
  let mockUserRepository;
  let mockPhoneVerificationUseCase;
  let infoSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => {});
    warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => {});

    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    };

    mockPhoneVerificationUseCase = {
      verifyCode: jest.fn().mockResolvedValue({ success: true })
    };

    accountManagementUseCase = new AccountManagementUseCase(
      mockUserRepository,
      mockPhoneVerificationUseCase
    );
  });

  describe('getUserInfo', () => {
    it('should return user info', async () => {
      const mockUser = {
        id: { value: '123' },
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
      expect(result.data.phone).toBe('13800138000');
    });

    it('should throw when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);
      await expect(accountManagementUseCase.getUserInfo('123')).rejects.toThrow('用户不存在');
    });
  });

  describe('bindPhone', () => {
    it('should bind phone successfully', async () => {
      const mockUser = {
        id: { value: '123' },
        phone: null,
        bindPhone: jest.fn(),
        verifyPhone: jest.fn()
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.bindPhone('123', '13800138000', '123456');

      expect(result.success).toBe(true);
      expect(mockPhoneVerificationUseCase.verifyCode).toHaveBeenCalled();
      expect(mockUser.bindPhone).toHaveBeenCalledWith('13800138000');
      expect(mockUser.verifyPhone).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('changePhone', () => {
    it('should change phone successfully', async () => {
      const mockUser = {
        id: { value: '123' },
        phone: { value: '13800138000' },
        changePhone: jest.fn(),
        verifyPhone: jest.fn()
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.changePhone('123', '13900139000', '123456');

      expect(result.success).toBe(true);
      expect(mockPhoneVerificationUseCase.verifyCode).toHaveBeenCalled();
      expect(mockUser.changePhone).toHaveBeenCalledWith('13900139000');
      expect(mockUser.verifyPhone).toHaveBeenCalled();
    });
  });

  describe('getLoginHistory', () => {
    it('should return login history with limit', async () => {
      const mockUser = {
        id: { value: '123' },
        loginHistory: [
          { timestamp: new Date('2025-01-03'), success: true },
          { timestamp: new Date('2025-01-01'), success: true },
          { timestamp: new Date('2025-01-02'), success: false }
        ]
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.getLoginHistory('123', 2);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].timestamp).toEqual(new Date('2025-01-03'));
    });
  });

  describe('updatePreferences', () => {
    it('should merge and save preferences', async () => {
      const mockUser = {
        id: { value: '123' },
        preferences: { theme: 'light', language: 'zh-CN' }
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountManagementUseCase.updatePreferences('123', { theme: 'dark' });

      expect(result.success).toBe(true);
      expect(mockUser.preferences.theme).toBe('dark');
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('deleteAccount', () => {
    it('should delete account with code', async () => {
      const mockUser = {
        id: { value: '123' },
        phone: { value: '13800138000' }
      };
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.delete.mockResolvedValue(true);

      const result = await accountManagementUseCase.deleteAccount('123', '123456');

      expect(result.success).toBe(true);
      expect(mockPhoneVerificationUseCase.verifyCode).toHaveBeenCalled();
      expect(mockUserRepository.delete).toHaveBeenCalledWith('123');
    });

    it('should throw when user has no phone', async () => {
      const mockUser = { id: { value: '123' }, phone: null };
      mockUserRepository.findById.mockResolvedValue(mockUser);

      await expect(accountManagementUseCase.deleteAccount('123', '123456')).rejects.toThrow(
        '未绑定手机号'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  afterEach(() => {
    infoSpy?.mockRestore();
    warnSpy?.mockRestore();
    errorSpy?.mockRestore();
  });
});
