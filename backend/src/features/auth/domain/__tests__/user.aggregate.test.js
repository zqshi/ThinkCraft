/**
 * 用户聚合根测试
 */
import { User } from '../user.aggregate.js';
import { UserId } from '../value-objects/user-id.vo.js';
import { Username } from '../value-objects/username.vo.js';
import { Email } from '../value-objects/email.vo.js';
import { Password } from '../value-objects/password.vo.js';
import { UserStatus } from '../value-objects/user-status.vo.js';

describe('User Aggregate', () => {
  describe('create', () => {
    it('should create a new user with valid data', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      expect(user.username.value).toBe('testuser');
      expect(user.email.value).toBe('test@example.com');
      expect(user.status.value).toBe('active');
      expect(user.getDomainEvents()).toHaveLength(1);
      expect(user.getDomainEvents()[0].constructor.name).toBe('UserCreatedEvent');
    });

    it('should throw error with invalid username', () => {
      expect(() => User.create('', 'test@example.com', 'password123')).toThrow();
    });

    it('should throw error with invalid email', () => {
      expect(() => User.create('testuser', 'invalid-email', 'password123')).toThrow();
    });

    it('should throw error with weak password', () => {
      expect(() => User.create('testuser', 'test@example.com', '123')).toThrow();
    });
  });

  describe('login', () => {
    it('should login successfully with correct password', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      user.clearDomainEvents();

      user.login('password123');

      expect(user.lastLoginAt).not.toBeNull();
      expect(user.loginAttempts).toBe(0);
      expect(user.getDomainEvents()).toHaveLength(1);
      expect(user.getDomainEvents()[0].constructor.name).toBe('UserLoggedInEvent');
    });

    it('should throw error with incorrect password', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      expect(() => user.login('wrongpassword')).toThrow('密码错误');
    });

    it('should increment login attempts on failed login', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      try {
        user.login('wrongpassword');
      } catch (e) {
        // Expected error
      }

      expect(user.loginAttempts).toBe(1);
    });

    it('should lock account after 5 failed attempts', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      // 尝试4次错误登录
      for (let i = 0; i < 4; i++) {
        try {
          user.login('wrongpassword');
        } catch (e) {
          // Expected error
        }
      }

      expect(user.loginAttempts).toBe(4);
      expect(user.isLocked()).toBe(false);

      // 第5次错误登录应该锁定账户
      expect(() => user.login('wrongpassword')).toThrow('密码错误次数过多，账户已锁定30分钟');
      expect(user.isLocked()).toBe(true);
    });

    it('should not allow login when account is locked', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      user.lockAccount(30);

      expect(() => user.login('password123')).toThrow('账户已被锁定，请稍后再试');
    });
  });

  describe('logout', () => {
    it('should emit logout event', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      user.clearDomainEvents();

      user.logout();

      expect(user.getDomainEvents()).toHaveLength(1);
      expect(user.getDomainEvents()[0].constructor.name).toBe('UserLoggedOutEvent');
    });
  });

  describe('changePassword', () => {
    it('should change password with correct old password', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      user.changePassword('password123', 'newpassword456');

      // 验证新密码可以登录
      user.login('newpassword456');
      expect(user.lastLoginAt).not.toBeNull();
    });

    it('should throw error with incorrect old password', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      expect(() => user.changePassword('wrongpassword', 'newpassword456')).toThrow('原密码错误');
    });
  });

  describe('lockAccount', () => {
    it('should lock account for specified minutes', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      user.lockAccount(30);

      expect(user.isLocked()).toBe(true);
      expect(user.lockedUntil).not.toBeNull();
    });
  });

  describe('unlockAccount', () => {
    it('should unlock account and reset login attempts', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      user.lockAccount(30);

      user.unlockAccount();

      expect(user.isLocked()).toBe(false);
      expect(user.lockedUntil).toBeNull();
      expect(user.loginAttempts).toBe(0);
    });
  });

  describe('isLocked', () => {
    it('should return false when not locked', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      expect(user.isLocked()).toBe(false);
    });

    it('should return true when locked', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');
      user.lockAccount(30);

      expect(user.isLocked()).toBe(true);
    });

    it('should auto-unlock when lock time expires', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      // 设置一个已过期的锁定时间
      const pastTime = new Date();
      pastTime.setMinutes(pastTime.getMinutes() - 1);
      user._lockedUntil = pastTime;

      expect(user.isLocked()).toBe(false);
      expect(user.lockedUntil).toBeNull();
    });
  });

  describe('validate', () => {
    it('should validate complete user', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      expect(() => user.validate()).not.toThrow();
    });

    it('should throw error for incomplete user', () => {
      const user = new User(
        UserId.fromString('user-1'),
        null,
        new Email('test@example.com'),
        Password.create('password123')
      );

      expect(() => user.validate()).toThrow('用户信息不完整');
    });
  });

  describe('toJSON', () => {
    it('should serialize user to JSON', () => {
      const user = User.create('testuser', 'test@example.com', 'password123');

      const json = user.toJSON();

      expect(json).toHaveProperty('id');
      expect(json.username).toBe('testuser');
      expect(json.email).toBe('test@example.com');
      expect(json.status).toBe('active');
      expect(json).not.toHaveProperty('password');
    });
  });
});
