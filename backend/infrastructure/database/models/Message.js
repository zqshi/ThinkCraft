import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * Message Model - 消息
 */
export class Message extends BaseModel {}

Message.init({
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    comment: '消息ID'
  },
  conversationId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'conversation_id',
    comment: '对话ID'
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['user', 'assistant', 'system']]
    },
    comment: '角色：user/assistant/system'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '消息内容'
  }
}, {
  sequelize,
  tableName: 'messages',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: false, // messages只需要created_at
  indexes: [
    {
      fields: ['conversation_id', 'created_at'],
      name: 'idx_message_conversation_created'
    }
  ],
  comment: '消息表'
});
