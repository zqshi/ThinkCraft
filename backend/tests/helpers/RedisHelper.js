import redisClient from '../../infrastructure/cache/RedisClient.js';

export async function flushRedis() {
  await redisClient.flushall();
}

export async function closeRedis() {
  redisClient.disconnect();
}

export { redisClient };
