/**
 * 数据库配置
 * 管理MongoDB和Redis连接
 */
import mongoose from 'mongoose';
import { createClient } from 'redis';

/**
 * MongoDB配置
 */
export const mongoConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/thinkcraft',
  options: {
    // 连接池配置
    maxPoolSize: 10,
    minPoolSize: 2,
    // 超时配置
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    // 其他配置
    retryWrites: true,
    w: 'majority'
  }
};

/**
 * Redis配置
 */
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  // 连接配置
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Redis连接重试次数过多');
      }
      return Math.min(retries * 100, 3000);
    }
  }
};

/**
 * MongoDB连接管理器
 */
class MongoDBManager {
  constructor() {
    this.connection = null;
  }

  /**
   * 连接MongoDB
   */
  async connect() {
    try {
      if (this.connection) {
        console.log('[MongoDB] 已存在连接');
        return this.connection;
      }

      console.log('[MongoDB] 正在连接...', mongoConfig.uri);

      await mongoose.connect(mongoConfig.uri, mongoConfig.options);

      this.connection = mongoose.connection;

      // 监听连接事件
      this.connection.on('connected', () => {
        console.log('[MongoDB] 连接成功');
      });

      this.connection.on('error', (err) => {
        console.error('[MongoDB] 连接错误:', err);
      });

      this.connection.on('disconnected', () => {
        console.log('[MongoDB] 连接断开');
      });

      return this.connection;
    } catch (error) {
      console.error('[MongoDB] 连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开MongoDB连接
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        console.log('[MongoDB] 已断开连接');
      }
    } catch (error) {
      console.error('[MongoDB] 断开连接失败:', error);
      throw error;
    }
  }

  /**
   * 获取连接状态
   */
  isConnected() {
    return this.connection && mongoose.connection.readyState === 1;
  }
}

/**
 * Redis连接管理器
 */
class RedisManager {
  constructor() {
    this.client = null;
  }

  /**
   * 连接Redis
   */
  async connect() {
    try {
      if (this.client && this.client.isOpen) {
        console.log('[Redis] 已存在连接');
        return this.client;
      }

      console.log('[Redis] 正在连接...', `${redisConfig.host}:${redisConfig.port}`);

      this.client = createClient(redisConfig);

      // 监听连接事件
      this.client.on('connect', () => {
        console.log('[Redis] 正在连接...');
      });

      this.client.on('ready', () => {
        console.log('[Redis] 连接成功');
      });

      this.client.on('error', (err) => {
        console.error('[Redis] 连接错误:', err);
      });

      this.client.on('end', () => {
        console.log('[Redis] 连接断开');
      });

      await this.client.connect();

      return this.client;
    } catch (error) {
      console.error('[Redis] 连接失败:', error);
      throw error;
    }
  }

  /**
   * 断开Redis连接
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
        console.log('[Redis] 已断开连接');
      }
    } catch (error) {
      console.error('[Redis] 断开连接失败:', error);
      throw error;
    }
  }

  /**
   * 获取连接状态
   */
  isConnected() {
    return this.client && this.client.isOpen;
  }

  /**
   * 获取客户端
   */
  getClient() {
    if (!this.client || !this.client.isOpen) {
      throw new Error('Redis未连接');
    }
    return this.client;
  }
}

// 导出单例实例
export const mongoManager = new MongoDBManager();
export const redisManager = new RedisManager();

/**
 * 初始化所有数据库连接
 */
export async function initDatabases() {
  try {
    console.log('[Database] 正在初始化数据库连接...');

    // 检查是否使用内存存储
    const dbType = process.env.DB_TYPE || 'memory';

    if (dbType === 'mongodb') {
      // 连接MongoDB
      await mongoManager.connect();
    } else {
      console.log('[Database] 使用内存存储，跳过MongoDB连接');
    }

    // 连接Redis（可选）
    try {
      await redisManager.connect();
    } catch (error) {
      console.warn('[Database] Redis连接失败，将继续运行:', error.message);
    }

    console.log('[Database] 数据库连接初始化完成');
  } catch (error) {
    console.error('[Database] 数据库连接初始化失败:', error);
    throw error;
  }
}

/**
 * 关闭所有数据库连接
 */
export async function closeDatabases() {
  try {
    console.log('[Database] 正在关闭数据库连接...');

    await mongoManager.disconnect();
    await redisManager.disconnect();

    console.log('[Database] 数据库连接已关闭');
  } catch (error) {
    console.error('[Database] 关闭数据库连接失败:', error);
    throw error;
  }
}
