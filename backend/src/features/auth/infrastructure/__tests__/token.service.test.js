/**
 * Token服务测试
 */
import { TokenService } from '../token.service.js';

describe('TokenService', () => {
  let tokenService;

  beforeEach(() => {
    tokenService = new TokenService();
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const token = tokenService.generateAccessToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT格式：header.payload.signature
    });

    it('should include payload data in token', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser'
      };

      const token = tokenService.generateAccessToken(payload);
      const decoded = tokenService.decodeToken(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.username).toBe('testuser');
      expect(decoded.iss).toBe('thinkcraft');
      expect(decoded.aud).toBe('thinkcraft-users');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser'
      };

      const token = tokenService.generateRefreshToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate different tokens for access and refresh', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser'
      };

      const accessToken = tokenService.generateAccessToken(payload);
      const refreshToken = tokenService.generateRefreshToken(payload);

      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser'
      };

      const token = tokenService.generateAccessToken(payload);
      const verified = tokenService.verifyAccessToken(token);

      expect(verified.userId).toBe('user-123');
      expect(verified.username).toBe('testuser');
    });

    it('should throw error for invalid access token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => tokenService.verifyAccessToken(invalidToken)).toThrow('无效的访问令牌');
    });

    it('should throw error for refresh token used as access token', () => {
      const payload = { userId: 'user-123' };
      const refreshToken = tokenService.generateRefreshToken(payload);

      expect(() => tokenService.verifyAccessToken(refreshToken)).toThrow('无效的访问令牌');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser'
      };

      const token = tokenService.generateRefreshToken(payload);
      const verified = tokenService.verifyRefreshToken(token);

      expect(verified.userId).toBe('user-123');
      expect(verified.username).toBe('testuser');
    });

    it('should throw error for invalid refresh token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => tokenService.verifyRefreshToken(invalidToken)).toThrow('无效的刷新令牌');
    });

    it('should throw error for access token used as refresh token', () => {
      const payload = { userId: 'user-123' };
      const accessToken = tokenService.generateAccessToken(payload);

      expect(() => tokenService.verifyRefreshToken(accessToken)).toThrow('无效的刷新令牌');
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const authHeader = `Bearer ${token}`;

      const extracted = tokenService.extractTokenFromHeader(authHeader);

      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = tokenService.extractTokenFromHeader(null);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const extracted1 = tokenService.extractTokenFromHeader('InvalidFormat token');
      const extracted2 = tokenService.extractTokenFromHeader('Bearer');
      const extracted3 = tokenService.extractTokenFromHeader('token');

      expect(extracted1).toBeNull();
      expect(extracted2).toBeNull();
      expect(extracted3).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const payload = {
        userId: 'user-123',
        username: 'testuser'
      };

      const token = tokenService.generateAccessToken(payload);
      const decoded = tokenService.decodeToken(token);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.username).toBe('testuser');
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    it('should return null for invalid token', () => {
      const decoded = tokenService.decodeToken('invalid-token');

      expect(decoded).toBeNull();
    });
  });

  describe('getTokenRemainingTime', () => {
    it('should return remaining time for valid token', () => {
      const payload = { userId: 'user-123' };
      const token = tokenService.generateAccessToken(payload);

      const remainingTime = tokenService.getTokenRemainingTime(token);

      // 访问令牌默认1小时有效期，应该接近3600秒
      expect(remainingTime).toBeGreaterThan(3500);
      expect(remainingTime).toBeLessThanOrEqual(3600);
    });

    it('should return 0 for invalid token', () => {
      const remainingTime = tokenService.getTokenRemainingTime('invalid-token');

      expect(remainingTime).toBe(0);
    });

    it('should return 0 for token without expiry', () => {
      const remainingTime = tokenService.getTokenRemainingTime(null);

      expect(remainingTime).toBe(0);
    });
  });

  describe('token lifecycle', () => {
    it('should handle complete token lifecycle', () => {
      // 1. 生成令牌
      const payload = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com'
      };

      const accessToken = tokenService.generateAccessToken(payload);
      const refreshToken = tokenService.generateRefreshToken(payload);

      // 2. 验证令牌
      const verifiedAccess = tokenService.verifyAccessToken(accessToken);
      const verifiedRefresh = tokenService.verifyRefreshToken(refreshToken);

      expect(verifiedAccess.userId).toBe('user-123');
      expect(verifiedRefresh.userId).toBe('user-123');

      // 3. 从请求头提取
      const authHeader = `Bearer ${accessToken}`;
      const extracted = tokenService.extractTokenFromHeader(authHeader);

      expect(extracted).toBe(accessToken);

      // 4. 解码令牌
      const decoded = tokenService.decodeToken(extracted);

      expect(decoded.userId).toBe('user-123');

      // 5. 检查剩余时间
      const remainingTime = tokenService.getTokenRemainingTime(extracted);

      expect(remainingTime).toBeGreaterThan(0);
    });
  });
});
