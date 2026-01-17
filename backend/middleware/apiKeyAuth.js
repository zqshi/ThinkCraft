import crypto from 'crypto';

const API_KEY = process.env.API_KEY || '';
const API_KEYS = (process.env.API_KEYS || API_KEY)
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean);

function extractApiKey(req) {
  const authHeader = req.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  const headerKey = req.get('x-api-key');
  return headerKey ? headerKey.trim() : '';
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export default function apiKeyAuth(req, res, next) {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  if (API_KEYS.length === 0) {
    return res.status(500).json({
      code: -1,
      error: 'Server misconfigured'
    });
  }

  if (req.path === '/api/health') {
    return next();
  }
  if (req.method === 'OPTIONS') {
    return next();
  }

  const providedKey = extractApiKey(req);
  if (!providedKey) {
    return res.status(401).json({
      code: -1,
      error: 'Unauthorized'
    });
  }

  const isAllowed = API_KEYS.some((key) => safeEqual(providedKey, key));
  if (!isAllowed) {
    return res.status(403).json({
      code: -1,
      error: 'Forbidden'
    });
  }

  return next();
}
