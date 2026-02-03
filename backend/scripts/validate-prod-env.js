import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '../.env');

if (!fs.existsSync(envPath)) {
  console.error(`[validate-prod-env] Env file not found: ${envPath}`);
  process.exit(1);
}

dotenv.config({ path: envPath });

const required = [
  'NODE_ENV',
  'FRONTEND_URL',
  'DB_TYPE',
  'MONGODB_URI',
  'DEEPSEEK_API_KEY',
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET'
];

const missing = required.filter(key => !process.env[key]);

const warnings = [];

if (process.env.NODE_ENV !== 'production') {
  warnings.push('NODE_ENV should be set to production.');
}

if (process.env.DB_TYPE !== 'mongodb') {
  warnings.push('DB_TYPE should be mongodb in production.');
}

if (process.env.SMS_PROVIDER === 'mock' || !process.env.SMS_PROVIDER) {
  warnings.push('SMS_PROVIDER is mock/empty; production should use a real provider.');
}

if (!process.env.REDIS_HOST) {
  warnings.push('REDIS_HOST is empty; caching/session features may be degraded.');
}

if (!process.env.REDIS_PORT) {
  warnings.push('REDIS_PORT is empty; caching/session features may be degraded.');
}

if (process.env.SMS_PROVIDER === 'aliyun') {
  ['ALIYUN_ACCESS_KEY_ID', 'ALIYUN_ACCESS_KEY_SECRET', 'ALIYUN_SMS_SIGN_NAME'].forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });
}

if (process.env.SMS_PROVIDER === 'tencent') {
  ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_SMS_APP_ID', 'TENCENT_SMS_SIGN'].forEach(key => {
    if (!process.env[key]) {
      missing.push(key);
    }
  });
}

const uniqueMissing = [...new Set(missing)];

if (uniqueMissing.length) {
  console.error('[validate-prod-env] Missing required env keys:');
  uniqueMissing.forEach(key => console.error(`- ${key}`));
}

if (warnings.length) {
  console.warn('[validate-prod-env] Warnings:');
  warnings.forEach(msg => console.warn(`- ${msg}`));
}

if (!uniqueMissing.length) {
  console.log('[validate-prod-env] OK: required env keys present.');
}

process.exit(uniqueMissing.length ? 1 : 0);
