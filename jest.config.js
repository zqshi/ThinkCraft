/**
 * Jest配置文件
 * 用于前端JavaScript模块的单元测试
 */

export default {
  // 测试环境
  testEnvironment: 'jsdom',

  // 模块文件扩展名
  moduleFileExtensions: ['js', 'json'],

  // 测试文件匹配模式
  testMatch: [
    '**/frontend/js/**/*.test.js',
    '**/frontend/js/**/__tests__/**/*.js',
    '**/tests/**/*.test.js'
  ],

  // 覆盖率收集配置
  collectCoverageFrom: [
    'frontend/js/utils/**/*.js',
    'frontend/js/modules/**/*.js',
    '!frontend/js/**/*.test.js',
    '!frontend/js/**/__tests__/**'
  ],

  // 覆盖率阈值
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 50,
      functions: 60,
      lines: 60
    }
  },

  // 转换配置（跳过node_modules）
  transformIgnorePatterns: ['node_modules/(?!(@testing-library)/)'],

  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // 模块名称映射（用于处理别名）
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/js/$1'
  },

  // 详细输出
  verbose: true,

  // 清除模拟
  clearMocks: true,

  // 重置模拟
  resetMocks: true,

  // 恢复模拟
  restoreMocks: true
};
