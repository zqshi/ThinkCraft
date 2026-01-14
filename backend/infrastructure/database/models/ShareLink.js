import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * ShareLink Model - 分享链接
 */
export class ShareLink extends BaseModel {}

ShareLink.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: '分享链接ID'
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  resourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'resource_type',
    validate: {
      isIn: [['conversation', 'report', 'business_plan', 'demo']]
    },
    comment: '资源类型：conversation/report/business_plan/demo'
  },
  resourceId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'resource_id',
    comment: '资源ID'
  },
  shareCode: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false,
    field: 'share_code',
    comment: '分享码（唯一）'
  },
  accessType: {
    type: DataTypes.STRING(20),
    defaultValue: 'public',
    field: 'access_type',
    validate: {
      isIn: [['public', 'password', 'restricted']]
    },
    comment: '访问类型：public/password/restricted'
  },
  password: {
    type: DataTypes.STRING(255),
    comment: '访问密码（加密存储）'
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at',
    comment: '过期时间'
  },
  viewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'view_count',
    comment: '访问次数'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: '是否激活'
  }
}, {
  sequelize,
  tableName: 'share_links',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['share_code'],
      unique: true,
      name: 'idx_sharelink_code_unique'
    },
    {
      fields: ['user_id', 'resource_type'],
      name: 'idx_sharelink_user_resource'
    },
    {
      fields: ['expires_at', 'is_active'],
      name: 'idx_sharelink_expires_active'
    }
  ],
  comment: '分享链接表'
});
