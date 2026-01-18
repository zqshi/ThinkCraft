import { DataTypes } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { BaseModel } from '../BaseModel.js';

/**
 * Agent Model - 数字员工
 */
export class Agent extends BaseModel {}

Agent.init({
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    comment: '数字员工ID'
  },
  userId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '员工名称'
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '职位角色'
  },
  skills: {
    type: DataTypes.JSONB,
    comment: '技能列表（JSONB格式）'
  },
  personality: {
    type: DataTypes.TEXT,
    comment: '性格描述'
  },
  hiredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'hired_at',
    comment: '雇佣时间'
  },
  firedAt: {
    type: DataTypes.DATE,
    field: 'fired_at',
    comment: '解雇时间'
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active',
    validate: {
      isIn: [['active', 'busy', 'idle', 'fired']]
    },
    comment: '状态：active/busy/idle/fired'
  }
}, {
  sequelize,
  tableName: 'agents',
  timestamps: true,
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id', 'status'],
      name: 'idx_agent_user_status'
    },
    {
      fields: ['hired_at'],
      name: 'idx_agent_hired_at'
    }
  ],
  comment: '数字员工表'
});
