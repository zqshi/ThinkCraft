import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * CollaborationPlan Model - 协同计划
 */
export class CollaborationPlan extends BaseModel {}

CollaborationPlan.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: '协同计划ID'
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
    comment: '计划标题'
  },
  goal: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '协同目标'
  },
  agents: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: '参与的数字员工列表（JSONB格式）'
  },
  workflow: {
    type: DataTypes.JSONB,
    comment: '工作流配置（JSONB格式）'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'draft',
    validate: {
      isIn: [['draft', 'active', 'paused', 'completed', 'cancelled']]
    },
    comment: '状态：draft/active/paused/completed/cancelled'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    },
    comment: '进度百分比（0-100）'
  },
  startedAt: {
    type: DataTypes.DATE,
    field: 'started_at',
    comment: '开始时间'
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at',
    comment: '完成时间'
  }
}, {
  sequelize,
  tableName: 'collaboration_plans',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'status'],
      name: 'idx_collaboration_user_status'
    },
    {
      fields: ['created_at'],
      name: 'idx_collaboration_created_at'
    }
  ],
  comment: '协同计划表'
});
