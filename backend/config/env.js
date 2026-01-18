/**
 * 环境配置加载器
 * 支持多环境：development, production, test
 *
 * 使用方法：
 * import { config } from './config/env.js';
 * console.log(config.DEEPSEEK_API_KEY);
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确定当前环境
const NODE_ENV = process.env.NODE_ENV || 'development';

// 按优先级加载环境文件：
// 1. .env.local (最高优先级，本地开发专用，不提交到Git)
// 2. .env.{NODE_ENV} (环境特定配置)
// 3. .env (默认配置)
const envFiles = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, `../.env.${NODE_ENV}`),
  path.resolve(__dirname, '../.env')
];

// 加载所有存在的环境文件
envFiles.forEach((envFile) => {
  dotenv.config({ path: envFile });
});

/**
 * 验证必需的环境变量
 */
function validateEnv() {
  const required = [
    'DEEPSEEK_API_KEY',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ 缺少必需的环境变量:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n请检查以下文件是否正确配置：');
    console.error('   - backend/.env.local (推荐)');
    console.error('   - backend/.env');
    console.error('\n参考模板: backend/.env.example');
    throw new Error('环境配置不完整');
  }
}

// 在非测试环境下验证配置
if (NODE_ENV !== 'test') {
  validateEnv();
}

/**
 * 导出配置对象
 */
export const config = {
  // 环境信息
  NODE_ENV,
  IS_PRODUCTION: NODE_ENV === 'production',
  IS_DEVELOPMENT: NODE_ENV === 'development',
  IS_TEST: NODE_ENV === 'test',

  // 服务器配置
  PORT: parseInt(process.env.PORT || '3000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:8080',

  // DeepSeek API
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1',

  // 数据库配置
  DB_HOST: process.env.DB_HOST,
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD || '',

  // 认证
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // 日志
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

// 在开发环境下打印配置（隐藏敏感信息）
if (NODE_ENV === 'development') {
  console.log('📝 环境配置已加载:');
  console.log(`   NODE_ENV: ${config.NODE_ENV}`);
  console.log(`   PORT: ${config.PORT}`);
  console.log(`   FRONTEND_URL: ${config.FRONTEND_URL}`);
  console.log(`   DB_HOST: ${config.DB_HOST}:${config.DB_PORT}`);
  console.log(`   DB_NAME: ${config.DB_NAME}`);
  console.log(`   DEEPSEEK_API_KEY: ${config.DEEPSEEK_API_KEY ? '***已配置***' : '❌未配置'}`);
  console.log(`   JWT_SECRET: ${config.JWT_SECRET ? '***已配置***' : '❌未配置'}`);
}

export default config;
