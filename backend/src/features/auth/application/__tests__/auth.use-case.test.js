/**
 * 认证用例测试（手机号+验证码）
 */
import { AuthUseCase } from '../auth.use-case.js';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  RefreshTokenRequestDTO
} from '../auth.dto.js';
import { userRepository } from '../../infrastructure/user-inmemory.repository.js';
import { tokenService } from '../../infrastructure/token.service.js';
import { UserService } from '../../domain/user.service.js';

describe('AuthUseCase', () => {
  let authUseCase;
  let mockPhoneVerificationUseCase;

  beforeEach(() => {
    userRepository.users.clear();
    mockPhoneVerificationUseCase = {
      verifyCode: jest.fn().mockResolvedValue({ success: true })
    };
    const userService = new UserService(
      userRepository,
      tokenService,
      mockPhoneVerificationUseCase
    );
    authUseCase = new AuthUseCase({
      userRepository,
      tokenServiceInstance: tokenService,
      userService
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerRequest = new RegisterRequestDTO('13800138000', '123456');

      const response = await authUseCase.register(registerRequest);

      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.user.phone).toBe('13800138000');
      expect(mockPhoneVerificationUseCase.verifyCode).toHaveBeenCalled();
    });

    it('should throw error when registering with existing phone', async () => {
      const registerRequest1 = new RegisterRequestDTO('13800138000', '123456');
      await authUseCase.register(registerRequest1);

      const registerRequest2 = new RegisterRequestDTO('13800138000', '123456');
      await expect(authUseCase.register(registerRequest2)).rejects.toThrow('该手机号已注册');
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      const registerRequest = new RegisterRequestDTO('13800138000', '123456');
      await authUseCase.register(registerRequest);
    });

    it('should login successfully with correct code', async () => {
      const loginRequest = new LoginRequestDTO('13800138000', '123456');

      const response = await authUseCase.login(loginRequest);

      expect(response.accessToken).toBeDefined();
      expect(response.refreshToken).toBeDefined();
      expect(response.user.phone).toBe('13800138000');
      expect(mockPhoneVerificationUseCase.verifyCode).toHaveBeenCalled();
    });

    it('should auto-register when phone not found', async () => {
      const loginRequest = new LoginRequestDTO('13900139000', '123456');

      const response = await authUseCase.login(loginRequest);

      expect(response.user.phone).toBe('13900139000');
      expect(response.isNewUser).toBe(true);
    });
  });

  describe('refreshToken', () => {
    let refreshToken;

    beforeEach(async () => {
      const registerRequest = new RegisterRequestDTO('13800138000', '123456');
      const response = await authUseCase.register(registerRequest);
      refreshToken = response.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const refreshTokenRequest = new RefreshTokenRequestDTO(refreshToken);
      const response = await authUseCase.refreshToken(refreshTokenRequest);

      expect(response.accessToken).toBeDefined();
      expect(response.user.phone).toBe('13800138000');
    });

    it('should throw error with invalid refresh token', async () => {
      const refreshTokenRequest = new RefreshTokenRequestDTO('invalid-token');
      await expect(authUseCase.refreshToken(refreshTokenRequest)).rejects.toThrow();
    });
  });
});
