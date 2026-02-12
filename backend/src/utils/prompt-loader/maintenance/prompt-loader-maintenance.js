export const promptLoaderMaintenanceMethods = {
  clearCache() {
    this.cache.clear();
  },

  /**
   * 重新加载所有提示词（清除缓存并重新加载）
   */

  async getWorkflowAgents(workflowId) {
    const config = await this.loadWorkflowConfig(workflowId);
    if (!config) {
      return [];
    }

    const agents = [];
    for (const phase of config.phases) {
      for (const agent of phase.agents) {
        agents.push({
          agentId: agent.agent_id,
          role: agent.role,
          tasks: agent.tasks,
          phase: phase.phase_id
        });
      }
    }
    return agents;
  },

  /**
   * 加载商业计划书章节配置
   * @returns {Promise<Object>} 章节配置对象
   */

  async reload() {
    this.clearCache();
    this.agentPrompts.clear();
    this.taskPrompts.clear();
    this.initialized = false;
    await this.initialize();
    console.log('Prompt cache cleared and reloaded');
  }

  /**
   * 加载workflow配置
   * @param {string} workflowId - workflow ID (product-development)
   * @returns {Promise<Object>} workflow配置对象
   */
};
