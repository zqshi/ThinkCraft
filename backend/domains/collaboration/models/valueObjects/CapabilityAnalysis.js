/**
 * CapabilityAnalysis 值对象
 * 能力分析结果，不可变对象
 *
 * DDD值对象特点：
 * - 不可变（immutable）
 * - 无唯一标识
 * - 通过值相等判断
 */

/**
 * CapabilityAnalysis 值对象类
 */
export class CapabilityAnalysis {
  constructor({
    requiredSkills,        // AI识别的所需技能 ['需求分析', 'UI设计', 'React开发']
    requiredRoles,         // AI识别的所需角色 [{ typeId: 'product-manager', reason: '...', priority: 'high' }]
    currentAgents,         // 用户当前雇佣的Agent

    skillGaps,             // 技能缺口 [{ skill: 'React开发', severity: 'high', suggestion: '雇佣前端工程师' }]
    roleGaps,              // 角色缺口 [{ typeId: 'designer', role: '设计师', reason: '...', cost: 12000 }]

    isSufficient,          // 能力是否满足（boolean）
    confidenceScore,       // AI判断的置信度（0-100）

    hiringAdvice = null,   // 雇佣建议（能力不足时提供）
    warnings = []          // 警告信息（如：某Agent技能不匹配但勉强可用）
  }) {
    this.requiredSkills = requiredSkills;
    this.requiredRoles = requiredRoles;
    this.currentAgents = currentAgents;
    this.skillGaps = skillGaps;
    this.roleGaps = roleGaps;
    this.isSufficient = isSufficient;
    this.confidenceScore = confidenceScore;
    this.hiringAdvice = hiringAdvice;
    this.warnings = warnings;
  }

  /**
   * 从AI响应创建
   * @param {Object} aiResponse - AI返回的JSON数据
   * @param {Array} currentAgents - 用户当前Agent列表
   * @returns {CapabilityAnalysis}
   */
  static fromAIResponse(aiResponse, currentAgents) {
    return new CapabilityAnalysis({
      ...aiResponse,
      currentAgents
    });
  }

  /**
   * 获取总雇佣成本
   * @returns {number}
   */
  getTotalHiringCost() {
    if (!this.roleGaps || this.roleGaps.length === 0) {
      return 0;
    }
    return this.roleGaps.reduce((sum, gap) => sum + (gap.cost || 0), 0);
  }

  /**
   * 获取高优先级角色缺口
   * @returns {Array}
   */
  getHighPriorityRoleGaps() {
    if (!this.roleGaps) return [];
    return this.roleGaps.filter(gap => gap.priority === 'high' || gap.severity === 'high');
  }

  /**
   * 获取关键技能缺口
   * @returns {Array}
   */
  getCriticalSkillGaps() {
    if (!this.skillGaps) return [];
    return this.skillGaps.filter(gap => gap.severity === 'high');
  }

  /**
   * 检查是否有严重警告
   * @returns {boolean}
   */
  hasCriticalWarnings() {
    return this.warnings.some(w => w.severity === 'high');
  }

  /**
   * 转换为JSON对象
   * @returns {Object}
   */
  toJSON() {
    return {
      requiredSkills: this.requiredSkills,
      requiredRoles: this.requiredRoles,
      currentAgents: this.currentAgents,
      skillGaps: this.skillGaps,
      roleGaps: this.roleGaps,
      isSufficient: this.isSufficient,
      confidenceScore: this.confidenceScore,
      hiringAdvice: this.hiringAdvice,
      warnings: this.warnings,
      totalHiringCost: this.getTotalHiringCost(),
      highPriorityRoleGaps: this.getHighPriorityRoleGaps(),
      criticalSkillGaps: this.getCriticalSkillGaps()
    };
  }

  /**
   * 验证数据有效性
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!Array.isArray(this.requiredSkills)) {
      errors.push('requiredSkills必须是数组');
    }

    if (!Array.isArray(this.requiredRoles)) {
      errors.push('requiredRoles必须是数组');
    }

    if (typeof this.isSufficient !== 'boolean') {
      errors.push('isSufficient必须是布尔值');
    }

    if (typeof this.confidenceScore !== 'number' || this.confidenceScore < 0 || this.confidenceScore > 100) {
      errors.push('confidenceScore必须是0-100之间的数字');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export default CapabilityAnalysis;
