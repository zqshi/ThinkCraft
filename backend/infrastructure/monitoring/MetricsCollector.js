import { domainLoggers } from '../logging/domainLogger.js';

const logger = domainLoggers.Server;

export class MetricsCollector {
  recordAPICall(endpoint, durationMs, statusCode) {
    logger.info('api_call', {
      endpoint,
      durationMs,
      statusCode,
      timestamp: new Date().toISOString()
    });
  }

  recordCacheHit(key, hit) {
    logger.info('cache_metric', {
      key,
      hit,
      timestamp: new Date().toISOString()
    });
  }
}

export const metricsCollector = new MetricsCollector();
export default MetricsCollector;
