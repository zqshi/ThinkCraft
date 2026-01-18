import IORedis from 'ioredis';
import { domainLoggers } from '../logging/domainLogger.js';

const cacheLogger = domainLoggers.Cache || domainLoggers.Server;

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

const redisClient = new IORedis({
  host: redisHost,
  port: redisPort,
  maxRetriesPerRequest: 3
});

redisClient.on('connect', () => {
  cacheLogger.info('Redis连接成功', { host: redisHost, port: redisPort });
});

redisClient.on('error', (error) => {
  cacheLogger.error('Redis连接异常', error);
});

export default redisClient;
