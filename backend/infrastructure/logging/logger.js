import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 日志目录（项目根目录下的logs/）
const LOG_DIR = path.join(__dirname, '../../logs');

// 日志级别配置
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// 日志颜色配置
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(LOG_COLORS);

/**
 * 日志格式化配置
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * 控制台日志格式化（带颜色）
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, label, ...meta }) => {
    const labelStr = label ? `[${label}]` : '';
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level} ${labelStr} ${message}${metaStr}`;
  })
);

/**
 * 创建文件传输配置（按日期轮转）
 */
function createFileTransport(level) {
  return new DailyRotateFile({
    level,
    dirname: LOG_DIR,
    filename: `${level}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,       // 压缩旧日志
    maxSize: '20m',            // 单个文件最大20MB
    maxFiles: '14d',           // 保留14天
    format: logFormat
  });
}

/**
 * 创建Winston Logger实例
 */
export const logger = winston.createLogger({
  levels: LOG_LEVELS,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Error日志（单独文件）
    createFileTransport('error'),

    // 所有日志（combined文件）
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat
    })
  ],
  // 异常和拒绝的Promise单独记录
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: LOG_DIR,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

/**
 * 开发环境添加控制台输出
 */
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

/**
 * 生产环境不输出到控制台（可选）
 */
if (process.env.NODE_ENV === 'production') {
  // 生产环境可以选择添加控制台输出或其他传输（如Syslog、云日志服务等）
  // logger.add(new winston.transports.Console({
  //   format: consoleFormat,
  //   level: 'error' // 只输出错误
  // }));
}

/**
 * 导出默认logger
 */
export default logger;
