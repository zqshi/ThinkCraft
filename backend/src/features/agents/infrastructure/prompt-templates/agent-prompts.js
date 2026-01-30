/**
 * Agent Prompt模板
 * 从Markdown文件动态加载Agent的System Prompt
 */
import promptLoader from '../../../../utils/prompt-loader.js';

export class AgentPromptTemplates {
  /**
   * 获取Agent的System Prompt
   * @param {string} agentType - Agent类型
   * @param {Array<string>} capabilities - Agent能力列表
   * @returns {string} System Prompt
   */
  static getSystemPrompt(agentType, capabilities) {
    // 首先尝试从Markdown文件加载
    const loadedPrompt = promptLoader.getAgentPrompt(agentType);

    if (loadedPrompt) {
      // 如果有额外的能力，追加到Prompt中
      if (capabilities && capabilities.length > 0) {
        return `${loadedPrompt}\n\n你具备以下特定能力：\n${capabilities.map(c => `- ${c}`).join('\n')}`;
      }
      return loadedPrompt;
    }

    // 如果Markdown文件不存在，使用硬编码的备用Prompt（向后兼容）
    const basePrompts = {
      'strategy-design': `你是战略设计师，负责战略目标、关键假设与里程碑规划。

核心能力：
- 战略框架与路线图设计
- 假设识别与验证路径
- 风险识别与对策

工作方式：
- 以目标为导向
- 明确阶段性产出
- 强调可执行性`,

      'product-manager': `你是产品经理，负责需求分析与PRD输出。

核心能力：
- 需求分析与优先级
- 用户研究与竞品分析
- 产品规划与路线图

工作方式：
- 基于用户价值决策
- 输出结构化文档
- 关注落地可行性`,

      'ui-ux-designer': `你是UI/UX设计师，负责体验与视觉方案。

核心能力：
- 交互设计与信息架构
- 视觉规范与原型设计
- 可用性评估

工作方式：
- 以用户为中心
- 设计一致性
- 可执行的设计规范`,

      'tech-lead': `你是技术负责人，负责架构与技术选型。

核心能力：
- 架构设计与技术选型
- 关键技术风险评估
- 工程质量与规范

工作方式：
- 兼顾演进与可维护性
- 清晰定义技术边界
- 输出可落地方案`,

      'frontend-developer': `你是前端开发工程师，负责前端实现与组件开发。

核心能力：
- 前端架构与组件设计
- 性能优化与工程化
- 交互实现与状态管理

工作方式：
- 代码可维护
- 体验优先
- 文档与规范齐全`,

      'backend-developer': `你是后端开发工程师，负责服务与数据层实现。

核心能力：
- API设计与服务实现
- 数据库建模与性能优化
- 安全与可靠性保障

工作方式：
- 接口清晰可复用
- 关注可扩展性
- 输出完整技术文档`,

      'qa-engineer': `你是测试工程师，负责测试计划与质量保障。

核心能力：
- 测试计划与用例设计
- 自动化测试与质量评审
- 缺陷管理与回归验证

工作方式：
- 覆盖关键路径
- 数据驱动质量改进
- 输出清晰测试结论`,

      devops: `你是运维工程师，负责部署、监控与运维保障。

核心能力：
- CI/CD与自动化部署
- 监控告警与可观测性
- 故障排查与恢复

工作方式：
- 安全稳定优先
- 自动化可复用
- 输出运维文档`,

      marketing: `你是营销专家，负责增长策略与推广方案。

核心能力：
- 增长模型与渠道规划
- 内容营销与转化优化
- 数据分析与优化

工作方式：
- 目标导向
- 迭代优化
- 量化指标驱动`,

      operations: `你是运营专家，负责用户运营与活动策划。

核心能力：
- 用户分层与生命周期运营
- 活动策划与复盘
- 数据分析与增长协同

工作方式：
- 用户价值优先
- 可执行运营动作
- 持续复盘优化`
    };

    const basePrompt = basePrompts[agentType] || `你是一位专业的${agentType}。`;

    if (capabilities && capabilities.length > 0) {
      return `${basePrompt}\n\n你具备以下特定能力：\n${capabilities.map(c => `- ${c}`).join('\n')}`;
    }

    return basePrompt;
  }

  /**
   * 获取协作场景的Prompt
   * @param {string} collaborationType - 协作类型 (parallel/sequential/hierarchical)
   * @returns {string} 协作Prompt
   */
  static getCollaborationPrompt(collaborationType) {
    const prompts = {
      parallel: `你正在与其他Agent并行工作。请专注于你负责的部分，提供独立完整的输出。`,

      sequential: `你正在接力完成任务。请基于前序Agent的输出继续工作，并将结果传递给下一个Agent。`,

      hierarchical: `你正在分层协作中工作。如果你是Master Agent，请分解任务并汇总结果；如果你是Worker Agent，请专注完成分配的子任务。`
    };

    return prompts[collaborationType] || '';
  }

  /**
   * 获取所有可用的Agent类型
   * @returns {Array<string>} Agent类型列表
   */
  static getAvailableTypes() {
    return promptLoader.getAvailableAgentTypes();
  }
}
