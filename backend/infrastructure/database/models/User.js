import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * User Model - 用户
 */
export class User extends BaseModel {}

User.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: '用户ID'
  },
  username: {
    type: DataTypes.STRING(100),
    unique: true,
    comment: '用户名'
  },
  email: {
    type: DataTypes.STRING(255),
    unique: true,
    validate: {
      isEmail: true
    },
    comment: '邮箱'
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    field: 'password_hash',
    comment: '密码哈希'
  },
  displayName: {
    type: DataTypes.STRING(100),
    field: 'display_name',
    comment: '显示名称'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    field: 'last_login_at',
    comment: '最后登录时间'
  }
}, {
  sequelize,
  tableName: 'users',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: '用户表'
});
