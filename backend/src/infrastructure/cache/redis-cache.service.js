/**
 * Redis缓存服务
 * 提供统一的缓存操作接口
 */
import { redisManager } from '../../../config/database.js';

/**
 * 缓存键前缀
 */
export const CachePrefix = {
  USER: 'user:',
  SESSION: 'session:',
  PROJECT: 'project:',
  CHAT: 'chat:',
  BUSINESS_PLAN: 'business_plan:',
  RATE_LIMIT: 'rate_limit:'
};

/**
 * 缓存TTL（秒）
 */
export const CacheTTL = {
  USER: 3600, // 1小时
  SESSION: 3600, // 1小时
  PROJECT: 300, // 5分钟
  CHAT: 600, // 10分钟
  BUSINESS_PLAN: 3600, // 1小时
  RATE_LIMIT: 60 // 1分钟
};

/**
 * Redis缓存服务类
 */
class RedisCacheService {
  constructor() {
    this.enabled = false;
  }

  /**
   * 初始化缓存服务
   */
  async init() {
    try {
      if (redisManager.isConnected()) {
        this.enabled = true;
        console.log('[CacheService] Redis缓存已启用');
      } else {
        console.warn('[CacheService] Redis未连接，缓存功能已禁用');
      }
    } catch (error) {
      console.error('[CacheService] 初始化失败:', error);
      this.enabled = false;
    }
  }

  /**
   * 获取Redis客户端
   */
  getClient() {
    if (!this.enabled) {
      return null;
    }
    return redisManager.getClient();
  }

  /**
   * 是否启用缓存
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * 设置缓存
   */
  async set(key, value, ttl = 3600) {
    if (!this.enabled) {
      return false;
    }

    try {
      const client = this.getClient();
      const serialized = JSON.stringify(value);
      await client.setEx(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error('[CacheService] set error:', error);
      return false;
    }
  }

  /**
   * 获取缓存
   */
  async get(key) {
    if (!this.enabled) {
      return null;
    }

    try {
      const client = this.getClient();
      const data = await client.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('[CacheService] get error:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async del(key) {
    if (!this.enabled) {
      return false;
    }

    try {
      const client = this.getClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('[CacheService] del error:', error);
      return false;
    }
  }

  /**
   * 批量删除缓存（通过模式匹配）
   */
  async delPattern(pattern) {
    if (!this.enabled) {
      return false;
    }

    try {
      const client = this.getClient();
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        await client.del(keys);
      }

      return true;
    } catch (error) {
      console.error('[CacheService] delPattern error:', error);
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key) {
    if (!this.enabled) {
      return false;
    }

    try {
      const client = this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('[CacheService] exists error:', error);
      return false;
    }
  }

  /**
   * 设置缓存过期时间
   */
  async expire(key, ttl) {
    if (!this.enabled) {
      return false;
    }

    try {
      const client = this.getClient();
      await client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('[CacheService] expire error:', error);
      return false;
    }
  }

  /**
   * 获取缓存剩余时间
   */
  async ttl(key) {
    if (!this.enabled) {
      return -1;
    }

    try {
      const client = this.getClient();
      return await client.ttl(key);
    } catch (error) {
      console.error('[CacheService] ttl error:', error);
      return -1;
    }
  }

  /**
   * 缓存用户数据
   */
  async cacheUser(userId, userData) {
    const key = `${CachePrefix.USER}${userId}`;
    return await this.set(key, userData, CacheTTL.USER);
  }

  /**
   * 获取缓存的用户数据
   */
  async getCachedUser(userId) {
    const key = `${CachePrefix.USER}${userId}`;
    return await this.get(key);
  }

  /**
   * 删除用户缓存
   */
  async deleteCachedUser(userId) {
    const key = `${CachePrefix.USER}${userId}`;
    return await this.del(key);
  }

  /**
   * 缓存会话数据
   */
  async cacheSession(sessionId, sessionData) {
    const key = `${CachePrefix.SESSION}${sessionId}`;
    return await this.set(key, sessionData, CacheTTL.SESSION);
  }

  /**
   * 获取缓存的会话数据
   */
  async getCachedSession(sessionId) {
    const key = `${CachePrefix.SESSION}${sessionId}`;
    return await this.get(key);
  }

  /**
   * 删除会话缓存
   */
  async deleteCachedSession(sessionId) {
    const key = `${CachePrefix.SESSION}${sessionId}`;
    return await this.del(key);
  }

  /**
   * 速率限制检查
   */
  async checkRateLimit(identifier, limit, window) {
    if (!this.enabled) {
      return { allowed: true, remaining: limit };
    }

    try {
      const client = this.getClient();
      const key = `${CachePrefix.RATE_LIMIT}${identifier}`;

      // 获取当前计数
      const current = await client.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= limit) {
        const ttl = await client.ttl(key);
        return {
          allowed: false,
          remaining: 0,
          resetIn: ttl
        };
      }

      // 增加计数
      const newCount = await client.incr(key);

      // 如果是第一次，设置过期时间
      if (newCount === 1) {
        await client.expire(key, window);
      }

      return {
        allowed: true,
        remaining: limit - newCount,
        resetIn: await client.ttl(key)
      };
    } catch (error) {
      console.error('[CacheService] checkRateLimit error:', error);
      // 出错时允许请求通过
      return { allowed: true, remaining: limit };
    }
  }

  /**
   * 清空所有缓存
   */
  async flushAll() {
    if (!this.enabled) {
      return false;
    }

    try {
      const client = this.getClient();
      await client.flushDb();
      console.log('[CacheService] 已清空所有缓存');
      return true;
    } catch (error) {
      console.error('[CacheService] flushAll error:', error);
      return false;
    }
  }
}

// 导出单例实例
export const cacheService = new RedisCacheService();
