/**
 * 认证中间件
 * 验证访问令牌并设置用户信息
 */
import { authUseCase } from '../application/auth.use-case.js';

/**
 * 认证中间件
 */
export async function authMiddleware(req, res, next) {
  try {
    // 从请求头中获取认证信息
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        code: -1,
        error: '未提供访问令牌'
      });
    }

    // 提取令牌
    const token = authUseCase.extractTokenFromHeader(authHeader);
    if (!token) {
      return res.status(401).json({
        code: -1,
        error: '访问令牌格式不正确'
      });
    }

    // 验证令牌
    const payload = await authUseCase.validateAccessToken(token);

    // 设置用户信息到请求对象
    req.user = payload;

    // 继续处理请求
    next();
  } catch (error) {
    console.error('[AuthMiddleware] 认证失败:', error);

    // 返回认证失败响应
    res.status(401).json({
      code: -1,
      error: error.message || '认证失败'
    });
  }
}

/**
 * 可选认证中间件
 * 不强制要求认证，但如果提供了令牌则验证
 */
export async function optionalAuthMiddleware(req, res, next) {
  try {
    // 从请求头中获取认证信息
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // 没有提供令牌，继续处理
      return next();
    }

    // 提取令牌
    const token = authUseCase.extractTokenFromHeader(authHeader);
    if (!token) {
      // 令牌格式不正确，继续处理
      return next();
    }

    // 验证令牌
    const payload = await authUseCase.validateAccessToken(token);

    // 设置用户信息到请求对象
    req.user = payload;

    // 继续处理请求
    next();
  } catch (error) {
    // 令牌验证失败，但不阻止请求继续
    next();
  }
}
