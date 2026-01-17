import express from 'express';
import { checkDatabase, checkRedis, checkQueue } from '../infrastructure/monitoring/HealthCheck.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const database = await checkDatabase();
  const redis = await checkRedis();
  const queue = await checkQueue();

  const services = {
    database,
    redis,
    queue
  };

  const healthy = Object.values(services).every((service) => {
    if (service.status) {
      return service.status === 'ok';
    }
    return Object.values(service).every((entry) => entry.status === 'ok');
  });

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services,
    resources: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  });
});

export default router;
