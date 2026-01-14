/**
 * AgentPostgresRepository - Agent PostgreSQL数据持久化仓储
 *
 * 使用Sequelize ORM进行数据持久化
 * 实现与JSON Repository相同的接口，便于无缝切换
 */

import { Agent as AgentModel } from '../../../infrastructure/database/models/index.js';
import { domainLoggers } from '../../../infrastructure/logging/domainLogger.js';

const logger = domainLoggers.Agent;

export class AgentPostgresRepository {
  /**
   * 获取用户的所有Agent
   * @param {string} userId - 用户ID
   * @returns {Promise<Array<Object>>} Agent列表（JSON格式）
   */
  async getUserAgents(userId) {
    try {
      const agents = await AgentModel.findAll({
        where: {
          userId,
          firedAt: null // 只返回未被解雇的Agent
        },
        order: [['hiredAt', 'DESC']]
      });

      logger.debug('获取用户Agent', { userId, count: agents.length });
      return agents.map(agent => agent.toJSON());
    } catch (error) {
      logger.error('获取用户Agent失败', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有Agent（包括已解雇）
   * @param {string} userId - 用户ID
   * @returns {Promise<Array<Object>>} Agent列表（JSON格式）
   */
  async getAllUserAgents(userId) {
    try {
      const agents = await AgentModel.findAll({
        where: { userId },
        order: [['hiredAt', 'DESC']]
      });

      logger.debug('获取用户所有Agent（含已解雇）', { userId, count: agents.length });
      return agents.map(agent => agent.toJSON());
    } catch (error) {
      logger.error('获取用户所有Agent失败', error);
      throw error;
    }
  }

  /**
   * 根据ID获取Agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<Object|null>} Agent JSON或null
   */
  async getAgentById(agentId) {
    try {
      const agent = await AgentModel.findByPk(agentId);
      return agent ? agent.toJSON() : null;
    } catch (error) {
      logger.error('根据ID获取Agent失败', error);
      throw error;
    }
  }

  /**
   * 保存单个Agent（新增或更新）
   * @param {string} userId - 用户ID
   * @param {Object} agentData - Agent数据（toJSON()格式）
   * @returns {Promise<boolean>} 是否成功
   */
  async saveAgent(userId, agentData) {
    try {
      // 确保数据包含userId
      const data = {
        ...agentData,
        userId
      };

      // 查找是否已存在
      const existing = await AgentModel.findByPk(data.id);

      if (existing) {
        // 更新现有Agent
        await existing.update(data);
        logger.info('更新Agent', { agentId: data.id, userId });
      } else {
        // 创建新Agent
        await AgentModel.create(data);
        logger.info('创建Agent', { agentId: data.id, userId });
      }

      return true;
    } catch (error) {
      logger.error('保存Agent失败', error);
      return false;
    }
  }

  /**
   * 批量保存用户的Agent
   * @param {string} userId - 用户ID
   * @param {Array<Object>} agentsData - Agent数据列表
   * @returns {Promise<boolean>} 是否成功
   */
  async saveUserAgents(userId, agentsData) {
    try {
      // 使用事务确保原子性
      await AgentModel.sequelize.transaction(async (transaction) => {
        for (const agentData of agentsData) {
          const data = {
            ...agentData,
            userId
          };

          await AgentModel.upsert(data, { transaction });
        }
      });

      logger.info('批量保存Agent', { userId, count: agentsData.length });
      return true;
    } catch (error) {
      logger.error('批量保存Agent失败', error);
      return false;
    }
  }

  /**
   * 删除Agent（物理删除）
   * @param {string} userId - 用户ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteAgent(userId, agentId) {
    try {
      const deleted = await AgentModel.destroy({
        where: {
          id: agentId,
          userId
        }
      });

      if (deleted > 0) {
        logger.info('删除Agent', { agentId, userId });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('删除Agent失败', error);
      return false;
    }
  }

  /**
   * 解雇Agent（软删除，设置firedAt时间）
   * @param {string} userId - 用户ID
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} 是否成功
   */
  async fireAgent(userId, agentId) {
    try {
      const agent = await AgentModel.findOne({
        where: {
          id: agentId,
          userId
        }
      });

      if (!agent) {
        return false;
      }

      await agent.update({
        firedAt: new Date(),
        status: 'fired'
      });

      logger.info('解雇Agent', { agentId, userId });
      return true;
    } catch (error) {
      logger.error('解雇Agent失败', error);
      return false;
    }
  }

  /**
   * 清空用户的所有Agent（测试用）
   * @param {string} userId - 用户ID
   * @returns {Promise<void>}
   */
  async clearUserAgents(userId) {
    try {
      await AgentModel.destroy({
        where: { userId }
      });

      logger.warn('清空用户Agent', { userId });
    } catch (error) {
      logger.error('清空用户Agent失败', error);
      throw error;
    }
  }

  /**
   * 清空所有Agent数据（测试用）
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await AgentModel.destroy({
        where: {},
        truncate: true
      });

      logger.warn('清空所有Agent数据');
    } catch (error) {
      logger.error('清空所有Agent数据失败', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const totalAgents = await AgentModel.count();
      const activeAgents = await AgentModel.count({
        where: { firedAt: null }
      });

      // 获取唯一用户数
      const users = await AgentModel.findAll({
        attributes: ['userId'],
        group: ['userId']
      });

      logger.debug('获取Agent统计信息', {
        totalUsers: users.length,
        totalAgents,
        activeAgents
      });

      return {
        totalUsers: users.length,
        totalAgents,
        activeAgents,
        firedAgents: totalAgents - activeAgents
      };
    } catch (error) {
      logger.error('获取统计信息失败', error);
      throw error;
    }
  }

  /**
   * 按角色统计Agent数量
   * @param {string} userId - 用户ID（可选）
   * @returns {Promise<Object>} 角色统计
   */
  async getStatsByRole(userId = null) {
    try {
      const where = userId ? { userId, firedAt: null } : { firedAt: null };

      const agents = await AgentModel.findAll({ where });

      const roleStats = {};
      for (const agent of agents) {
        const role = agent.role;
        roleStats[role] = (roleStats[role] || 0) + 1;
      }

      return roleStats;
    } catch (error) {
      logger.error('按角色统计失败', error);
      throw error;
    }
  }

  /**
   * 按状态统计Agent数量
   * @param {string} userId - 用户ID（可选）
   * @returns {Promise<Object>} 状态统计
   */
  async getStatsByStatus(userId = null) {
    try {
      const where = userId ? { userId, firedAt: null } : { firedAt: null };

      const agents = await AgentModel.findAll({ where });

      const statusStats = {};
      for (const agent of agents) {
        const status = agent.status;
        statusStats[status] = (statusStats[status] || 0) + 1;
      }

      return statusStats;
    } catch (error) {
      logger.error('按状态统计失败', error);
      throw error;
    }
  }
}

// 创建单例实例
export const agentPostgresRepository = new AgentPostgresRepository();

export default AgentPostgresRepository;
