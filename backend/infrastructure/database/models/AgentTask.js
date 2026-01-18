import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * AgentTask Model - 数字员工任务
 */
export class AgentTask extends BaseModel {}

AgentTask.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: '任务ID'
  },
  agentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'agent_id',
    comment: '数字员工ID'
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
    comment: '任务标题'
  },
  description: {
    type: DataTypes.TEXT,
    comment: '任务描述'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'in_progress', 'completed', 'failed']]
    },
    comment: '状态：pending/in_progress/completed/failed'
  },
  result: {
    type: DataTypes.JSONB,
    comment: '任务结果（JSONB格式）'
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
  tableName: 'agent_tasks',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['agent_id', 'status'],
      name: 'idx_agenttask_agent_status'
    },
    {
      fields: ['user_id', 'created_at'],
      name: 'idx_agenttask_user_created'
    }
  ],
  comment: '数字员工任务表'
});
