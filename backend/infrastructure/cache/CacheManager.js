import redisClient from './RedisClient.js';

class CacheManager {
  constructor(client) {
    this.client = client;
  }

  async get(key) {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  async set(key, value, ttlSeconds = null) {
    try {
      const payload = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, payload);
        return;
      }
      await this.client.set(key, payload);
    } catch (error) {
      return;
    }
  }

  async delete(key) {
    try {
      await this.client.del(key);
    } catch (error) {
      return;
    }
  }
}

const cacheManager = new CacheManager(redisClient);

export { CacheManager };
export default cacheManager;
