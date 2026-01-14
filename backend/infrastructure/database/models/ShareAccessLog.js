import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * ShareAccessLog Model - 分享访问日志
 */
export class ShareAccessLog extends BaseModel {}

ShareAccessLog.init({
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    comment: '日志ID'
  },
  shareLinkId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'share_link_id',
    comment: '分享链接ID'
  },
  visitorIp: {
    type: DataTypes.STRING(50),
    field: 'visitor_ip',
    comment: '访问者IP'
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
    comment: '用户代理'
  },
  referer: {
    type: DataTypes.TEXT,
    comment: '来源页面'
  },
  accessedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'accessed_at',
    comment: '访问时间'
  }
}, {
  sequelize,
  tableName: 'share_access_logs',
  timestamps: false, // 访问日志不需要updatedAt
  indexes: [
    {
      fields: ['share_link_id', 'accessed_at'],
      name: 'idx_accesslog_sharelink_accessed'
    },
    {
      fields: ['accessed_at'],
      name: 'idx_accesslog_accessed_at'
    }
  ],
  comment: '分享访问日志表'
});
