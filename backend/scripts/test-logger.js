#!/usr/bin/env node

/**
 * 测试Winston日志系统
 *
 * 测试各种日志级别和领域logger的功能
 */

import { domainLoggers, createDomainLogger } from '../infrastructure/logging/domainLogger.js';
import logger from '../infrastructure/logging/logger.js';

console.log('====================================');
console.log('  Winston日志系统测试');
console.log('====================================\n');

// 测试1: 默认logger
console.log('[测试1] 默认logger各级别日志');
logger.error('这是一个错误日志');
logger.warn('这是一个警告日志');
logger.info('这是一个信息日志');
logger.http('这是一个HTTP日志');
logger.debug('这是一个调试日志');
console.log('');

// 测试2: 领域logger
console.log('[测试2] 领域logger（带标签）');
domainLoggers.Database.info('数据库连接成功', { host: 'localhost', port: 5432 });
domainLoggers.Server.info('服务器启动', { port: 3000 });
domainLoggers.Agent.info('雇佣数字员工', { agentId: 'agent_123', role: 'Product Manager' });
console.log('');

// 测试3: 自定义领域logger
console.log('[测试3] 创建自定义领域logger');
const customLogger = createDomainLogger('CustomDomain');
customLogger.info('自定义领域日志测试', { key: 'value' });
console.log('');

// 测试4: 错误对象处理
console.log('[测试4] 错误对象处理');
try {
  throw new Error('这是一个测试错误');
} catch (error) {
  domainLoggers.Server.error('捕获到错误', error);
}
console.log('');

// 测试5: 复杂元数据
console.log('[测试5] 复杂元数据');
domainLoggers.HTTP.http('HTTP请求', {
  method: 'POST',
  url: '/api/chat',
  statusCode: 200,
  duration: '125ms',
  body: {
    message: 'Hello',
    model: 'deepseek-chat'
  }
});
console.log('');

console.log('====================================');
console.log('  测试完成');
console.log('====================================');
console.log('');
console.log('日志文件位置: backend/logs/');
console.log('  - error-YYYY-MM-DD.log (错误日志)');
console.log('  - combined-YYYY-MM-DD.log (所有日志)');
console.log('  - exceptions-YYYY-MM-DD.log (异常日志)');
console.log('  - rejections-YYYY-MM-DD.log (Promise拒绝日志)');
console.log('');

// 等待日志写入完成
setTimeout(() => {
  process.exit(0);
}, 500);
