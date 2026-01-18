/**
 * 前端环境配置
 * 根据 window.location 自动检测环境
 */

// 自动检测环境
function detectEnvironment() {
  const hostname = window.location.hostname;
  const port = window.location.port;

  // 生产环境判断
  if (hostname.includes('thinkcraft.ai') || hostname.includes('thinkcraft.com')) {
    return 'production';
  }

  // 测试环境判断
  if (hostname.includes('test') || hostname.includes('staging')) {
    return 'test';
  }

  // 默认开发环境
  return 'development';
}

const ENV = detectEnvironment();

/**
 * 环境配置
 */
const configs = {
  development: {
    API_BASE_URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:8080',
    ENABLE_DEBUG: true,
    ENABLE_MOCK: false,
    LOG_LEVEL: 'debug'
  },

  test: {
    API_BASE_URL: 'http://test.thinkcraft.ai:3000',
    FRONTEND_URL: 'http://test.thinkcraft.ai:8080',
    ENABLE_DEBUG: true,
    ENABLE_MOCK: false,
    LOG_LEVEL: 'info'
  },

  production: {
    API_BASE_URL: 'https://api.thinkcraft.ai',
    FRONTEND_URL: 'https://thinkcraft.ai',
    ENABLE_DEBUG: false,
    ENABLE_MOCK: false,
    LOG_LEVEL: 'error'
  }
};

/**
 * 导出当前环境配置
 */
export const ENV_CONFIG = {
  ENV,
  ...configs[ENV],
  IS_PRODUCTION: ENV === 'production',
  IS_DEVELOPMENT: ENV === 'development',
  IS_TEST: ENV === 'test'
};

// 开发环境下打印配置
if (ENV_CONFIG.ENABLE_DEBUG) {
  console.log('📝 前端环境配置:', ENV_CONFIG);
}

export default ENV_CONFIG;
