export const COLLAB_PLAN_STRATEGY_VERSION = 'deterministic-v7';

export const COLLAB_RECOMMENDATION_RULES = {
  // 不截断推荐成员，完整返回匹配结果
  maxRecommendedAgents: null,
  excludedAgents: ['marketing', 'operations'],
  coreAgents: ['product-manager', 'strategy-design'],
  keywordAgentRules: [
    {
      pattern: /(界面|交互|体验|设计|ui|ux|app|小程序)/i,
      agents: ['ui-ux-designer']
    },
    {
      pattern: /(架构|技术选型|系统设计|可扩展|性能)/i,
      agents: ['tech-lead']
    },
    {
      pattern: /(开发|实现|代码|前端|frontend|后端|backend|api|saas|平台)/i,
      agents: ['frontend-developer', 'backend-developer']
    },
    {
      pattern: /(测试|验证|质量|稳定|回归|qa)/i,
      agents: ['qa-engineer']
    },
    {
      pattern: /(上线|部署|运维|发布|监控|devops)/i,
      agents: ['devops']
    },
    {
      pattern: /(增长|营销|获客|运营|留存|转化)/i,
      agents: ['marketing', 'operations']
    }
  ],
  modeRules: {
    parallelWhenHasDualDev: ['frontend-developer', 'backend-developer'],
    parallelWhenStageCountAtLeast: 5
  }
};
