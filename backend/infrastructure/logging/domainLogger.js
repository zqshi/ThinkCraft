import logger from './logger.js';

/**
 * 创建领域日志记录器
 *
 * 为不同的业务领域创建带标签的logger实例
 *
 * @param {string} domain - 领域名称（如 'Agent', 'Conversation', 'Database'）
 * @returns {Object} 带有标签的logger实例
 *
 * @example
 * const agentLogger = createDomainLogger('Agent');
 * agentLogger.info('雇佣数字员工', { agentId: 'agent_123', userId: 'user_456' });
 * // 输出: 2026-01-14 15:30:00 info [Agent] 雇佣数字员工 { agentId: 'agent_123', userId: 'user_456' }
 */
export function createDomainLogger(domain) {
  return {
    /**
     * 记录错误日志
     * @param {string} message - 日志消息
     * @param {Object|Error} meta - 元数据或错误对象
     */
    error: (message, meta = {}) => {
      if (meta instanceof Error) {
        logger.error(message, { label: domain, error: meta.message, stack: meta.stack });
      } else {
        logger.error(message, { label: domain, ...meta });
      }
    },

    /**
     * 记录警告日志
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    warn: (message, meta = {}) => {
      logger.warn(message, { label: domain, ...meta });
    },

    /**
     * 记录信息日志
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    info: (message, meta = {}) => {
      logger.info(message, { label: domain, ...meta });
    },

    /**
     * 记录HTTP日志
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    http: (message, meta = {}) => {
      logger.http(message, { label: domain, ...meta });
    },

    /**
     * 记录调试日志
     * @param {string} message - 日志消息
     * @param {Object} meta - 元数据
     */
    debug: (message, meta = {}) => {
      logger.debug(message, { label: domain, ...meta });
    }
  };
}

/**
 * 预定义的领域Logger（可按需扩展）
 */
export const domainLoggers = {
  // 基础设施
  Database: createDomainLogger('Database'),
  Server: createDomainLogger('Server'),
  HTTP: createDomainLogger('HTTP'),
  Migration: createDomainLogger('Migration'),

  // 业务领域
  Agent: createDomainLogger('Agent'),
  Conversation: createDomainLogger('Conversation'),
  Collaboration: createDomainLogger('Collaboration'),
  Report: createDomainLogger('Report'),
  Share: createDomainLogger('Share'),
  BusinessPlan: createDomainLogger('BusinessPlan'),
  Demo: createDomainLogger('Demo'),
  PdfExport: createDomainLogger('PdfExport')
};

/**
 * 导出默认logger（用于不需要标签的场景）
 */
export { logger as default };
