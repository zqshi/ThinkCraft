/**
 * 测试数据库辅助工具
 * 提供测试数据创建、清理等功能
 */
import { sequelize } from '../../infrastructure/database/sequelize.js';
import bcrypt from 'bcrypt';

/**
 * 清空所有数据库表
 */
export async function clearDatabase() {
  const models = Object.values(sequelize.models);

  // 按依赖顺序删除
  const modelOrder = [
    'Message',
    'AgentTask',
    'Agent',
    'ShareAccessLog',
    'ShareLink',
    'Report',
    'BusinessPlan',
    'Demo',
    'CollaborationPlan',
    'Conversation',
    'Settings',
    'User'
  ];

  for (const modelName of modelOrder) {
    const model = models[modelName];
    if (model) {
      await model.destroy({ where: {}, truncate: true, force: true });
    }
  }
}

/**
 * 创建测试用户
 * @param {Object} overrides - 覆盖默认值
 * @returns {Promise<Object>} 创建的用户对象
 */
export async function createTestUser(overrides = {}) {
  const { User } = sequelize.models;

  const defaultPassword = 'Test123456!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const userData = {
    id: `user_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    passwordHash,
    displayName: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };

  const user = await User.create(userData);

  // 附加明文密码（仅用于测试）
  user.plainPassword = defaultPassword;

  return user;
}

/**
 * 创建测试Agent
 * @param {string} userId - 用户ID
 * @param {Object} overrides - 覆盖默认值
 * @returns {Promise<Object>} 创建的Agent对象
 */
export async function createTestAgent(userId, overrides = {}) {
  const { Agent } = sequelize.models;

  const agentData = {
    id: `agent_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    name: `Test Agent ${Date.now()}`,
    role: 'developer',
    skills: JSON.stringify(['JavaScript', 'Node.js', 'Testing']),
    personality: 'Efficient and reliable',
    status: 'active',
    hiredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };

  return await Agent.create(agentData);
}

/**
 * 创建测试对话
 * @param {string} userId - 用户ID
 * @param {Object} overrides - 覆盖默认值
 * @returns {Promise<Object>} 创建的Conversation对象
 */
export async function createTestConversation(userId, overrides = {}) {
  const { Conversation } = sequelize.models;

  const conversationData = {
    id: `conv_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    title: `Test Conversation ${Date.now()}`,
    context: JSON.stringify({ purpose: 'testing' }),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };

  return await Conversation.create(conversationData);
}

/**
 * 创建测试任务
 * @param {string} userId - 用户ID
 * @param {string} agentId - Agent ID
 * @param {Object} overrides - 覆盖默认值
 * @returns {Promise<Object>} 创建的AgentTask对象
 */
export async function createTestTask(userId, agentId, overrides = {}) {
  const { AgentTask } = sequelize.models;

  const taskData = {
    id: `task_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    agentId,
    title: `Test Task ${Date.now()}`,
    description: 'Test task description',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };

  return await AgentTask.create(taskData);
}

/**
 * 批量创建测试Agent
 * @param {string} userId - 用户ID
 * @param {number} count - 创建数量
 * @returns {Promise<Array>} Agent数组
 */
export async function createMultipleTestAgents(userId, count) {
  const agents = [];
  for (let i = 0; i < count; i++) {
    const agent = await createTestAgent(userId, {
      name: `Test Agent ${i + 1}`,
      role: i % 2 === 0 ? 'developer' : 'designer'
    });
    agents.push(agent);
  }
  return agents;
}

/**
 * 获取数据库统计信息（用于调试）
 * @returns {Promise<Object>} 统计信息
 */
export async function getDatabaseStats() {
  const stats = {};
  const models = Object.values(sequelize.models);

  for (const model of models) {
    const count = await model.count();
    stats[model.name] = count;
  }

  return stats;
}
