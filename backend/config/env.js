/**
 * 环境变量校验
 */

const REQUIRED_IN_PROD = [
  'ACCESS_TOKEN_SECRET',
  'REFRESH_TOKEN_SECRET',
  'DEEPSEEK_API_KEY',
  'MONGODB_URI',
  'REDIS_HOST',
  'REDIS_PORT',
  'SMS_PROVIDER'
];

const DEFAULT_SECRETS = new Set([
  'thinkcraft-access-secret',
  'thinkcraft-refresh-secret',
  'your-secret-key-change-in-production'
]);

export function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    return;
  }

  const missing = REQUIRED_IN_PROD.filter((key) => !process.env[key]);
  const errors = [];

  if (missing.length > 0) {
    errors.push(`缺少环境变量: ${missing.join(', ')}`);
  }

  if (process.env.DB_TYPE && process.env.DB_TYPE !== 'mongodb') {
    errors.push('生产环境必须使用 mongodb 存储');
  }
  if (!process.env.DB_TYPE) {
    errors.push('生产环境必须设置 DB_TYPE=mongodb');
  }

  for (const key of ['ACCESS_TOKEN_SECRET', 'REFRESH_TOKEN_SECRET', 'JWT_SECRET']) {
    if (process.env[key] && DEFAULT_SECRETS.has(process.env[key])) {
      errors.push(`${key} 使用了默认值，请替换为安全密钥`);
    }
  }

  const smsProvider = process.env.SMS_PROVIDER;
  if (!smsProvider) {
    errors.push('生产环境必须设置 SMS_PROVIDER');
  } else if (!['aliyun', 'tencent'].includes(smsProvider)) {
    errors.push('SMS_PROVIDER 仅支持 aliyun 或 tencent');
  } else {
    const smsRequired = smsProvider === 'aliyun'
      ? ['ALIYUN_ACCESS_KEY_ID', 'ALIYUN_ACCESS_KEY_SECRET', 'ALIYUN_SMS_SIGN_NAME']
      : ['TENCENT_SECRET_ID', 'TENCENT_SECRET_KEY', 'TENCENT_SMS_APP_ID', 'TENCENT_SMS_SIGN'];
    const smsMissing = smsRequired.filter((key) => !process.env[key]);
    if (smsMissing.length > 0) {
      errors.push(`SMS_PROVIDER=${smsProvider} 缺少配置: ${smsMissing.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`环境变量校验失败: ${errors.join('；')}`);
  }
}
