import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * Conversation Model - 对话
 */
export class Conversation extends BaseModel {}

Conversation.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: '对话ID'
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
    comment: '对话标题'
  },
  conversationStep: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'conversation_step',
    comment: '对话步骤'
  },
  isPinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_pinned',
    comment: '是否置顶'
  },
  analysisCompleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'analysis_completed',
    comment: '分析是否完成'
  },
  userData: {
    type: DataTypes.JSONB,
    field: 'user_data',
    comment: '用户数据（JSONB格式）'
  }
}, {
  sequelize,
  tableName: 'conversations',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'created_at'],
      name: 'idx_conversation_user_created'
    },
    {
      fields: ['user_id', 'is_pinned'],
      name: 'idx_conversation_user_pinned'
    }
  ],
  comment: '对话表'
});
