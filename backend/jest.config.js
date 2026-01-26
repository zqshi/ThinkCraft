export default {
  // 测试环境
  testEnvironment: 'node',

  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // 覆盖率收集
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/__tests__/**',
    '!src/**/*.test.js',
    '!src/**/*.spec.js'
  ],

  // 覆盖率阈值（修正拼写）
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },

  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov', 'html'],

  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // 转换配置（支持ES模块）
  transform: {},

  // 测试超时
  testTimeout: 10000,

  // 详细输出
  verbose: true
};
