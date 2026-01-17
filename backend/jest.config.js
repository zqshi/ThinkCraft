/**
 * Jest配置文件
 * ThinkCraft测试基础设施
 */
export default {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: ['**/tests/**/*.test.js'],

  // 覆盖率收集配置
  collectCoverageFrom: [
    'domains/**/*.js',
    'application/**/*.js',
    'routes/**/*.js',
    'infrastructure/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!**/infrastructure/database/migrations/**',
    '!**/infrastructure/database/models/index.js'
  ],

  // 覆盖率阈值（Phase 1目标：30%）
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30
    }
  },

  // 测试环境初始化
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // ES Modules支持
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },

  // 忽略node_modules但保留ES模块
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|strip-ansi|ansi-regex)/)'
  ],

  // 测试超时时间（AI调用可能较慢）
  testTimeout: 10000,

  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov', 'html'],

  // 详细输出
  verbose: true
};
