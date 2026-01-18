import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * BusinessPlan Model - 商业计划书
 */
export class BusinessPlan extends BaseModel {}

BusinessPlan.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: '商业计划书ID'
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
    comment: '计划书标题'
  },
  executiveSummary: {
    type: DataTypes.TEXT,
    field: 'executive_summary',
    comment: '执行摘要'
  },
  marketAnalysis: {
    type: DataTypes.JSONB,
    field: 'market_analysis',
    comment: '市场分析（JSONB格式）'
  },
  competitiveAnalysis: {
    type: DataTypes.JSONB,
    field: 'competitive_analysis',
    comment: '竞争分析（JSONB格式）'
  },
  businessModel: {
    type: DataTypes.JSONB,
    field: 'business_model',
    comment: '商业模式（JSONB格式）'
  },
  financialProjection: {
    type: DataTypes.JSONB,
    field: 'financial_projection',
    comment: '财务预测（JSONB格式）'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '完整内容（Markdown格式）'
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '版本号'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'draft',
    validate: {
      isIn: [['draft', 'final', 'archived']]
    },
    comment: '状态：draft/final/archived'
  }
}, {
  sequelize,
  tableName: 'business_plans',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'status'],
      name: 'idx_businessplan_user_status'
    },
    {
      fields: ['conversation_id'],
      name: 'idx_businessplan_conversation_id'
    }
  ],
  comment: '商业计划书表'
});
