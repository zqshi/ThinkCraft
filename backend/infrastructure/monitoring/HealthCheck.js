import { testConnection } from '../database/sequelize.js';
import redisClient from '../cache/RedisClient.js';
import queueManager from '../queue/QueueManager.js';

export async function checkDatabase() {
  const ok = await testConnection();
  return { status: ok ? 'ok' : 'error' };
}

export async function checkRedis() {
  try {
    const response = await redisClient.ping();
    return { status: response === 'PONG' ? 'ok' : 'error' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

export async function checkQueue() {
  return queueManager.healthCheck();
}
