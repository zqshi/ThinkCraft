import auditLogger from '../infrastructure/logging/auditLogger.js';

const SENSITIVE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_PATH_PREFIXES = [
  '/api/agents',
  '/api/collaboration',
  '/api/report',
  '/api/business-plan',
  '/api/demo-generator',
  '/api/pdf-export',
  '/api/share',
  '/api/conversations',
  '/api/chat',
  '/api/vision',
  '/api/users'
];

function isSensitiveRequest(req) {
  if (SENSITIVE_METHODS.has(req.method)) {
    return true;
  }
  if (req.path.includes('/export')) {
    return true;
  }
  return SENSITIVE_PATH_PREFIXES.some((prefix) => req.path.startsWith(prefix));
}

export default function auditLoggerMiddleware(req, res, next) {
  const enabled = (process.env.AUDIT_LOG_ENABLED || 'true').toLowerCase() === 'true';
  if (!enabled) {
    return next();
  }

  if (!isSensitiveRequest(req)) {
    return next();
  }

  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    auditLogger.info('audit', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      userId: req.userId || req.body?.userId || null,
      ip: req.ip,
      userAgent: req.get('user-agent')
    });
  });

  return next();
}
