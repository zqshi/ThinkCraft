export const promptLoaderRetrievalMethods = {
  getAgentPrompt(agentType) {
    return this.agentPrompts.get(agentType) || null;
  },

  /**
   * 获取Task Prompt
   */

  getAvailableTaskTypes() {
    return Array.from(this.taskPrompts.keys());
  },

  /**
   * 加载提示词文件
   * @param {string} promptName - 提示词名称（不含 .md 后缀）
   * @returns {Promise<string>} 提示词内容
   */

  getTaskPrompt(taskType) {
    return this.taskPrompts.get(taskType) || null;
  },

  /**
   * 获取所有可用的Agent类型
   */

  getAvailableAgentTypes() {
    return Array.from(this.agentPrompts.keys());
  }

  /**
   * 获取所有可用的Task类型
   */
};
