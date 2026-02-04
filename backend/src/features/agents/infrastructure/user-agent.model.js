/**
 * User Agent MongoDB模型
 * 持久化用户已雇佣的Agent
 */
import mongoose from 'mongoose';

const UserAgentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    name: { type: String, default: '' },
    nickname: { type: String, default: '' },
    emoji: { type: String, default: '' },
    desc: { type: String, default: '' },
    skills: { type: [String], default: [] },
    salary: { type: Number, default: 0 },
    level: { type: String, default: '' },
    hiredAt: { type: String, default: '' },
    status: { type: String, default: 'idle' },
    tasksCompleted: { type: Number, default: 0 },
    performance: { type: Number, default: 100 }
  },
  {
    timestamps: true,
    collection: 'user_agents'
  }
);

UserAgentSchema.index({ userId: 1, type: 1 });

export const UserAgentModel = mongoose.model('UserAgent', UserAgentSchema);
