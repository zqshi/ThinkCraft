/**
 * 认证用例测试
 */
import { AuthUseCase } from '../auth.use-case.js';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  RefreshTokenRequestDTO,
  ChangePasswordRequestDTO
} from '../auth.dto.js';
import { userRepository } from '../../infrastructure/user-inmemory.repository.js';
import { tokenService } from '../../infrastructure/token.service.js';

describe('AuthUseCase', () => {
  let authUseCase;

  beforeEach(() => {
    authUseCase = new AuthUseCase();
    // 清空仓库
    userRepository.users.clear();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerRequest = new RegisterRequestDTO(
        'testuser',
        'test@example.com',
        'password123'
      );

      const response = await authUseCase.register(registerRequest);

      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.user.username).toBe('testuser');
      expect(response.user.email).toBe('test@example.com');
    });

    it('should throw error when registering with existing username', async () => {
      // 先注册一个用户
      const registerRequest1 = new RegisterRequestDTO(
        'testuser',
        'test1@example.com',
        'password123'
      );
      await authUseCase.register(registerRequest1);

      // 尝试用相同用户名注册
      const registerRequest2 = new RegisterRequestDTO(
        'testuser',
        'test2@example.com',
        'password456'
      );

      await expect(authUseCase.register(registerRequest2)).rejects.toThrow('用户名已存在');
    });

    it('should throw error when registering with existing email', async () => {
      // 先注册一个用户
      const registerRequest1 = new RegisterRequestDTO(
        'testuser1',
        'test@example.com',
        'password123'
      );
      await authUseCase.register(registerRequest1);

      // 尝试用相同邮箱注册
      const registerRequest2 = new RegisterRequestDTO(
        'testuser2',
        'test@example.com',
        'password456'
      );

      await expect(authUseCase.register(registerRequest2)).rejects.toThrow('邮箱已被注册');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // 先注册一个用户
      const registerRequest = new RegisterRequestDTO(
        'testuser',
        'test@example.com',
        'password123'
      );
      await authUseCase.register(registerRequest);
    });

    it('should login successfully with correct credentials', async () => {
      const loginRequest = new LoginRequestDTO('testuser', 'password123');

      const response = await authUseCase.login(loginRequest);

      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.user.username).toBe('testuser');
    });

    it('should throw error with incorrect password', async () => {
      const loginRequest = new LoginRequestDTO('testuser', 'wrongpassword');

      await expect(authUseCase.login(loginRequest)).rejects.toThrow('密码错误');
    });

    it('should throw error with non-existent username', async () => {
      const loginRequest = new LoginRequestDTO('nonexistent', 'password123');

      await expect(authUseCase.login(loginRequest)).rejects.toThrow('用户不存在');
    });

    it('should lock account after 5 failed login attempts', async () => {
      // 尝试5次错误登录
      for (let i = 0; i < 5; i++) {
        try {
          const loginRequest = new LoginRequestDTO('testuser', 'wrongpassword');
          await authUseCase.login(loginRequest);
        } catch (error) {
          // Expected error
        }
      }

      // 第6次尝试应该提示账户被锁定
      const loginRequest = new LoginRequestDTO('testuser', 'password123');
      await expect(authUseCase.login(loginRequest)).rejects.toThrow('账户已被锁定');
    });
  });

  describe('refreshToken', () => {
    let refreshToken;

    beforeEach(async () => {
      // 先注册并登录一个用户
      const registerRequest = new RegisterRequestDTO(
        'testuser',
        'test@example.com',
        'password123'
      );
      const response = await authUseCase.register(registerRequest);
      refreshToken = response.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const refreshTokenRequest = new RefreshTokenRequestDTO(refreshToken);

      const response = await authUseCase.refreshToken(refreshTokenRequest);

      expect(response.accessToken).toBeDefined();
      expect(response.user.username).toBe('testuser');
    });

    it('should throw error with invalid refresh token', async () => {
      const refreshTokenRequest = new RefreshTokenRequestDTO('invalid-token');

      await expect(authUseCase.refreshToken(refreshTokenRequest)).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    let userId;

    beforeEach(async () => {
      // 先注册一个用户
      const registerRequest = new RegisterRequestDTO(
        'testuser',
        'test@example.com',
        'password123'
      );
      const response = await authUseCase.register(registerRequest);
      userId = response.user.id;
    });

    it('should change password successfully', async () => {
      const changePasswordRequest = new ChangePasswordRequestDTO(
        'password123',
        'newpassword456'
      );

      const response = await authUseCase.changePassword(userId, changePasswordRequest);

      expect(response.username).toBe('testuser');

      // 验证新密码可以登录
      const loginRequest = new LoginRequestDTO('testuser', 'newpassword456');
      const loginResponse = await authUseCase.login(loginRequest);
      expect(loginResponse.accessToken).toBeDefined();
    });

    it('should throw error with incorrect old password', async () => {
      const changePasswordRequest = new ChangePasswordRequestDTO(
        'wrongpassword',
        'newpassword456'
      );

      await expect(
        authUseCase.changePassword(userId, changePasswordRequest)
      ).rejects.toThrow('原密码错误');
    });
  });

  describe('logout', () => {
    let userId;

    beforeEach(async () => {
      // 先注册一个用户
      const registerRequest = new RegisterRequestDTO(
        'testuser',
        'test@example.com',
        'password123'
      );
      const response = await authUseCase.register(registerRequest);
      userId = response.user.id;
    });

    it('should logout successfully', async () => {
      const result = await authUseCase.logout(userId);

      expect(result).toBe(true);
    });

    it('should throw error when logging out non-existent user', async () => {
      await expect(authUseCase.logout('non-existent-id')).rejects.toThrow('用户不存在');
    });
  });

  describe('validateAccessToken', () => {
    let accessToken;
    let userId;

    beforeEach(async () => {
      // 先注册并登录一个用户
      const registerRequest = new RegisterRequestDTO(
        'testuser',
        'test@example.com',
        'password123'
      );
      const response = await authUseCase.register(registerRequest);
      accessToken = response.accessToken;
      userId = response.user.id;
    });

    it('should validate access token successfully', async () => {
      const result = await authUseCase.validateAccessToken(accessToken);

      expect(result.userId).toBe(userId);
      expect(result.username).toBe('testuser');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw error with invalid access token', async () => {
      await expect(authUseCase.validateAccessToken('invalid-token')).rejects.toThrow();
    });

    it('should throw error when user is locked', async () => {
      // 锁定用户账户
      const user = await userRepository.findById(userId);
      user.lockAccount(30);
      await userRepository.save(user);

      await expect(authUseCase.validateAccessToken(accessToken)).rejects.toThrow('账户已被锁定');
    });
  });
});
