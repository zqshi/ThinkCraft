/**
 * 日志管理工具
 *
 * 提供统一的日志输出接口，支持开发/生产环境切换
 */

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// 配置
const LOG_CONFIG = {
  // 生产环境设置为 LOG_LEVELS.ERROR 或 LOG_LEVELS.NONE
  // 开发环境设置为 LOG_LEVELS.DEBUG
  currentLevel: LOG_LEVELS.DEBUG,

  // 是否启用时间戳
  enableTimestamp: true,

  // 是否启用颜色（仅在浏览器控制台有效）
  enableColors: true,

  // 模块过滤（空数组表示显示所有模块）
  moduleFilter: []
};

// 颜色配置
const COLORS = {
  DEBUG: '#6c757d',
  INFO: '#0dcaf0',
  WARN: '#ffc107',
  ERROR: '#dc3545'
};

/**
 * 日志管理器类
 */
class Logger {
  constructor(moduleName = 'App') {
    this.moduleName = moduleName;
  }

  /**
   * 检查是否应该输出日志
   */
  shouldLog(level) {
    // 检查日志级别
    if (level < LOG_CONFIG.currentLevel) {
      return false;
    }

    // 检查模块过滤
    if (LOG_CONFIG.moduleFilter.length > 0) {
      return LOG_CONFIG.moduleFilter.includes(this.moduleName);
    }

    return true;
  }

  /**
   * 格式化日志消息
   */
  formatMessage(level, message, data) {
    const parts = [];

    // 时间戳
    if (LOG_CONFIG.enableTimestamp) {
      const now = new Date();
      const timestamp = now.toTimeString().split(' ')[0];
      parts.push(`[${timestamp}]`);
    }

    // 日志级别
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
    parts.push(`[${levelName}]`);

    // 模块名
    parts.push(`[${this.moduleName}]`);

    // 消息
    parts.push(message);

    return parts.join(' ');
  }

  /**
   * 输出日志
   */
  log(level, message, ...data) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message);
    const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);

    if (LOG_CONFIG.enableColors && typeof console !== 'undefined') {
      const color = COLORS[levelName];
      console.log(`%c${formattedMessage}`, `color: ${color}`, ...data);
    } else {
      console.log(formattedMessage, ...data);
    }
  }

  /**
   * DEBUG级别日志
   */
  debug(message, ...data) {
    this.log(LOG_LEVELS.DEBUG, message, ...data);
  }

  /**
   * INFO级别日志
   */
  info(message, ...data) {
    this.log(LOG_LEVELS.INFO, message, ...data);
  }

  /**
   * WARN级别日志
   */
  warn(message, ...data) {
    this.log(LOG_LEVELS.WARN, message, ...data);
  }

  /**
   * ERROR级别日志
   */
  error(message, ...data) {
    this.log(LOG_LEVELS.ERROR, message, ...data);
  }
}

/**
 * 创建日志实例
 */
function createLogger(moduleName) {
  return new Logger(moduleName);
}

/**
 * 设置日志级别
 */
function setLogLevel(level) {
  if (typeof level === 'string') {
    LOG_CONFIG.currentLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  } else {
    LOG_CONFIG.currentLevel = level;
  }
}

/**
 * 设置模块过滤
 */
function setModuleFilter(modules) {
  LOG_CONFIG.moduleFilter = Array.isArray(modules) ? modules : [modules];
}

/**
 * 禁用所有日志
 */
function disableLogging() {
  LOG_CONFIG.currentLevel = LOG_LEVELS.NONE;
}

/**
 * 启用所有日志
 */
function enableLogging() {
  LOG_CONFIG.currentLevel = LOG_LEVELS.DEBUG;
}

// 导出
if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.createLogger = createLogger;
  window.setLogLevel = setLogLevel;
  window.setModuleFilter = setModuleFilter;
  window.disableLogging = disableLogging;
  window.enableLogging = enableLogging;
  window.LOG_LEVELS = LOG_LEVELS;
}

// 默认日志实例（已废弃，各模块使用自己的 logger）
// const logger = new Logger('App');

// 根据环境自动设置日志级别
if (typeof window !== 'undefined') {
  // 检查是否是生产环境
  const isProduction = window.location.hostname !== 'localhost' &&
                       window.location.hostname !== '127.0.0.1' &&
                       !window.location.hostname.includes('192.168');

  if (isProduction) {
    // 生产环境：只显示错误
    setLogLevel(LOG_LEVELS.ERROR);
    console.log('%c🚀 ThinkCraft 生产模式', 'color: #28a745; font-weight: bold');
  } else {
    // 开发环境：显示所有日志
    setLogLevel(LOG_LEVELS.DEBUG);
    console.log('%c🔧 ThinkCraft 开发模式', 'color: #ffc107; font-weight: bold');
  }
}

/**
 * 使用示例:
 *
 * // 创建模块日志实例
 * const logger = createLogger('ReportGenerator');
 *
 * // 使用日志
 * logger.debug('调试信息', { data: 'value' });
 * logger.info('普通信息');
 * logger.warn('警告信息');
 * logger.error('错误信息', error);
 *
 * // 设置日志级别（生产环境）
 * setLogLevel(LOG_LEVELS.ERROR);
 *
 * // 禁用所有日志
 * disableLogging();
 *
 * // 只显示特定模块的日志
 * setModuleFilter(['ReportGenerator', 'BusinessPlan']);
 */
