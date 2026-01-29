#!/usr/bin/env node
/**
 * 短信网关配置检查脚本
 * 用于投产前验证 SMS_PROVIDER 和关键环境变量
 */
import dotenv from 'dotenv';

dotenv.config();

const provider = process.env.SMS_PROVIDER;
const nodeEnv = process.env.NODE_ENV || 'development';

const REQUIRED_BY_PROVIDER = {
  aliyun: ['ALIYUN_ACCESS_KEY_ID', 'ALIYUN_ACCESS_KEY_SECRET', 'ALIYUN_SMS_SIGN_NAME'],
  tencent: ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_SMS_APP_ID', 'TENCENT_SMS_SIGN']
};

function checkRequired(keys) {
  const missing = keys.filter(key => !process.env[key] || String(process.env[key]).trim() === '');
  return missing;
}

if (!provider || !['aliyun', 'tencent'].includes(provider)) {
  const hint = nodeEnv === 'production' ? '生产环境必须设置 SMS_PROVIDER' : '请设置 SMS_PROVIDER';
  console.error(`[SMS CHECK] ${hint} (aliyun/tencent)`);
  process.exit(1);
}

const requiredKeys = REQUIRED_BY_PROVIDER[provider] || [];
const missing = checkRequired(requiredKeys);

if (missing.length > 0) {
  console.error('[SMS CHECK] 缺少必要环境变量:');
  missing.forEach(key => console.error(`- ${key}`));
  process.exit(1);
}

console.log(`[SMS CHECK] ${provider} 配置完整`);
