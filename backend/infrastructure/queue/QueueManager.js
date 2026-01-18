import Queue from 'bull';
import { domainLoggers } from '../logging/domainLogger.js';

const queueLogger = domainLoggers.Queue;
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

const redisOptions = {
  host: redisHost,
  port: redisPort
};

const reportQueue = new Queue('report-generation', { redis: redisOptions });
const collaborationQueue = new Queue('collaboration', { redis: redisOptions });

[reportQueue, collaborationQueue].forEach((queue) => {
  queue.on('error', (error) => {
    queueLogger.error('队列错误', { queue: queue.name, error: error.message });
  });
});

async function checkQueue(queue) {
  try {
    await queue.client.ping();
    return { status: 'ok' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

const queueManager = {
  reportQueue,
  collaborationQueue,
  async healthCheck() {
    return {
      report: await checkQueue(reportQueue),
      collaboration: await checkQueue(collaborationQueue)
    };
  }
};

export default queueManager;
