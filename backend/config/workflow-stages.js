/**
 * 工作流阶段定义
 * 协同开发模式的标准7阶段流程
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
    artifactTypes: ['prd', 'user-story', 'feature-list'],
    estimatedDuration: 2, // 天数（仅供参考）
    icon: '📋',
    color: '#667eea'
  },
  {
    id: 'design',
    name: '产品设计',
    description: 'UI/UX设计、交互原型、视觉规范',
    recommendedAgents: ['designer'],
    artifactTypes: ['ui-design', 'prototype', 'design-spec'],
    estimatedDuration: 3,
    icon: '🎨',
    color: '#764ba2'
  },
  {
    id: 'architecture',
    name: '架构设计',
    description: '系统架构、技术选型、API规范',
    recommendedAgents: ['backend-dev', 'frontend-dev'],
    artifactTypes: ['architecture-doc', 'api-spec', 'tech-stack'],
    estimatedDuration: 2,
    icon: '🏗️',
    color: '#f093fb'
  },
  {
    id: 'development',
    name: '开发实现',
    description: '前后端开发、功能实现、代码编写',
    recommendedAgents: ['frontend-dev', 'backend-dev'],
    artifactTypes: ['code', 'api-doc', 'component-lib'],
    estimatedDuration: 7,
    icon: '💻',
    color: '#4facfe'
  },
  {
    id: 'testing',
    name: '测试验证',
    description: '功能测试、性能测试、bug修复',
    recommendedAgents: ['data-analyst'],
    artifactTypes: ['test-report', 'bug-list', 'performance-report'],
    estimatedDuration: 3,
    icon: '🧪',
    color: '#43e97b'
  },
  {
    id: 'deployment',
    name: '部署上线',
    description: '环境配置、服务器部署、上线发布',
    recommendedAgents: ['backend-dev'],
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

/**
 * 交付物类型定义
 */
export const ARTIFACT_TYPES = {
  // 需求分析阶段
  prd: {
    name: '产品需求文档',
    description: '完整的产品需求文档，包含功能、流程、原型等',
    extension: 'md'
  },
  'user-story': {
    name: '用户故事',
    description: '以用户视角描述的功能需求',
    extension: 'md'
  },
  'feature-list': {
    name: '功能清单',
    description: '产品功能列表和优先级',
    extension: 'md'
  },

  // 产品设计阶段
  'ui-design': {
    name: 'UI设计稿',
    description: '界面设计稿和视觉规范',
    extension: 'md'
  },
  prototype: {
    name: '交互原型',
    description: '可交互的产品原型',
    extension: 'md'
  },
  'design-spec': {
    name: '设计规范',
    description: 'UI组件库和设计规范文档',
    extension: 'md'
  },

  // 架构设计阶段
  'architecture-doc': {
    name: '架构设计文档',
    description: '系统架构、模块划分、技术选型',
    extension: 'md'
  },
  'api-spec': {
    name: 'API接口规范',
    description: 'RESTful API接口文档',
    extension: 'md'
  },
  'tech-stack': {
    name: '技术栈选型',
    description: '前后端技术栈和工具链',
    extension: 'md'
  },

  // 开发实现阶段
  code: {
    name: '源代码',
    description: '完整的源代码实现',
    extension: 'zip'
  },
  'api-doc': {
    name: 'API文档',
    description: '接口使用文档',
    extension: 'md'
  },
  'component-lib': {
    name: '组件库',
    description: '前端组件库文档',
    extension: 'md'
  },

  // 测试验证阶段
  'test-report': {
    name: '测试报告',
    description: '功能测试和性能测试报告',
    extension: 'md'
  },
  'bug-list': {
    name: 'Bug清单',
    description: '已知问题和修复记录',
    extension: 'md'
  },
  'performance-report': {
    name: '性能测试报告',
    description: '系统性能指标和优化建议',
    extension: 'md'
  },

  // 部署上线阶段
  'deploy-doc': {
    name: '部署文档',
    description: '部署步骤和环境配置',
    extension: 'md'
  },
  'env-config': {
    name: '环境配置',
    description: '生产环境配置文件',
    extension: 'md'
  },
  'release-notes': {
    name: '发布说明',
    description: '版本更新说明',
    extension: 'md'
  },

  // 运营推广阶段
  'marketing-plan': {
    name: '营销推广方案',
    description: '市场推广策略和执行计划',
    extension: 'md'
  },
  'growth-strategy': {
    name: '增长策略',
    description: '用户增长和留存策略',
    extension: 'md'
  },
  'analytics-report': {
    name: '数据分析报告',
    description: '用户行为和产品数据分析',
    extension: 'md'
  }
};

/**
 * 根据阶段ID获取阶段配置
 * @param {String} stageId - 阶段ID
 * @returns {Object|null} 阶段配置
 */
export function getStageById(stageId) {
  return DEFAULT_WORKFLOW_STAGES.find(stage => stage.id === stageId) || null;
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

/**
 * 初始化默认工作流
 * @returns {Array<Object>} 工作流阶段数组
 */
export function initializeDefaultWorkflow() {
  return DEFAULT_WORKFLOW_STAGES.map(stage => ({
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
  initializeDefaultWorkflow,
  validateCustomWorkflow
};
