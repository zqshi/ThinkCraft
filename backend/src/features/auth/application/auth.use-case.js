/**
 * 认证用例
 * 实现用户认证相关的业务用例
 */
import {
  LoginResponseDTO,
  RegisterResponseDTO,
  RefreshTokenResponseDTO,
  UserInfoDTO
} from './auth.dto.js';
import { UserService } from '../domain/user.service.js';
import { getUserRepository } from '../../../shared/infrastructure/repository.factory.js';
import { tokenService } from '../infrastructure/token.service.js';

export class AuthUseCase {
  constructor() {
    this.userRepository = getUserRepository();
    this.tokenService = tokenService;
    this.userService = new UserService(this.userRepository, tokenService);
  }

  /**
   * 用户登录
   */
  async login(loginRequest) {
    try {
      // 验证请求数据
      loginRequest.validate();

      // 执行登录
      const { user, accessToken, refreshToken } = await this.userService.login(
        loginRequest.username,
        loginRequest.password
      );

      // 返回响应
      return new LoginResponseDTO(accessToken, refreshToken, user);
    } catch (error) {
      console.error('[AuthUseCase] 登录失败:', error);
      throw error;
    }
  }

  /**
   * 用户注册
   */
  async register(registerRequest) {
    try {
      // 验证请求数据
      registerRequest.validate();

      // 执行注册
      const { user, accessToken, refreshToken } = await this.userService.register(
        registerRequest.username,
        registerRequest.email,
        registerRequest.password
      );

      // 返回响应
      return new RegisterResponseDTO(accessToken, refreshToken, user);
    } catch (error) {
      console.error('[AuthUseCase] 注册失败:', error);
      throw error;
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshTokenRequest) {
    try {
      // 验证请求数据
      refreshTokenRequest.validate();

      // 执行刷新
      const { accessToken, user } = await this.userService.refreshToken(
        refreshTokenRequest.refreshToken
      );

      // 返回响应
      return new RefreshTokenResponseDTO(accessToken, user);
    } catch (error) {
      console.error('[AuthUseCase] 刷新令牌失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId) {
    try {
      // 查找用户
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 返回用户信息
      return new UserInfoDTO(user);
    } catch (error) {
      console.error('[AuthUseCase] 获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 修改密码
   */
  async changePassword(userId, changePasswordRequest) {
    try {
      // 验证请求数据
      changePasswordRequest.validate();

      // 执行修改密码
      const user = await this.userService.changePassword(
        userId,
        changePasswordRequest.oldPassword,
        changePasswordRequest.newPassword
      );

      // 返回用户信息
      return new UserInfoDTO(user);
    } catch (error) {
      console.error('[AuthUseCase] 修改密码失败:', error);
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout(userId) {
    try {
      // 查找用户
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 执行登出
      user.logout();

      // 保存用户状态
      await this.userRepository.save(user);

      return true;
    } catch (error) {
      console.error('[AuthUseCase] 登出失败:', error);
      throw error;
    }
  }

  /**
   * 验证访问令牌
   */
  async validateAccessToken(accessToken) {
    try {
      // 验证令牌
      const payload = tokenService.verifyAccessToken(accessToken);

      // 查找用户
      const user = await this.userRepository.findById(payload.userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查用户状态
      if (!user.status.isActive()) {
        throw new Error('用户状态异常');
      }

      // 检查账户是否被锁定
      if (user.isLocked()) {
        throw new Error('账户已被锁定');
      }

      return {
        userId: user.id.value,
        username: user.username.value,
        email: user.email.value
      };
    } catch (error) {
      console.error('[AuthUseCase] 令牌验证失败:', error);
      throw error;
    }
  }
}

// 导出用例实例
export const authUseCase = new AuthUseCase();
