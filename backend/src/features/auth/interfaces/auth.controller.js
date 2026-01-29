/**
 * 认证控制器
 * 处理HTTP请求和响应
 */
import { authUseCase } from '../application/auth.use-case.js';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  RefreshTokenRequestDTO
} from '../application/auth.dto.js';

export class AuthController {
  /**
   * 用户登录
   */
  async login(req, res) {
    try {
      const { phone, code } = req.body;

      // 创建登录请求DTO
      const loginRequest = new LoginRequestDTO(phone, code);

      // 执行登录用例
      const response = await authUseCase.login(loginRequest);

      // 返回成功响应
      res.json({
        code: 0,
        message: '登录成功',
        data: response
      });
    } catch (error) {
      console.error('[AuthController] 登录失败:', error);

      // 返回错误响应
      res.status(401).json({
        code: -1,
        error: error.message || '登录失败'
      });
    }
  }

  /**
   * 用户注册
   */
  async register(req, res) {
    try {
      const { phone, code } = req.body;

      // 创建注册请求DTO
      const registerRequest = new RegisterRequestDTO(phone, code);

      // 执行注册用例
      const response = await authUseCase.register(registerRequest);

      // 返回成功响应
      res.status(201).json({
        code: 0,
        message: '注册成功',
        data: response
      });
    } catch (error) {
      console.error('[AuthController] 注册失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '注册失败'
      });
    }
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      // 创建刷新令牌请求DTO
      const refreshTokenRequest = new RefreshTokenRequestDTO(refreshToken);

      // 执行刷新令牌用例
      const response = await authUseCase.refreshToken(refreshTokenRequest);

      // 返回成功响应
      res.json({
        code: 0,
        message: '令牌刷新成功',
        data: response
      });
    } catch (error) {
      console.error('[AuthController] 刷新令牌失败:', error);

      // 返回错误响应
      res.status(401).json({
        code: -1,
        error: error.message || '刷新令牌失败'
      });
    }
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(req, res) {
    try {
      // 从请求中获取用户ID（由认证中间件设置）
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          code: -1,
          error: '未授权访问'
        });
      }

      // 执行获取用户信息用例
      const userInfo = await authUseCase.getCurrentUser(userId);

      // 返回成功响应
      res.json({
        code: 0,
        message: '获取用户信息成功',
        data: userInfo
      });
    } catch (error) {
      console.error('[AuthController] 获取用户信息失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '获取用户信息失败'
      });
    }
  }

  /**
   * 用户登出
   */
  async logout(req, res) {
    try {
      // 从请求中获取用户ID
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          code: -1,
          error: '未授权访问'
        });
      }

      // 执行登出用例
      await authUseCase.logout(userId);

      // 返回成功响应
      res.json({
        code: 0,
        message: '登出成功',
        data: { success: true }
      });
    } catch (error) {
      console.error('[AuthController] 登出失败:', error);

      // 返回错误响应
      res.status(400).json({
        code: -1,
        error: error.message || '登出失败'
      });
    }
  }

  /**
   * 验证令牌
   */
  async validateToken(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authUseCase.extractTokenFromHeader(authHeader);

      if (!token) {
        return res.status(401).json({
          code: -1,
          error: '未提供访问令牌'
        });
      }

      // 验证令牌
      const payload = await authUseCase.validateAccessToken(token);

      // 返回成功响应
      res.json({
        code: 0,
        message: '令牌有效',
        data: payload
      });
    } catch (error) {
      console.error('[AuthController] 令牌验证失败:', error);

      // 返回错误响应
      res.status(401).json({
        code: -1,
        error: error.message || '令牌验证失败'
      });
    }
  }
}

// 导出控制器实例
export const authController = new AuthController();
