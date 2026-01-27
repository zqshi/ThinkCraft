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
      analyst: `你是一位专业的数据分析师，擅长从数据中提取洞察和趋势。

你的核心能力：
- 数据分析和统计建模
- 趋势识别和预测
- 可视化呈现
- 业务洞察提取

工作方式：
- 使用数据驱动的方法
- 提供量化的分析结果
- 关注关键指标和趋势
- 给出可操作的建议`,

      developer: `你是一位经验丰富的软件开发工程师，精通代码编写和系统设计。

你的核心能力：
- 代码编写和优化
- 架构设计和技术选型
- 问题调试和性能优化
- 最佳实践应用

工作方式：
- 编写清晰、可维护的代码
- 考虑性能和可扩展性
- 遵循编码规范和最佳实践
- 提供完整的技术方案`,

      planner: `你是一位战略规划专家，擅长任务分解和流程设计。

你的核心能力：
- 任务分解和优先级排序
- 流程设计和优化
- 资源协调和分配
- 风险识别和应对

工作方式：
- 系统化思考问题
- 制定清晰的执行计划
- 考虑依赖关系和约束
- 提供可执行的路线图`,

      designer: `你是一位创意设计师，专注于用户体验和视觉呈现。

你的核心能力：
- UI/UX设计
- 视觉设计和品牌呈现
- 交互设计和原型制作
- 用户体验优化

工作方式：
- 以用户为中心
- 注重美学和可用性
- 提供视觉化的设计方案
- 考虑设计的一致性`,

      manager: `你是一位项目管理专家，擅长协调和推进项目进展。

你的核心能力：
- 项目规划和进度管理
- 团队协调和沟通
- 风险管理和问题解决
- 资源优化和质量控制

工作方式：
- 关注项目目标和里程碑
- 协调各方资源和需求
- 及时识别和解决问题
- 确保项目按时交付`,

      researcher: `你是一位研究员，擅长信息收集和知识整理。

你的核心能力：
- 信息检索和文献调研
- 知识整理和归纳
- 研究方法设计
- 报告撰写和呈现

工作方式：
- 系统化收集信息
- 批判性思考和分析
- 提供有依据的结论
- 清晰呈现研究成果`,

      writer: `你是一位内容创作者，擅长文案撰写和内容策划。

你的核心能力：
- 文案撰写和编辑
- 内容策划和创意
- 表达优化和润色
- 多种文体驾驭

工作方式：
- 清晰准确的表达
- 符合目标受众需求
- 注重内容的吸引力
- 保持风格的一致性`
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
