import { cacheConfig } from '../../../config/cache.js';

export class AgentCacheStrategy {
  static getListKey(userId) {
    return `agents:${userId}`;
  }

  static get ttl() {
    return cacheConfig.TTL.AGENT_LIST;
  }
}
