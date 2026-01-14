import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * Settings Model - 用户设置
 */
export class Settings extends BaseModel {}

Settings.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: '设置ID'
  },
  userId: {
    type: DataTypes.STRING(50),
    unique: true,
    allowNull: false,
    field: 'user_id',
    comment: '用户ID（唯一）'
  },
  theme: {
    type: DataTypes.STRING(20),
    defaultValue: 'light',
    validate: {
      isIn: [['light', 'dark', 'auto']]
    },
    comment: '主题：light/dark/auto'
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'zh-CN',
    comment: '语言设置'
  },
  notifications: {
    type: DataTypes.JSONB,
    defaultValue: {
      email: true,
      push: true,
      agentUpdates: true,
      collaborationUpdates: true
    },
    comment: '通知设置（JSONB格式）'
  },
  aiPreferences: {
    type: DataTypes.JSONB,
    field: 'ai_preferences',
    defaultValue: {
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 2000
    },
    comment: 'AI偏好设置（JSONB格式）'
  },
  privacy: {
    type: DataTypes.JSONB,
    defaultValue: {
      shareAnalytics: true,
      publicProfile: false
    },
    comment: '隐私设置（JSONB格式）'
  },
  customSettings: {
    type: DataTypes.JSONB,
    field: 'custom_settings',
    comment: '自定义设置（JSONB格式）'
  }
}, {
  sequelize,
  tableName: 'settings',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id'],
      unique: true,
      name: 'idx_user_id_unique'
    }
  ],
  comment: '用户设置表'
});
