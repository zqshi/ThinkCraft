/**
 * Models统一导出
 *
 * 定义所有Sequelize Model及其关联关系
 */

import { User } from './User.js';
import { Conversation } from './Conversation.js';
import { Message } from './Message.js';
import { Agent } from './Agent.js';
import { AgentTask } from './AgentTask.js';
import { CollaborationPlan } from './CollaborationPlan.js';
import { Report } from './Report.js';
import { ShareLink } from './ShareLink.js';
import { ShareAccessLog } from './ShareAccessLog.js';
import { BusinessPlan } from './BusinessPlan.js';
import { Demo } from './Demo.js';
import { Settings } from './Settings.js';

/**
 * 定义Model之间的关联关系
 */

// User关联
User.hasMany(Conversation, { foreignKey: 'userId', as: 'conversations' });
User.hasMany(Agent, { foreignKey: 'userId', as: 'agents' });
User.hasMany(AgentTask, { foreignKey: 'userId', as: 'tasks' });
User.hasMany(CollaborationPlan, { foreignKey: 'userId', as: 'collaborationPlans' });
User.hasMany(Report, { foreignKey: 'userId', as: 'reports' });
User.hasMany(ShareLink, { foreignKey: 'userId', as: 'shareLinks' });
User.hasMany(BusinessPlan, { foreignKey: 'userId', as: 'businessPlans' });
User.hasMany(Demo, { foreignKey: 'userId', as: 'demos' });
User.hasOne(Settings, { foreignKey: 'userId', as: 'settings' });

// Conversation关联
Conversation.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages', onDelete: 'CASCADE' });
Conversation.hasMany(Report, { foreignKey: 'conversationId', as: 'reports' });
Conversation.hasMany(BusinessPlan, { foreignKey: 'conversationId', as: 'businessPlans' });
Conversation.hasMany(Demo, { foreignKey: 'conversationId', as: 'demos' });

// Message关联
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

// Agent关联
Agent.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Agent.hasMany(AgentTask, { foreignKey: 'agentId', as: 'tasks' });

// AgentTask关联
AgentTask.belongsTo(Agent, { foreignKey: 'agentId', as: 'agent' });
AgentTask.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// CollaborationPlan关联
CollaborationPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Report关联
Report.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Report.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

// ShareLink关联
ShareLink.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ShareLink.hasMany(ShareAccessLog, { foreignKey: 'shareLinkId', as: 'accessLogs' });

// ShareAccessLog关联
ShareAccessLog.belongsTo(ShareLink, { foreignKey: 'shareLinkId', as: 'shareLink' });

// BusinessPlan关联
BusinessPlan.belongsTo(User, { foreignKey: 'userId', as: 'user' });
BusinessPlan.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

// Demo关联
Demo.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Demo.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

// Settings关联
Settings.belongsTo(User, { foreignKey: 'userId', as: 'user' });

/**
 * 导出所有Model
 */
export {
  User,
  Conversation,
  Message,
  Agent,
  AgentTask,
  CollaborationPlan,
  Report,
  ShareLink,
  ShareAccessLog,
  BusinessPlan,
  Demo,
  Settings
};

/**
 * 导出Model列表（用于批量同步）
 */
export const models = {
  User,
  Conversation,
  Message,
  Agent,
  AgentTask,
  CollaborationPlan,
  Report,
  ShareLink,
  ShareAccessLog,
  BusinessPlan,
  Demo,
  Settings
};
