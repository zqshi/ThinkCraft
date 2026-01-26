/**
 * Token服务
 * 处理JWT令牌的生成和验证
 */
import jwt from 'jsonwebtoken';

export class TokenService {
  constructor() {
    // 应该从配置中获取
    this.accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'thinkcraft-access-secret';
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'thinkcraft-refresh-secret';
    this.accessTokenExpiry = process.env.ACCESS_TOKEN_EXPIRY || '1h';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
  }

  /**
   * 生成访问令牌
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      issuer: 'thinkcraft',
      audience: 'thinkcraft-users'
    });
  }

  /**
   * 生成刷新令牌
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      issuer: 'thinkcraft',
      audience: 'thinkcraft-users'
    });
  }

  /**
   * 验证访问令牌
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'thinkcraft',
        audience: 'thinkcraft-users'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('访问令牌已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('无效的访问令牌');
      } else {
        throw new Error('令牌验证失败');
      }
    }
  }

  /**
   * 验证刷新令牌
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'thinkcraft',
        audience: 'thinkcraft-users'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('刷新令牌已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('无效的刷新令牌');
      } else {
        throw new Error('令牌验证失败');
      }
    }
  }

  /**
   * 从请求头中提取令牌
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * 解码令牌（不验证）
   */
  decodeToken(token) {
    return jwt.decode(token);
  }

  /**
   * 获取令牌的剩余有效期（秒）
   */
  getTokenRemainingTime(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return 0;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - currentTime);
    } catch (error) {
      return 0;
    }
  }
}

// 导出单例实例
export const tokenService = new TokenService();
