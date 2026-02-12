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

