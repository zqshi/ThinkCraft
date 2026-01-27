/**
 * 上下文管理器
 * 管理Agent的对话历史和上下文状态
 */
import { logger } from '../../../../middleware/logger.js';

export class ContextManager {
  constructor(maxContextLength = 10) {
    this.contexts = new Map(); // agentId -> context[]
    this.maxLength = maxContextLength;
  }

  /**
   * 添加消息到上下文
   * @param {string} agentId - Agent ID
   * @param {string} role - 角色 (user/assistant/system)
   * @param {string} content - 消息内容
   */
  addMessage(agentId, role, content) {
    if (!this.contexts.has(agentId)) {
      this.contexts.set(agentId, []);
    }

    const context = this.contexts.get(agentId);
    context.push({
      role,
      content,
      timestamp: Date.now()
    });

    // 保持上下文长度在限制内
    if (context.length > this.maxLength) {
      // 保留最近的消息
      this.contexts.set(agentId, context.slice(-this.maxLength));
      logger.debug(`[ContextManager] Agent ${agentId} 上下文已压缩到 ${this.maxLength} 条消息`);
    }
  }

  /**
   * 获取Agent的上下文
   * @param {string} agentId - Agent ID
   * @returns {Array} 上下文消息数组
   */
  getContext(agentId) {
    return this.contexts.get(agentId) || [];
  }

  /**
   * 清除Agent的上下文
   * @param {string} agentId - Agent ID
   */
  clearContext(agentId) {
    this.contexts.delete(agentId);
    logger.debug(`[ContextManager] Agent ${agentId} 上下文已清除`);
  }

  /**
   * 获取上下文长度
   * @param {string} agentId - Agent ID
   * @returns {number} 上下文消息数量
   */
  getContextLength(agentId) {
    const context = this.contexts.get(agentId);
    return context ? context.length : 0;
  }

  /**
   * 获取所有Agent的上下文统计
   * @returns {Object} 统计信息
   */
  getStats() {
    const stats = {
      totalAgents: this.contexts.size,
      agents: []
    };

    for (const [agentId, context] of this.contexts.entries()) {
      stats.agents.push({
        agentId,
        messageCount: context.length,
        oldestMessage: context[0]?.timestamp,
        latestMessage: context[context.length - 1]?.timestamp
      });
    }

    return stats;
  }

  /**
   * 清除所有上下文
   */
  clearAll() {
    const count = this.contexts.size;
    this.contexts.clear();
    logger.info(`[ContextManager] 已清除所有上下文 (${count} 个Agent)`);
  }

  /**
   * 压缩上下文（保留重要信息）
   * @param {string} agentId - Agent ID
   * @param {number} targetLength - 目标长度
   */
  compressContext(agentId, targetLength = 5) {
    const context = this.contexts.get(agentId);
    if (!context || context.length <= targetLength) {
      return;
    }

    // 简单策略：保留最新的消息
    const compressed = context.slice(-targetLength);
    this.contexts.set(agentId, compressed);

    logger.debug(`[ContextManager] Agent ${agentId} 上下文已压缩: ${context.length} -> ${compressed.length}`);
  }
}
