import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * Demo Model - Demo生成
 */
export class Demo extends BaseModel {}

Demo.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: 'Demo ID'
  },
  conversationId: {
    type: DataTypes.STRING(50),
    field: 'conversation_id',
    comment: '关联对话ID'
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Demo标题'
  },
  description: {
    type: DataTypes.TEXT,
    comment: 'Demo描述'
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['web', 'mobile', 'desktop', 'prototype']]
    },
    comment: 'Demo类型：web/mobile/desktop/prototype'
  },
  htmlContent: {
    type: DataTypes.TEXT,
    field: 'html_content',
    comment: 'HTML内容'
  },
  cssContent: {
    type: DataTypes.TEXT,
    field: 'css_content',
    comment: 'CSS样式'
  },
  jsContent: {
    type: DataTypes.TEXT,
    field: 'js_content',
    comment: 'JavaScript代码'
  },
  assets: {
    type: DataTypes.JSONB,
    comment: '资源文件（图片、字体等，JSONB格式）'
  },
  config: {
    type: DataTypes.JSONB,
    comment: '配置信息（JSONB格式）'
  },
  previewUrl: {
    type: DataTypes.STRING(500),
    field: 'preview_url',
    comment: '预览URL'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'draft',
    validate: {
      isIn: [['draft', 'published', 'archived']]
    },
    comment: '状态：draft/published/archived'
  }
}, {
  sequelize,
  tableName: 'demos',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'status'],
      name: 'idx_demo_user_status'
    },
    {
      fields: ['conversation_id'],
      name: 'idx_demo_conversation_id'
    },
    {
      fields: ['type'],
      name: 'idx_demo_type'
    }
  ],
  comment: 'Demo生成表'
});
