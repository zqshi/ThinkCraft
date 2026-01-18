import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * Report Model - 报告
 */
export class Report extends BaseModel {}

Report.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: '报告ID'
  },
  conversationId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'conversation_id',
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
    comment: '报告标题'
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['analysis', 'business_plan', 'demo', 'collaboration']]
    },
    comment: '报告类型：analysis/business_plan/demo/collaboration'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '报告内容（Markdown格式）'
  },
  metadata: {
    type: DataTypes.JSONB,
    comment: '元数据（JSONB格式）'
  },
  generatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'generated_at',
    comment: '生成时间'
  }
}, {
  sequelize,
  tableName: 'reports',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['conversation_id'],
      name: 'idx_report_conversation_id'
    },
    {
      fields: ['user_id', 'type', 'generated_at'],
      name: 'idx_report_user_type_generated'
    }
  ],
  comment: '报告表'
});
