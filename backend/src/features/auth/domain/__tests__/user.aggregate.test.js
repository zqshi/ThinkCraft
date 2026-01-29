/**
 * 用户聚合根测试（手机号体系）
 */
import { User } from '../user.aggregate.js';
import { UserId } from '../value-objects/user-id.vo.js';
import { UserStatus } from '../value-objects/user-status.vo.js';

describe('User Aggregate', () => {
  describe('createWithPhone', () => {
    it('should create a new user with valid phone', () => {
      const user = User.createWithPhone('13800138000');

      expect(user.phone.value).toBe('13800138000');
      expect(user.status.value).toBe('active');
      expect(user.getDomainEvents()).toHaveLength(1);
      expect(user.getDomainEvents()[0].constructor.name).toBe('UserCreatedEvent');
    });
  });

  describe('loginWithPhone', () => {
    it('should login successfully', () => {
      const user = User.createWithPhone('13800138000');
      user.clearDomainEvents();

      user.loginWithPhone();

      expect(user.lastLoginAt).not.toBeNull();
      expect(user.loginAttempts).toBe(0);
      expect(user.getDomainEvents()).toHaveLength(1);
      expect(user.getDomainEvents()[0].constructor.name).toBe('UserLoggedInEvent');
    });

    it('should not allow login when account is locked', () => {
      const user = User.createWithPhone('13800138000');
      user.lockAccount(30);

      expect(() => user.loginWithPhone()).toThrow('账户已被锁定');
    });
  });

  describe('lockAccount', () => {
    it('should lock account for specified minutes', () => {
      const user = User.createWithPhone('13800138000');

      user.lockAccount(30);

      expect(user.isLocked()).toBe(true);
      expect(user.lockedUntil).not.toBeNull();
    });
  });

  describe('unlockAccount', () => {
    it('should unlock account and reset login attempts', () => {
      const user = User.createWithPhone('13800138000');
      user.lockAccount(30);

      user.unlockAccount();

      expect(user.isLocked()).toBe(false);
      expect(user.lockedUntil).toBeNull();
      expect(user.loginAttempts).toBe(0);
    });
  });

  describe('validate', () => {
    it('should validate complete user', () => {
      const user = User.createWithPhone('13800138000');
      expect(() => user.validate()).not.toThrow();
    });

    it('should throw error for missing phone', () => {
      const user = new User(UserId.fromString('user-1'), UserStatus.ACTIVE, null);
      expect(() => user.validate()).toThrow('手机号不能为空');
    });
  });

  describe('toJSON', () => {
    it('should serialize user to JSON', () => {
      const user = User.createWithPhone('13800138000');
      const json = user.toJSON();

      expect(json).toHaveProperty('id');
      expect(json.phone).toBe('13800138000');
      expect(json.status).toBe('active');
      expect(json).not.toHaveProperty('password');
    });
  });
});
