/**
 * 状态验证器
 * 用于验证报告类型、章节ID等关键数据的有效性
 */

class StateValidator {
  /**
   * 验证报告类型
   * @param {string} type - 报告类型
   * @returns {boolean}
   */
  static validateReportType(type) {
    const validTypes = ['business', 'proposal'];
    if (!validTypes.includes(type)) {
      console.error(`[StateValidator] 无效的报告类型: ${type}`);
      return false;
    }
    return true;
  }

  /**
   * 验证章节ID是否与报告类型匹配
   * @param {string} type - 报告类型 ('business' | 'proposal')
   * @param {string[]} chapterIds - 章节ID数组
   * @param {Object} chapterConfig - 章节配置对象
   * @returns {boolean}
   */
  static validateChapterIds(type, chapterIds, chapterConfig) {
    if (!Array.isArray(chapterIds) || chapterIds.length === 0) {
      console.error('[StateValidator] 章节ID列表为空或无效');
      return false;
    }

    // 获取该类型的有效章节ID列表
    const config = chapterConfig[type];
    if (!config) {
      console.error(`[StateValidator] 找不到类型 ${type} 的配置`);
      return false;
    }

    const validIds = [...config.core, ...config.optional].map(ch => ch.id);

    // 检查是否有无效的章节ID
    const invalidIds = chapterIds.filter(id => !validIds.includes(id));

    if (invalidIds.length > 0) {
      console.error(`[StateValidator] 发现无效的章节ID (类型: ${type}):`, invalidIds);
      console.error(`[StateValidator] 有效的章节ID:`, validIds);
      return false;
    }

    return true;
  }

  /**
   * 获取默认章节ID列表
   * @param {string} type - 报告类型
   * @param {Object} chapterConfig - 章节配置对象
   * @returns {string[]}
   */
  static getDefaultChapterIds(type, chapterConfig) {
    const config = chapterConfig[type];
    if (!config) {
      console.error(`[StateValidator] 找不到类型 ${type} 的配置`);
      return [];
    }
    return config.core.map(ch => ch.id);
  }

  /**
   * 修复章节ID列表（移除无效ID，如果全部无效则返回默认列表）
   * @param {string} type - 报告类型
   * @param {string[]} chapterIds - 章节ID数组
   * @param {Object} chapterConfig - 章节配置对象
   * @returns {string[]}
   */
  static fixChapterIds(type, chapterIds, chapterConfig) {
    const config = chapterConfig[type];
    if (!config) {
      console.error(`[StateValidator] 找不到类型 ${type} 的配置`);
      return [];
    }

    const validIds = [...config.core, ...config.optional].map(ch => ch.id);
    const fixedIds = chapterIds.filter(id => validIds.includes(id));

    if (fixedIds.length === 0) {
      console.warn('[StateValidator] 所有章节ID都无效，使用默认章节列表');
      return config.core.map(ch => ch.id);
    }

    if (fixedIds.length < chapterIds.length) {
      const removedIds = chapterIds.filter(id => !validIds.includes(id));
      console.warn('[StateValidator] 移除了无效的章节ID:', removedIds);
    }

    return fixedIds;
  }

  /**
   * 验证项目对象
   * @param {Object} project - 项目对象
   * @returns {boolean}
   */
  static validateProject(project) {
    if (!project || typeof project !== 'object') {
      console.error('[StateValidator] 项目对象无效');
      return false;
    }

    if (!project.id) {
      console.error('[StateValidator] 项目缺少ID');
      return false;
    }

    if (!project.name) {
      console.warn('[StateValidator] 项目缺少名称');
    }

    return true;
  }

  /**
   * 验证Agent ID
   * @param {string} agentId - Agent ID
   * @returns {boolean}
   */
  static validateAgentId(agentId) {
    if (!agentId || typeof agentId !== 'string') {
      console.error('[StateValidator] Agent ID无效:', agentId);
      return false;
    }
    return true;
  }

  /**
   * 验证工作流阶段
   * @param {Object} stage - 阶段对象
   * @returns {boolean}
   */
  static validateStage(stage) {
    if (!stage || typeof stage !== 'object') {
      console.error('[StateValidator] 阶段对象无效');
      return false;
    }

    if (!stage.id) {
      console.error('[StateValidator] 阶段缺少ID');
      return false;
    }

    const validStatuses = ['pending', 'active', 'completed'];
    if (stage.status && !validStatuses.includes(stage.status)) {
      console.error('[StateValidator] 阶段状态无效:', stage.status);
      return false;
    }

    return true;
  }
}

// 导出为全局对象
if (typeof window !== 'undefined') {
  window.StateValidator = StateValidator;
}

// 支持模块导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateValidator;
}
