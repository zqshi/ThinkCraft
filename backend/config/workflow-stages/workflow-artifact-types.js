export const ARTIFACT_TYPES = {
  // 需求分析阶段
  prd: {
    name: '产品需求文档',
    description: '完整的产品需求文档，包含功能、流程、原型等',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/product/product-manager/templates/product-manager-agent.requirement-design-doc.md'
    ]
  },
  'research-analysis-doc': {
    name: '产品研究分析报告',
    description: '市场分析与竞品调研报告（含数据来源）',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/product/product-manager/templates/product-manager-agent.research-analysis-doc.md'
    ]
  },
  'user-story': {
    name: '用户故事',
    description: '以用户视角描述的功能需求',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/product/product-manager/templates/product-manager-agent.user-story.md'
    ]
  },
  'feature-list': {
    name: '功能清单',
    description: '产品功能列表和优先级',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/product/product-manager/templates/product-manager-agent.feature-list.md'
    ]
  },

  // 战略设计阶段
  'strategy-doc': {
    name: '战略设计文档',
    description: '战略设计与关键假设文档',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/strategy/strategy-designer/templates/strategy-designer.strategy-doc.md'
    ]
  },
  'core-prompt-design': {
    name: '核心引导逻辑Prompt设计',
    description: '核心引导逻辑与Prompt设计说明',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/product/product-manager/templates/product-manager-agent.core-prompt-design.md'
    ]
  },

  // 产品设计阶段
  'ui-design': {
    name: 'UI设计方案',
    description: '界面设计方案与视觉/体验规范',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/ui-ux/ui-ux-designer/templates/ui-ux-designer-agent.design-doc-traditional.md'
    ]
  },
  prototype: {
    name: '交互原型',
    description: '可交互的产品原型',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/ui-ux/prototype/templates/prototype-agent.design-doc-traditional.md'
    ]
  },
  'design-spec': {
    name: '设计规范',
    description: 'UI组件库和设计规范文档',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/ui-ux/design-spec/templates/design-spec-agent.design-doc-traditional.md'
    ]
  },

  // 架构设计阶段
  'architecture-doc': {
    name: '架构设计文档',
    description: '系统架构、模块划分、技术选型',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/engineering/tech-lead/templates/tech-lead-agent.architecture-doc.md'
    ]
  },
  'api-spec': {
    name: 'API接口规范',
    description: 'RESTful API接口文档',
    extension: 'md',
    promptTemplates: ['prompts/agents/engineering/tech-lead/templates/tech-lead-agent.api-spec.md']
  },
  'tech-stack': {
    name: '技术栈选型',
    description: '前后端技术栈和工具链',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/engineering/tech-lead/templates/tech-lead-agent.tech-stack.md'
    ]
  },

  // 开发实现阶段
  'frontend-code': {
    name: '前端源代码',
    description: '前端源代码实现',
    extension: 'zip',
    promptTemplates: [
      'prompts/agents/engineering/frontend-developer/templates/frontend-developer-agent.code.md'
    ]
  },
  'backend-code': {
    name: '后端源代码',
    description: '后端源代码实现',
    extension: 'zip',
    promptTemplates: [
      'prompts/agents/engineering/backend-developer/templates/backend-developer-agent.code.md'
    ]
  },
  'api-doc': {
    name: 'API文档',
    description: '接口使用文档',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/engineering/backend-developer/templates/backend-developer-agent.api-doc.md'
    ]
  },
  'component-lib': {
    name: '组件库',
    description: '前端组件库文档',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/engineering/frontend-developer/templates/frontend-developer-agent.frontend-doc.md'
    ]
  },
  'frontend-doc': {
    name: '前端开发文档',
    description: '前端实现说明与交付文档',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/engineering/frontend-developer/templates/frontend-developer-agent.frontend-doc.md'
    ]
  },
  'backend-doc': {
    name: '后端开发文档',
    description: '后端实现说明与交付文档',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/engineering/backend-developer/templates/backend-developer-agent.code.md'
    ]
  },

  // 测试验证阶段
  'test-report': {
    name: '测试报告',
    description: '功能测试和性能测试报告',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/engineering/backend-developer/templates/backend-developer-agent.test-plan.md',
      'prompts/agents/quality/qa-engineer/templates/qa-engineer-agent.test-plan.md'
    ]
  },
  'bug-list': {
    name: 'Bug清单',
    description: '已知问题和修复记录',
    extension: 'md',
    promptTemplates: ['prompts/agents/quality/qa-engineer/templates/qa-engineer-agent.bug-list.md']
  },
  'performance-report': {
    name: '性能测试报告',
    description: '系统性能指标和优化建议',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/quality/qa-engineer/templates/qa-engineer-agent.performance-report.md'
    ]
  },

  // 部署上线阶段
  'deploy-doc': {
    name: '部署文档',
    description: '部署步骤和环境配置',
    extension: 'md',
    promptTemplates: ['prompts/agents/ops/devops/templates/devops.deploy-plan.md']
  },
  'env-config': {
    name: '环境配置',
    description: '生产环境配置文件',
    extension: 'md',
    promptTemplates: ['prompts/agents/ops/devops/templates/devops.env-config.md']
  },
  'release-notes': {
    name: '发布说明',
    description: '版本更新说明',
    extension: 'md',
    promptTemplates: ['prompts/agents/ops/devops/templates/devops.release-notes.md']
  },

  // 运营推广阶段
  'marketing-plan': {
    name: '营销推广方案',
    description: '市场推广策略和执行计划',
    extension: 'md',
    promptTemplates: ['prompts/agents/ops/marketing/templates/marketing-agent.marketing-plan.md']
  },
  'growth-strategy': {
    name: '增长策略',
    description: '用户增长和留存策略',
    extension: 'md',
    promptTemplates: ['prompts/agents/ops/marketing/templates/marketing-agent.growth-strategy.md']
  },
  'analytics-report': {
    name: '数据分析报告',
    description: '用户行为和产品数据分析',
    extension: 'md',
    promptTemplates: [
      'prompts/agents/ops/operations/templates/operations-agent.analytics-report.md'
    ]
  }
};

/**
 * Agent 人设/模板映射
 * - persona: 人设提示词文件
 * - deliverables: 交付物类型ID列表（可映射到ARTIFACT_TYPES）
 * - stageHint: 该角色常用阶段建议（用于协同模式动态生成的fallback）
 */
