import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sequelize配置
 *
 * 从环境变量读取数据库配置，创建Sequelize实例
 */
export const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'thinkcraft',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  dialect: 'postgres',

  // 日志配置
  logging: process.env.NODE_ENV === 'development' ? console.log : false,

  // 连接池配置
  pool: {
    max: 10,        // 最大连接数
    min: 2,         // 最小连接数
    acquire: 30000, // 获取连接超时时间（毫秒）
    idle: 10000     // 连接空闲超时时间（毫秒）
  },

  // 时区配置
  timezone: '+08:00',

  // 定义配置
  define: {
    timestamps: true,         // 自动添加createdAt和updatedAt
    underscored: true,        // 使用下划线命名（snake_case）
    freezeTableName: true,    // 不自动复数化表名
    charset: 'utf8mb4',       // 字符集
    collate: 'utf8mb4_general_ci'
  }
});

/**
 * 测试数据库连接
 */
export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('[Database] PostgreSQL连接成功');
    console.log(`[Database] 数据库: ${process.env.DB_NAME || 'thinkcraft'}`);
    console.log(`[Database] 主机: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
    return true;
  } catch (error) {
    console.error('[Database] 连接失败:', error.message);
    return false;
  }
}

/**
 * 同步所有模型到数据库
 * 警告：只在开发环境使用，生产环境请使用迁移脚本
 */
export async function syncModels(options = {}) {
  try {
    const { force = false, alter = false } = options;

    if (process.env.NODE_ENV === 'production' && (force || alter)) {
      throw new Error('生产环境不允许使用force或alter选项');
    }

    await sequelize.sync({ force, alter });
    console.log('[Database] 模型同步成功');
    return true;
  } catch (error) {
    console.error('[Database] 模型同步失败:', error.message);
    return false;
  }
}

/**
 * 关闭数据库连接
 */
export async function closeConnection() {
  try {
    await sequelize.close();
    console.log('[Database] 连接已关闭');
  } catch (error) {
    console.error('[Database] 关闭连接失败:', error.message);
  }
}
