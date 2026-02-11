/**
 * 工作流阶段定义
 * 协同开发模式的默认阶段参考（可被协同模式推荐流程覆盖）
 */

/**
 * 标准工作流阶段配置
 */
export const DEFAULT_WORKFLOW_STAGES = [
  {
    id: 'requirement',
    name: '需求分析',
    description: '产品定位、用户分析、功能规划',
    recommendedAgents: ['product-manager'],
    artifactTypes: [
      'research-analysis-doc',
      'prd',
      'user-story',
      'feature-list',
      'core-prompt-design'
    ],
    estimatedDuration: 2, // 天数（仅供参考）
    icon: '📋',
    color: '#667eea'
  },
  {
    id: 'strategy',
    name: '战略设计',
    description: '基于PRD的战略设计、挑战回应',
    recommendedAgents: ['strategy-design'],
    artifactTypes: ['strategy-doc'],
    estimatedDuration: 2,
    icon: '🎯',
    color: '#6366f1'
  },
  {
    id: 'design',
    name: '产品设计',
    description: 'UI/UX设计、交互原型、视觉规范',
    recommendedAgents: ['ui-ux-designer'],
    artifactTypes: ['ui-design', 'prototype', 'design-spec'],
    estimatedDuration: 3,
    icon: '🎨',
    color: '#764ba2'
  },
  {
    id: 'architecture',
    name: '架构设计',
    description: '系统架构、技术选型、API规范',
    recommendedAgents: ['tech-lead'],
    artifactTypes: ['architecture-doc', 'api-spec', 'tech-stack'],
    estimatedDuration: 2,
    icon: '🏗️',
    color: '#f093fb'
  },
  {
    id: 'development',
    name: '开发实现',
    description: '前后端开发、功能实现、代码编写',
    recommendedAgents: ['frontend-developer', 'backend-developer'],
    artifactTypes: [
      'frontend-code',
      'backend-code',
      'api-doc',
      'component-lib',
      'frontend-doc',
      'backend-doc'
    ],
    estimatedDuration: 7,
    icon: '💻',
    color: '#4facfe'
  },
  {
    id: 'testing',
    name: '测试验证',
    description: '功能测试、性能测试、bug修复',
    recommendedAgents: ['qa-engineer'],
    artifactTypes: ['test-report', 'bug-list', 'performance-report'],
    estimatedDuration: 3,
    icon: '🧪',
    color: '#43e97b'
  },
  {
    id: 'deployment',
    name: '部署上线',
    description: '环境配置、服务器部署、上线发布',
    recommendedAgents: ['devops'],
    artifactTypes: ['deploy-doc', 'env-config', 'release-notes'],
    estimatedDuration: 1,
    icon: '🚀',
    color: '#fa709a'
  },
  {
    id: 'operation',
    name: '运营推广',
    description: '市场推广、用户运营、数据分析',
    recommendedAgents: ['marketing', 'operations'],
    artifactTypes: ['marketing-plan', 'growth-strategy', 'analytics-report'],
    estimatedDuration: 5,
    icon: '📈',
    color: '#fee140'
  }
];

const DEFAULT_WORKFLOW_STAGE_ORDER = [
  'strategy-requirement',
  'design',
  'architecture',
  'development',
  'testing',
  'deployment',
  'operation'
];

const STAGE_ID_ALIASES = {
  'strategy_requirement': 'strategy-requirement',
  'strategy+requirement': 'strategy-requirement',
  'strategy-validation': 'strategy',
  'strategy-review': 'strategy',
  'strategy-plan': 'strategy',
  'product-definition': 'requirement',
  'product-requirement': 'requirement',
  requirements: 'requirement',
  'ux-design': 'design',
  'ui-design': 'design',
  'product-design': 'design',
  'architecture-design': 'architecture',
  'tech-architecture': 'architecture',
  'system-architecture': 'architecture',
  implementation: 'development',
  dev: 'development',
  qa: 'testing',
  test: 'testing',
  launch: 'deployment',
  release: 'deployment',
  operation: 'operation',
  ops: 'operation'
};

export function normalizeStageId(stageId) {
  if (!stageId) {
    return stageId;
  }
  const normalized = String(stageId).trim();
  return STAGE_ID_ALIASES[normalized] || normalized;
}

const COMPOSITE_STAGE_DEFS = {
  'strategy-requirement': {
    name: '战略与需求',
    description: '战略建模与需求分析',
    parts: ['strategy', 'requirement'],
    icon: '🎯',
    color: '#6366f1'
  }
};

function buildCompositeStage(stageId) {
  const config = COMPOSITE_STAGE_DEFS[stageId];
  if (!config) {
    return null;
  }
  const parts = (config.parts || [])
    .map(id => DEFAULT_WORKFLOW_STAGES.find(stage => stage.id === id))
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  const recommendedAgents = Array.from(
    new Set(parts.flatMap(stage => stage.recommendedAgents || []).filter(Boolean))
  );
  const artifactTypes = Array.from(
    new Set(parts.flatMap(stage => stage.artifactTypes || []).filter(Boolean))
  );
  const estimatedDuration = parts.reduce(
    (sum, stage) => sum + (Number(stage.estimatedDuration) || 0),
    0
  );
  return {
    id: stageId,
    name: config.name || stageId,
    description:
      config.description ||
      parts
        .map(stage => stage.description)
        .filter(Boolean)
        .join(' / '),
    recommendedAgents,
    artifactTypes,
    estimatedDuration,
    icon: config.icon || parts[0]?.icon,
    color: config.color || parts[0]?.color
  };
}

/**
 * 交付物类型定义
 */
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
export const AGENT_PROMPT_MAP = {
  'strategy-design': {
    name: '战略设计师',
    persona: [
      'prompts/agents/strategy/strategy-designer/templates/strategy-designer.strategy-doc.md'
    ],
    deliverables: ['strategy-doc'],
    stageHint: { id: 'strategy', name: '战略设计', description: '战略设计与关键假设' }
  },
  'product-manager': {
    name: '产品经理',
    persona: [],
    deliverables: [
      'research-analysis-doc',
      'prd',
      'user-story',
      'feature-list',
      'core-prompt-design'
    ],
    stageHint: { id: 'requirement', name: '需求分析', description: '需求分析与产品规划' }
  },
  'ui-ux-designer': {
    name: 'UI/UX设计师',
    persona: [],
    deliverables: ['ui-design', 'prototype', 'design-spec'],
    stageHint: { id: 'design', name: '产品设计', description: 'UI/UX设计与交互规范' }
  },
  'tech-lead': {
    name: '技术负责人',
    persona: [],
    deliverables: ['architecture-doc', 'api-spec', 'tech-stack'],
    stageHint: { id: 'architecture', name: '架构设计', description: '系统架构与技术选型' }
  },
  'frontend-developer': {
    name: '前端开发',
    persona: [],
    deliverables: ['frontend-code', 'component-lib', 'frontend-doc'],
    stageHint: { id: 'development', name: '开发实现', description: '前后端开发实现' }
  },
  'backend-developer': {
    name: '后端开发',
    persona: [],
    deliverables: ['backend-code', 'api-doc', 'backend-doc'],
    stageHint: { id: 'development', name: '开发实现', description: '前后端开发实现' }
  },
  'qa-engineer': {
    name: '测试工程师',
    persona: [],
    deliverables: ['test-report', 'bug-list', 'performance-report'],
    stageHint: { id: 'testing', name: '测试验证', description: '功能与性能测试' }
  },
  devops: {
    name: '运维工程师',
    persona: [],
    deliverables: ['deploy-doc', 'env-config', 'release-notes'],
    stageHint: { id: 'deployment', name: '部署上线', description: '部署与发布' }
  },
  marketing: {
    name: '市场营销',
    persona: [],
    deliverables: ['marketing-plan', 'growth-strategy'],
    stageHint: { id: 'operation', name: '运营推广', description: '市场推广与增长策略' }
  },
  operations: {
    name: '运营专员',
    persona: [],
    deliverables: ['analytics-report'],
    stageHint: { id: 'operation', name: '运营推广', description: '用户运营与数据分析' }
  }
};

/**
 * 根据阶段ID获取阶段配置
 * @param {String} stageId - 阶段ID
 * @returns {Object|null} 阶段配置
 */
export function getStageById(stageId) {
  const normalized = normalizeStageId(stageId);
  if (COMPOSITE_STAGE_DEFS[normalized]) {
    return buildCompositeStage(normalized);
  }
  return DEFAULT_WORKFLOW_STAGES.find(stage => stage.id === normalized) || null;
}

/**
 * 获取阶段的推荐Agent
 * @param {String} stageId - 阶段ID
 * @returns {Array<String>} Agent类型数组
 */
export function getRecommendedAgents(stageId) {
  const stage = getStageById(stageId);
  return stage ? stage.recommendedAgents : [];
}

/**
 * 获取阶段的交付物类型
 * @param {String} stageId - 阶段ID
 * @returns {Array<String>} 交付物类型数组
 */
export function getArtifactTypes(stageId) {
  const stage = getStageById(stageId);
  return stage ? stage.artifactTypes : [];
}

export function getAgentPromptProfile(agentId) {
  if (!agentId) return null;
  const entry = AGENT_PROMPT_MAP[agentId];
  if (!entry) return null;
  const deliverables = (entry.deliverables || []).map(type => ({
    type,
    name: ARTIFACT_TYPES[type]?.name || type,
    promptTemplates: ARTIFACT_TYPES[type]?.promptTemplates || []
  }));
  return {
    id: agentId,
    name: entry.name || agentId,
    persona: entry.persona || [],
    deliverables
  };
}

export function getAgentPromptProfiles(agentIds = []) {
  return (agentIds || []).map(agentId => getAgentPromptProfile(agentId)).filter(Boolean);
}

/**
 * 初始化默认工作流
 * @returns {Array<Object>} 工作流阶段数组
 */
export function getDefaultWorkflowStagesForInit() {
  return DEFAULT_WORKFLOW_STAGE_ORDER
    .map(stageId => {
      if (stageId === 'strategy-requirement') {
        return buildCompositeStage('strategy-requirement');
      }
      return DEFAULT_WORKFLOW_STAGES.find(stage => stage.id === stageId) || null;
    })
    .filter(Boolean);
}

export function initializeDefaultWorkflow() {
  return getDefaultWorkflowStagesForInit().map(stage => ({
    id: stage.id,
    name: stage.name,
    status: 'pending', // pending | active | completed
    agents: [...stage.recommendedAgents],
    artifacts: [],
    startedAt: null,
    completedAt: null
  }));
}

/**
 * 验证自定义工作流
 * @param {Array<Object>} customStages - 自定义阶段数组
 * @returns {Boolean} 是否有效
 */
export function validateCustomWorkflow(customStages) {
  if (!Array.isArray(customStages) || customStages.length === 0) {
    return false;
  }

  for (const stage of customStages) {
    if (!stage.id || !stage.name) {
      return false;
    }
    if (!stage.agents || !Array.isArray(stage.agents)) {
      return false;
    }
  }

  return true;
}

export default {
  DEFAULT_WORKFLOW_STAGES,
  ARTIFACT_TYPES,
  getStageById,
  getRecommendedAgents,
  getArtifactTypes,
  getDefaultWorkflowStagesForInit,
  initializeDefaultWorkflow,
  validateCustomWorkflow
};
